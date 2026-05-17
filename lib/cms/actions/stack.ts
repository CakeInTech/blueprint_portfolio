"use server";

import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import { auditEvents, stackGroups, stackItems } from "@/lib/db/schema";

export type StackItemRecord = {
  id: string;
  label: string;
  sortOrder: number;
};

export type StackGroupRecord = {
  id: string;
  name: string;
  sortOrder: number;
  items: StackItemRecord[];
};

const groupIdSchema = z.string().uuid();
const itemIdSchema = z.string().uuid();

const stackGroupPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const stackItemPayloadSchema = z.object({
  label: z.string().trim().min(1).max(120),
});

async function writeAuditEvent(input: {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(auditEvents).values({
    actorEmail: input.actorEmail,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
  });
}

export async function getStackEditorData(): Promise<StackGroupRecord[]> {
  const db = getDb();

  const groupRows = await db
    .select()
    .from(stackGroups)
    .orderBy(asc(stackGroups.sortOrder));

  const allItems = await db
    .select()
    .from(stackItems)
    .orderBy(asc(stackItems.sortOrder));

  return groupRows.map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    items: allItems
      .filter((item) => item.groupId === row.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        sortOrder: item.sortOrder,
      })),
  }));
}

export async function createStackGroup() {
  const { email } = await requireAdmin();
  const db = getDb();
  const now = new Date();

  const [{ count: groupCount }] = await db
    .select({ count: count() })
    .from(stackGroups);

  const [created] = await db
    .insert(stackGroups)
    .values({
      name: "New group",
      sortOrder: Number(groupCount ?? 0),
      version: 0,
      updatedAt: now,
    })
    .returning({ id: stackGroups.id });

  await writeAuditEvent({
    actorEmail: email,
    action: "stack_group.create",
    entityType: "stack_group",
    entityId: created.id,
  });

  return created.id;
}

export async function updateStackGroup(
  groupId: string,
  payload: z.infer<typeof stackGroupPayloadSchema>,
) {
  const { email } = await requireAdmin();
  const parsedId = groupIdSchema.parse(groupId);
  const parsedPayload = stackGroupPayloadSchema.parse(payload);
  const db = getDb();

  await db
    .update(stackGroups)
    .set({
      name: parsedPayload.name,
      version: sql`${stackGroups.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(stackGroups.id, parsedId));

  await writeAuditEvent({
    actorEmail: email,
    action: "stack_group.update",
    entityType: "stack_group",
    entityId: parsedId,
    metadata: parsedPayload,
  });
}

export async function deleteStackGroup(groupId: string) {
  const { email } = await requireAdmin();
  const parsedId = groupIdSchema.parse(groupId);
  const db = getDb();
  const now = new Date();

  await db.delete(stackGroups).where(eq(stackGroups.id, parsedId));

  const rows = await db
    .select({ id: stackGroups.id })
    .from(stackGroups)
    .orderBy(asc(stackGroups.sortOrder));

  await db.transaction(async (tx) => {
    await Promise.all(
      rows.map((row, index) =>
        tx
          .update(stackGroups)
          .set({
            sortOrder: index,
            version: sql`${stackGroups.version} + 1`,
            updatedAt: now,
          })
          .where(eq(stackGroups.id, row.id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "stack_group.delete",
    entityType: "stack_group",
    entityId: parsedId,
  });
}

export async function reorderStackGroups(orderedGroupIds: string[]) {
  const { email } = await requireAdmin();
  const parsedIds = z.array(groupIdSchema).min(1).parse(orderedGroupIds);
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedIds.map((id, index) =>
        tx
          .update(stackGroups)
          .set({
            sortOrder: index,
            version: sql`${stackGroups.version} + 1`,
            updatedAt: now,
          })
          .where(eq(stackGroups.id, id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "stack_group.reorder",
    entityType: "stack_group",
    entityId: parsedIds[0],
    metadata: { orderedIds: parsedIds },
  });
}

export async function addStackItem(groupId: string) {
  const { email } = await requireAdmin();
  const parsedId = groupIdSchema.parse(groupId);
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({ id: stackItems.id })
    .from(stackItems)
    .where(eq(stackItems.groupId, parsedId))
    .orderBy(asc(stackItems.sortOrder));

  const [created] = await db
    .insert(stackItems)
    .values({
      groupId: parsedId,
      label: "New item",
      sortOrder: rows.length,
      version: 0,
      updatedAt: now,
    })
    .returning({ id: stackItems.id });

  await writeAuditEvent({
    actorEmail: email,
    action: "stack_item.create",
    entityType: "stack_item",
    entityId: created.id,
    metadata: { groupId: parsedId },
  });
}

export async function updateStackItem(
  groupId: string,
  itemId: string,
  payload: z.infer<typeof stackItemPayloadSchema>,
) {
  const { email } = await requireAdmin();
  const parsedGroupId = groupIdSchema.parse(groupId);
  const parsedItemId = itemIdSchema.parse(itemId);
  const parsedPayload = stackItemPayloadSchema.parse(payload);
  const db = getDb();

  await db
    .update(stackItems)
    .set({
      label: parsedPayload.label,
      version: sql`${stackItems.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(stackItems.id, parsedItemId),
        eq(stackItems.groupId, parsedGroupId),
      ),
    );

  await writeAuditEvent({
    actorEmail: email,
    action: "stack_item.update",
    entityType: "stack_item",
    entityId: parsedItemId,
    metadata: { groupId: parsedGroupId },
  });
}

export async function deleteStackItem(groupId: string, itemId: string) {
  const { email } = await requireAdmin();
  const parsedGroupId = groupIdSchema.parse(groupId);
  const parsedItemId = itemIdSchema.parse(itemId);
  const db = getDb();
  const now = new Date();

  await db
    .delete(stackItems)
    .where(
      and(
        eq(stackItems.id, parsedItemId),
        eq(stackItems.groupId, parsedGroupId),
      ),
    );

  const remaining = await db
    .select({ id: stackItems.id })
    .from(stackItems)
    .where(eq(stackItems.groupId, parsedGroupId))
    .orderBy(asc(stackItems.sortOrder));

  await db.transaction(async (tx) => {
    await Promise.all(
      remaining.map((row, index) =>
        tx
          .update(stackItems)
          .set({
            sortOrder: index,
            version: sql`${stackItems.version} + 1`,
            updatedAt: now,
          })
          .where(eq(stackItems.id, row.id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "stack_item.delete",
    entityType: "stack_item",
    entityId: parsedItemId,
    metadata: { groupId: parsedGroupId },
  });
}

export async function reorderStackItems(
  groupId: string,
  orderedItemIds: string[],
) {
  const { email } = await requireAdmin();
  const parsedGroupId = groupIdSchema.parse(groupId);
  const parsedItemIds = z.array(itemIdSchema).parse(orderedItemIds);
  const db = getDb();
  const now = new Date();

  if (parsedItemIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: stackItems.id })
    .from(stackItems)
    .where(
      and(
        eq(stackItems.groupId, parsedGroupId),
        inArray(stackItems.id, parsedItemIds),
      ),
    );

  if (rows.length !== parsedItemIds.length) {
    throw new Error("Some stack items do not belong to this group.");
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedItemIds.map((id, index) =>
        tx
          .update(stackItems)
          .set({
            sortOrder: index,
            version: sql`${stackItems.version} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(stackItems.id, id),
              eq(stackItems.groupId, parsedGroupId),
            ),
          ),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "stack_item.reorder",
    entityType: "stack_item",
    entityId: parsedGroupId,
    metadata: {
      orderedIds: parsedItemIds,
    },
  });
}

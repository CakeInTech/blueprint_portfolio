"use server";

import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import {
  auditEvents,
  experienceBullets,
  experiences,
} from "@/lib/db/schema";

export type ExperienceBulletRecord = {
  id: string;
  body: string;
  sortOrder: number;
};

export type ExperienceRecord = {
  id: string;
  company: string;
  location: string;
  role: string;
  start: string;
  end: string;
  current: boolean;
  sortOrder: number;
  bullets: ExperienceBulletRecord[];
};

const experienceIdSchema = z.string().uuid();
const bulletIdSchema = z.string().uuid();

const experiencePayloadSchema = z.object({
  company: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  start: z.string().trim().min(1).max(40),
  end: z.string().trim().min(1).max(40),
  current: z.boolean(),
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

export async function getExperienceEditorData(): Promise<ExperienceRecord[]> {
  const db = getDb();

  const experienceRows = await db
    .select()
    .from(experiences)
    .orderBy(asc(experiences.sortOrder));

  const bulletRows = await db
    .select()
    .from(experienceBullets)
    .orderBy(asc(experienceBullets.sortOrder));

  return experienceRows.map((row) => ({
    id: row.id,
    company: row.company,
    location: row.location,
    role: row.role,
    start: row.start,
    end: row.end,
    current: row.current,
    sortOrder: row.sortOrder,
    bullets: bulletRows
      .filter((bullet) => bullet.experienceId === row.id)
      .map((bullet) => ({
        id: bullet.id,
        body: bullet.body,
        sortOrder: bullet.sortOrder,
      })),
  }));
}

export async function createExperience() {
  const { email } = await requireAdmin();
  const db = getDb();
  const now = new Date();

  const [{ count: experienceCount }] = await db
    .select({ count: count() })
    .from(experiences);

  const [created] = await db
    .insert(experiences)
    .values({
      company: "New company",
      location: "Remote",
      role: "Role title",
      start: "Start",
      end: "End",
      current: false,
      sortOrder: Number(experienceCount ?? 0),
      version: 0,
      updatedAt: now,
    })
    .returning({ id: experiences.id });

  await writeAuditEvent({
    actorEmail: email,
    action: "experience.create",
    entityType: "experience",
    entityId: created.id,
  });

  return created.id;
}

export async function updateExperience(
  experienceId: string,
  payload: z.infer<typeof experiencePayloadSchema>,
) {
  const { email } = await requireAdmin();
  const parsedId = experienceIdSchema.parse(experienceId);
  const parsedPayload = experiencePayloadSchema.parse(payload);
  const db = getDb();

  await db
    .update(experiences)
    .set({
      company: parsedPayload.company,
      location: parsedPayload.location,
      role: parsedPayload.role,
      start: parsedPayload.start,
      end: parsedPayload.end,
      current: parsedPayload.current,
      version: sql`${experiences.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(experiences.id, parsedId));

  await writeAuditEvent({
    actorEmail: email,
    action: "experience.update",
    entityType: "experience",
    entityId: parsedId,
    metadata: parsedPayload,
  });
}

export async function deleteExperience(experienceId: string) {
  const { email } = await requireAdmin();
  const parsedId = experienceIdSchema.parse(experienceId);
  const db = getDb();

  await db.delete(experiences).where(eq(experiences.id, parsedId));

  const rows = await db
    .select({ id: experiences.id })
    .from(experiences)
    .orderBy(asc(experiences.sortOrder));

  await db.transaction(async (tx) => {
    await Promise.all(
      rows.map((row, index) =>
        tx
          .update(experiences)
          .set({
            sortOrder: index,
            version: sql`${experiences.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(experiences.id, row.id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "experience.delete",
    entityType: "experience",
    entityId: parsedId,
  });
}

export async function reorderExperiences(orderedExperienceIds: string[]) {
  const { email } = await requireAdmin();
  const parsedIds = z.array(experienceIdSchema).min(1).parse(orderedExperienceIds);
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedIds.map((id, index) =>
        tx
          .update(experiences)
          .set({
            sortOrder: index,
            version: sql`${experiences.version} + 1`,
            updatedAt: now,
          })
          .where(eq(experiences.id, id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "experience.reorder",
    entityType: "experience",
    entityId: parsedIds[0],
    metadata: { orderedIds: parsedIds },
  });
}

export async function addExperienceBullet(experienceId: string) {
  const { email } = await requireAdmin();
  const parsedId = experienceIdSchema.parse(experienceId);
  const db = getDb();

  const rows = await db
    .select({ id: experienceBullets.id })
    .from(experienceBullets)
    .where(eq(experienceBullets.experienceId, parsedId))
    .orderBy(asc(experienceBullets.sortOrder));

  const [created] = await db
    .insert(experienceBullets)
    .values({
      experienceId: parsedId,
      body: "New achievement",
      sortOrder: rows.length,
      version: 0,
      updatedAt: new Date(),
    })
    .returning({ id: experienceBullets.id });

  await writeAuditEvent({
    actorEmail: email,
    action: "experience_bullet.create",
    entityType: "experience_bullet",
    entityId: created.id,
    metadata: { experienceId: parsedId },
  });
}

export async function updateExperienceBullet(
  experienceId: string,
  bulletId: string,
  body: string,
) {
  const { email } = await requireAdmin();
  const parsedExperienceId = experienceIdSchema.parse(experienceId);
  const parsedBulletId = bulletIdSchema.parse(bulletId);
  const parsedBody = z.string().trim().min(1).max(300).parse(body);
  const db = getDb();

  await db
    .update(experienceBullets)
    .set({
      body: parsedBody,
      version: sql`${experienceBullets.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(experienceBullets.id, parsedBulletId),
        eq(experienceBullets.experienceId, parsedExperienceId),
      ),
    );

  await writeAuditEvent({
    actorEmail: email,
    action: "experience_bullet.update",
    entityType: "experience_bullet",
    entityId: parsedBulletId,
    metadata: { experienceId: parsedExperienceId },
  });
}

export async function deleteExperienceBullet(
  experienceId: string,
  bulletId: string,
) {
  const { email } = await requireAdmin();
  const parsedExperienceId = experienceIdSchema.parse(experienceId);
  const parsedBulletId = bulletIdSchema.parse(bulletId);
  const db = getDb();
  const now = new Date();

  await db
    .delete(experienceBullets)
    .where(
      and(
        eq(experienceBullets.id, parsedBulletId),
        eq(experienceBullets.experienceId, parsedExperienceId),
      ),
    );

  const remaining = await db
    .select({ id: experienceBullets.id })
    .from(experienceBullets)
    .where(eq(experienceBullets.experienceId, parsedExperienceId))
    .orderBy(asc(experienceBullets.sortOrder));

  await db.transaction(async (tx) => {
    await Promise.all(
      remaining.map((row, index) =>
        tx
          .update(experienceBullets)
          .set({
            sortOrder: index,
            version: sql`${experienceBullets.version} + 1`,
            updatedAt: now,
          })
          .where(eq(experienceBullets.id, row.id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "experience_bullet.delete",
    entityType: "experience_bullet",
    entityId: parsedBulletId,
    metadata: { experienceId: parsedExperienceId },
  });
}

export async function reorderExperienceBullets(
  experienceId: string,
  orderedBulletIds: string[],
) {
  const { email } = await requireAdmin();
  const parsedExperienceId = experienceIdSchema.parse(experienceId);
  const parsedBulletIds = z.array(bulletIdSchema).parse(orderedBulletIds);
  const db = getDb();
  const now = new Date();

  if (parsedBulletIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: experienceBullets.id })
    .from(experienceBullets)
    .where(
      and(
        eq(experienceBullets.experienceId, parsedExperienceId),
        inArray(experienceBullets.id, parsedBulletIds),
      ),
    );

  if (rows.length !== parsedBulletIds.length) {
    throw new Error("Some bullets do not belong to this experience.");
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedBulletIds.map((id, index) =>
        tx
          .update(experienceBullets)
          .set({
            sortOrder: index,
            version: sql`${experienceBullets.version} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(experienceBullets.id, id),
              eq(experienceBullets.experienceId, parsedExperienceId),
            ),
          ),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "experience_bullet.reorder",
    entityType: "experience_bullet",
    entityId: parsedExperienceId,
    metadata: {
      orderedIds: parsedBulletIds,
    },
  });
}

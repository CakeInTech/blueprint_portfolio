"use server";

import { revalidatePath } from "next/cache";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { CIT_DATA } from "@/app/components/data";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import { aboutCurrentlyItems, auditEvents, portfolioAbout } from "@/lib/db/schema";

export type AboutSectionRecord = {
  headCode: string;
  headLabel: string;
  headTitle: string;
  contentMd: string;
  paragraph1: string;
  paragraph2Prefix: string;
  paragraph2Highlight: string;
  paragraph2Mid: string;
  paragraph2Emphasis: string;
  paragraph2Suffix: string;
  paragraph3: string;
  frameLabel: string;
  frameSpec: string;
};

export type AboutCurrentlyItemRecord = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
};

const itemIdSchema = z.string().uuid();

const aboutSectionSchema = z.object({
  headCode: z.string().trim().min(1).max(32),
  headLabel: z.string().trim().min(1).max(120),
  headTitle: z.string().trim().min(1).max(200),
  contentMd: z.string().trim().max(20000).default(""),
  paragraph1: z.string().trim().min(1).max(4000),
  paragraph2Prefix: z.string().trim().max(2000).default(""),
  paragraph2Highlight: z.string().trim().max(200).default(""),
  paragraph2Mid: z.string().trim().max(2000).default(""),
  paragraph2Emphasis: z.string().trim().max(500).default(""),
  paragraph2Suffix: z.string().trim().max(2000).default(""),
  paragraph3: z.string().trim().min(1).max(4000),
  frameLabel: z.string().trim().min(1).max(80),
  frameSpec: z.string().trim().min(1).max(80),
});

const currentlyItemPayloadSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
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

async function ensureMainAboutRow() {
  const db = getDb();
  const [existing] = await db
    .select({ id: portfolioAbout.id })
    .from(portfolioAbout)
    .where(eq(portfolioAbout.id, "main"))
    .limit(1);

  if (existing) return;

  const a = CIT_DATA.about;
  const now = new Date();
  await db.insert(portfolioAbout).values({
    id: "main",
    headCode: a.headCode,
    headLabel: a.headLabel,
    headTitle: a.headTitle,
    contentMd: a.contentMd,
    paragraph1: a.paragraph1,
    paragraph2Prefix: a.paragraph2Prefix,
    paragraph2Highlight: a.paragraph2Highlight,
    paragraph2Mid: a.paragraph2Mid,
    paragraph2Emphasis: a.paragraph2Emphasis,
    paragraph2Suffix: a.paragraph2Suffix,
    paragraph3: a.paragraph3,
    frameLabel: a.frameLabel,
    frameSpec: a.frameSpec,
    version: 0,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(aboutCurrentlyItems).values(
    a.currently.map((row, index) => ({
      aboutId: "main",
      title: row.title,
      description: row.description,
      sortOrder: index,
      version: 0,
      updatedAt: now,
    })),
  );
}

function rowToSectionRecord(row: typeof portfolioAbout.$inferSelect): AboutSectionRecord {
  return {
    headCode: row.headCode,
    headLabel: row.headLabel,
    headTitle: row.headTitle,
    contentMd: row.contentMd ?? "",
    paragraph1: row.paragraph1,
    paragraph2Prefix: row.paragraph2Prefix,
    paragraph2Highlight: row.paragraph2Highlight,
    paragraph2Mid: row.paragraph2Mid,
    paragraph2Emphasis: row.paragraph2Emphasis,
    paragraph2Suffix: row.paragraph2Suffix,
    paragraph3: row.paragraph3,
    frameLabel: row.frameLabel,
    frameSpec: row.frameSpec,
  };
}

export async function getAboutEditorData(): Promise<{
  section: AboutSectionRecord;
  items: AboutCurrentlyItemRecord[];
}> {
  await requireAdmin();
  const db = getDb();
  await ensureMainAboutRow();

  const [row] = await db
    .select()
    .from(portfolioAbout)
    .where(eq(portfolioAbout.id, "main"))
    .limit(1);

  if (!row) {
    throw new Error("portfolio_about main row missing after ensure.");
  }

  const itemRows = await db
    .select()
    .from(aboutCurrentlyItems)
    .where(eq(aboutCurrentlyItems.aboutId, "main"))
    .orderBy(asc(aboutCurrentlyItems.sortOrder));

  return {
    section: rowToSectionRecord(row),
    items: itemRows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      sortOrder: r.sortOrder,
    })),
  };
}

export async function updateAbout(
  payload: z.infer<typeof aboutSectionSchema>,
) {
  const { email } = await requireAdmin();
  const parsed = aboutSectionSchema.parse(payload);
  const db = getDb();
  await ensureMainAboutRow();
  const now = new Date();

  await db
    .update(portfolioAbout)
    .set({
      headCode: parsed.headCode,
      headLabel: parsed.headLabel,
      headTitle: parsed.headTitle,
      contentMd: parsed.contentMd || null,
      paragraph1: parsed.paragraph1,
      paragraph2Prefix: parsed.paragraph2Prefix,
      paragraph2Highlight: parsed.paragraph2Highlight,
      paragraph2Mid: parsed.paragraph2Mid,
      paragraph2Emphasis: parsed.paragraph2Emphasis,
      paragraph2Suffix: parsed.paragraph2Suffix,
      paragraph3: parsed.paragraph3,
      frameLabel: parsed.frameLabel,
      frameSpec: parsed.frameSpec,
      version: sql`${portfolioAbout.version} + 1`,
      updatedAt: now,
    })
    .where(eq(portfolioAbout.id, "main"));

  await writeAuditEvent({
    actorEmail: email,
    action: "portfolio_about.update",
    entityType: "portfolio_about",
    entityId: "main",
    metadata: {},
  });

  revalidatePath("/");
  revalidatePath("/cms");
}

export async function createAboutCurrentlyItem() {
  const { email } = await requireAdmin();
  const db = getDb();
  await ensureMainAboutRow();
  const now = new Date();

  const [{ count: n }] = await db
    .select({ count: count() })
    .from(aboutCurrentlyItems)
    .where(eq(aboutCurrentlyItems.aboutId, "main"));

  const [created] = await db
    .insert(aboutCurrentlyItems)
    .values({
      aboutId: "main",
      title: "NEW",
      description: "Description",
      sortOrder: Number(n ?? 0),
      version: 0,
      updatedAt: now,
    })
    .returning({ id: aboutCurrentlyItems.id });

  await writeAuditEvent({
    actorEmail: email,
    action: "about_currently_item.create",
    entityType: "about_currently_item",
    entityId: created.id,
  });

  revalidatePath("/");
  revalidatePath("/cms");

  return created.id;
}

export async function updateAboutCurrentlyItem(
  itemId: string,
  payload: z.infer<typeof currentlyItemPayloadSchema>,
) {
  const { email } = await requireAdmin();
  const parsedId = itemIdSchema.parse(itemId);
  const parsed = currentlyItemPayloadSchema.parse(payload);
  const db = getDb();
  const now = new Date();

  await db
    .update(aboutCurrentlyItems)
    .set({
      title: parsed.title,
      description: parsed.description,
      version: sql`${aboutCurrentlyItems.version} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(aboutCurrentlyItems.id, parsedId),
        eq(aboutCurrentlyItems.aboutId, "main"),
      ),
    );

  await writeAuditEvent({
    actorEmail: email,
    action: "about_currently_item.update",
    entityType: "about_currently_item",
    entityId: parsedId,
  });

  revalidatePath("/");
  revalidatePath("/cms");
}

export async function deleteAboutCurrentlyItem(itemId: string) {
  const { email } = await requireAdmin();
  const parsedId = itemIdSchema.parse(itemId);
  const db = getDb();
  const now = new Date();

  await db
    .delete(aboutCurrentlyItems)
    .where(
      and(
        eq(aboutCurrentlyItems.id, parsedId),
        eq(aboutCurrentlyItems.aboutId, "main"),
      ),
    );

  const remaining = await db
    .select({ id: aboutCurrentlyItems.id })
    .from(aboutCurrentlyItems)
    .where(eq(aboutCurrentlyItems.aboutId, "main"))
    .orderBy(asc(aboutCurrentlyItems.sortOrder));

  await db.transaction(async (tx) => {
    await Promise.all(
      remaining.map((row, index) =>
        tx
          .update(aboutCurrentlyItems)
          .set({
            sortOrder: index,
            version: sql`${aboutCurrentlyItems.version} + 1`,
            updatedAt: now,
          })
          .where(eq(aboutCurrentlyItems.id, row.id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "about_currently_item.delete",
    entityType: "about_currently_item",
    entityId: parsedId,
  });

  revalidatePath("/");
  revalidatePath("/cms");
}

export async function reorderAboutCurrentlyItems(orderedItemIds: string[]) {
  const { email } = await requireAdmin();
  const parsedIds = z.array(itemIdSchema).min(1).parse(orderedItemIds);
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({ id: aboutCurrentlyItems.id })
    .from(aboutCurrentlyItems)
    .where(
      and(
        eq(aboutCurrentlyItems.aboutId, "main"),
        inArray(aboutCurrentlyItems.id, parsedIds),
      ),
    );

  if (rows.length !== parsedIds.length) {
    throw new Error("Some currently items are invalid or missing.");
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedIds.map((id, index) =>
        tx
          .update(aboutCurrentlyItems)
          .set({
            sortOrder: index,
            version: sql`${aboutCurrentlyItems.version} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(aboutCurrentlyItems.id, id),
              eq(aboutCurrentlyItems.aboutId, "main"),
            ),
          ),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "about_currently_item.reorder",
    entityType: "portfolio_about",
    entityId: "main",
    metadata: { orderedIds: parsedIds },
  });

  revalidatePath("/");
  revalidatePath("/cms");
}

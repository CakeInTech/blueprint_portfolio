"use server";

import { asc, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import { auditEvents, devlogPosts } from "@/lib/db/schema";

export type DevlogPostRecord = {
  id: string;
  published: boolean;
  date: string;
  title: string;
  kind: string;
  read: string;
  excerpt: string;
  sortOrder: number;
};

const postIdSchema = z.string().uuid();

const devlogPayloadSchema = z.object({
  date: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(200),
  kind: z.string().trim().min(1).max(80),
  read: z.string().trim().min(1).max(40),
  excerpt: z.string().trim().min(1).max(8000),
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

export async function getDevlogEditorData(): Promise<DevlogPostRecord[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(devlogPosts)
    .orderBy(asc(devlogPosts.sortOrder));

  return rows.map((row) => ({
    id: row.id,
    published: row.published,
    date: row.date,
    title: row.title,
    kind: row.kind,
    read: row.read,
    excerpt: row.excerpt,
    sortOrder: row.sortOrder,
  }));
}

export async function createDevlogPost() {
  const { email } = await requireAdmin();
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const [{ count: postCount }] = await db
    .select({ count: count() })
    .from(devlogPosts);

  const [created] = await db
    .insert(devlogPosts)
    .values({
      date: today,
      title: "New post",
      kind: "Draft",
      read: "1 min",
      excerpt: "Write an excerpt for the listing and card view.",
      published: false,
      sortOrder: Number(postCount ?? 0),
      version: 0,
      updatedAt: now,
    })
    .returning({ id: devlogPosts.id });

  await writeAuditEvent({
    actorEmail: email,
    action: "devlog_post.create",
    entityType: "devlog_post",
    entityId: created.id,
  });

  return created.id;
}

export async function updateDevlogPost(
  postId: string,
  payload: z.infer<typeof devlogPayloadSchema>,
) {
  const { email } = await requireAdmin();
  const parsedId = postIdSchema.parse(postId);
  const parsedPayload = devlogPayloadSchema.parse(payload);
  const db = getDb();

  await db
    .update(devlogPosts)
    .set({
      date: parsedPayload.date,
      title: parsedPayload.title,
      kind: parsedPayload.kind,
      read: parsedPayload.read,
      excerpt: parsedPayload.excerpt,
      version: sql`${devlogPosts.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(devlogPosts.id, parsedId));

  await writeAuditEvent({
    actorEmail: email,
    action: "devlog_post.update",
    entityType: "devlog_post",
    entityId: parsedId,
    metadata: parsedPayload,
  });
}

export async function setDevlogPublished(postId: string, published: boolean) {
  const { email } = await requireAdmin();
  const parsedId = postIdSchema.parse(postId);
  const db = getDb();

  await db
    .update(devlogPosts)
    .set({
      published,
      version: sql`${devlogPosts.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(devlogPosts.id, parsedId));

  await writeAuditEvent({
    actorEmail: email,
    action: published ? "devlog_post.publish" : "devlog_post.unpublish",
    entityType: "devlog_post",
    entityId: parsedId,
    metadata: { published },
  });
}

export async function reorderDevlogPosts(orderedPostIds: string[]) {
  const { email } = await requireAdmin();
  const parsedIds = z.array(postIdSchema).min(1).parse(orderedPostIds);
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedIds.map((id, index) =>
        tx
          .update(devlogPosts)
          .set({
            sortOrder: index,
            version: sql`${devlogPosts.version} + 1`,
            updatedAt: now,
          })
          .where(eq(devlogPosts.id, id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "devlog_post.reorder",
    entityType: "devlog_post",
    entityId: parsedIds[0],
    metadata: { orderedIds: parsedIds },
  });
}

"use server";

import { randomUUID } from "node:crypto";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import {
  auditEvents,
  projectMetrics,
  projects,
  projectStackItems,
} from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import { uploadProjectImageFromFile } from "@/lib/cms/project-image-upload";

export type ProjectStackItemRecord = {
  id: string;
  label: string;
  sortOrder: number;
};

export type ProjectMetricRecord = {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
};

export type ProjectRecord = {
  id: string;
  name: string;
  kind: string;
  size: "sm" | "md" | "lg";
  year: string;
  tag: string | null;
  color: string | null;
  imageUrl: string | null;
  blurb: string;
  sortOrder: number;
  stack: ProjectStackItemRecord[];
  metrics: ProjectMetricRecord[];
};

const projectIdSchema = z.string().trim().min(1).max(64);
const childIdSchema = z.string().uuid();

const projectPayloadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  kind: z.string().trim().min(1).max(120),
  size: z.enum(["sm", "md", "lg"]),
  year: z.string().trim().min(1).max(20),
  tag: z.string().trim().max(80).nullable(),
  color: z.string().trim().max(32).nullable(),
  blurb: z.string().trim().min(1).max(2000),
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

export async function getProjectEditorData(): Promise<ProjectRecord[]> {
  const db = getDb();

  const projectRows = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder));

  const stackRows = await db
    .select()
    .from(projectStackItems)
    .orderBy(asc(projectStackItems.sortOrder));

  const metricRows = await db
    .select()
    .from(projectMetrics)
    .orderBy(asc(projectMetrics.sortOrder));

  return projectRows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    size: row.size as "sm" | "md" | "lg",
    year: row.year,
    tag: row.tag,
    color: row.color,
    imageUrl: row.imageUrl,
    blurb: row.blurb,
    sortOrder: row.sortOrder,
    stack: stackRows
      .filter((s) => s.projectId === row.id)
      .map((s) => ({
        id: s.id,
        label: s.label,
        sortOrder: s.sortOrder,
      })),
    metrics: metricRows
      .filter((m) => m.projectId === row.id)
      .map((m) => ({
        id: m.id,
        value: m.value,
        label: m.label,
        sortOrder: m.sortOrder,
      })),
  }));
}

export async function createProject() {
  const { email } = await requireAdmin();
  const db = getDb();
  const now = new Date();
  const id = randomUUID();

  const [{ count: projectCount }] = await db
    .select({ count: count() })
    .from(projects);

  await db.insert(projects).values({
    id,
    name: "New project",
    kind: "Project",
    size: "sm",
    year: String(now.getFullYear()),
    tag: null,
    color: null,
    blurb: "Short description for the portfolio card.",
    sortOrder: Number(projectCount ?? 0),
    version: 0,
    updatedAt: now,
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "project.create",
    entityType: "project",
    entityId: id,
  });

  return id;
}

export async function updateProject(
  projectId: string,
  payload: z.infer<typeof projectPayloadSchema>,
) {
  const { email } = await requireAdmin();
  const parsedId = projectIdSchema.parse(projectId);
  const parsedPayload = projectPayloadSchema.parse(payload);
  const db = getDb();

  await db
    .update(projects)
    .set({
      name: parsedPayload.name,
      kind: parsedPayload.kind,
      size: parsedPayload.size,
      year: parsedPayload.year,
      tag: parsedPayload.tag,
      color: parsedPayload.color,
      blurb: parsedPayload.blurb,
      version: sql`${projects.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, parsedId));

  await writeAuditEvent({
    actorEmail: email,
    action: "project.update",
    entityType: "project",
    entityId: parsedId,
    metadata: parsedPayload as Record<string, unknown>,
  });
}

export async function deleteProject(projectId: string) {
  const { email } = await requireAdmin();
  const parsedId = projectIdSchema.parse(projectId);
  const db = getDb();

  await db.delete(projects).where(eq(projects.id, parsedId));

  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .orderBy(asc(projects.sortOrder));

  await db.transaction(async (tx) => {
    await Promise.all(
      rows.map((row, index) =>
        tx
          .update(projects)
          .set({
            sortOrder: index,
            version: sql`${projects.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, row.id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "project.delete",
    entityType: "project",
    entityId: parsedId,
  });
}

export async function reorderProjects(orderedProjectIds: string[]) {
  const { email } = await requireAdmin();
  const parsedIds = z.array(projectIdSchema).min(1).parse(orderedProjectIds);
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedIds.map((id, index) =>
        tx
          .update(projects)
          .set({
            sortOrder: index,
            version: sql`${projects.version} + 1`,
            updatedAt: now,
          })
          .where(eq(projects.id, id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "project.reorder",
    entityType: "project",
    entityId: parsedIds[0],
    metadata: { orderedIds: parsedIds },
  });
}

export async function addProjectStackItem(projectId: string) {
  const { email } = await requireAdmin();
  const parsedId = projectIdSchema.parse(projectId);
  const db = getDb();

  const rows = await db
    .select({ id: projectStackItems.id })
    .from(projectStackItems)
    .where(eq(projectStackItems.projectId, parsedId))
    .orderBy(asc(projectStackItems.sortOrder));

  const [created] = await db
    .insert(projectStackItems)
    .values({
      projectId: parsedId,
      label: "New stack",
      sortOrder: rows.length,
      version: 0,
      updatedAt: new Date(),
    })
    .returning({ id: projectStackItems.id });

  await writeAuditEvent({
    actorEmail: email,
    action: "project_stack_item.create",
    entityType: "project_stack_item",
    entityId: created.id,
    metadata: { projectId: parsedId },
  });
}

export async function updateProjectStackItem(
  projectId: string,
  stackItemId: string,
  label: string,
) {
  const { email } = await requireAdmin();
  const parsedProjectId = projectIdSchema.parse(projectId);
  const parsedStackItemId = childIdSchema.parse(stackItemId);
  const parsedLabel = z.string().trim().min(1).max(120).parse(label);
  const db = getDb();

  await db
    .update(projectStackItems)
    .set({
      label: parsedLabel,
      version: sql`${projectStackItems.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectStackItems.id, parsedStackItemId),
        eq(projectStackItems.projectId, parsedProjectId),
      ),
    );

  await writeAuditEvent({
    actorEmail: email,
    action: "project_stack_item.update",
    entityType: "project_stack_item",
    entityId: parsedStackItemId,
    metadata: { projectId: parsedProjectId },
  });
}

export async function deleteProjectStackItem(
  projectId: string,
  stackItemId: string,
) {
  const { email } = await requireAdmin();
  const parsedProjectId = projectIdSchema.parse(projectId);
  const parsedStackItemId = childIdSchema.parse(stackItemId);
  const db = getDb();
  const now = new Date();

  await db
    .delete(projectStackItems)
    .where(
      and(
        eq(projectStackItems.id, parsedStackItemId),
        eq(projectStackItems.projectId, parsedProjectId),
      ),
    );

  const remaining = await db
    .select({ id: projectStackItems.id })
    .from(projectStackItems)
    .where(eq(projectStackItems.projectId, parsedProjectId))
    .orderBy(asc(projectStackItems.sortOrder));

  await db.transaction(async (tx) => {
    await Promise.all(
      remaining.map((row, index) =>
        tx
          .update(projectStackItems)
          .set({
            sortOrder: index,
            version: sql`${projectStackItems.version} + 1`,
            updatedAt: now,
          })
          .where(eq(projectStackItems.id, row.id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "project_stack_item.delete",
    entityType: "project_stack_item",
    entityId: parsedStackItemId,
    metadata: { projectId: parsedProjectId },
  });
}

export async function reorderProjectStackItems(
  projectId: string,
  orderedStackItemIds: string[],
) {
  const { email } = await requireAdmin();
  const parsedProjectId = projectIdSchema.parse(projectId);
  const parsedIds = z.array(childIdSchema).parse(orderedStackItemIds);
  const db = getDb();
  const now = new Date();

  if (parsedIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: projectStackItems.id })
    .from(projectStackItems)
    .where(
      and(
        eq(projectStackItems.projectId, parsedProjectId),
        inArray(projectStackItems.id, parsedIds),
      ),
    );

  if (rows.length !== parsedIds.length) {
    throw new Error("Some stack items do not belong to this project.");
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedIds.map((id, index) =>
        tx
          .update(projectStackItems)
          .set({
            sortOrder: index,
            version: sql`${projectStackItems.version} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(projectStackItems.id, id),
              eq(projectStackItems.projectId, parsedProjectId),
            ),
          ),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "project_stack_item.reorder",
    entityType: "project_stack_item",
    entityId: parsedProjectId,
    metadata: { orderedIds: parsedIds },
  });
}

export async function addProjectMetric(projectId: string) {
  const { email } = await requireAdmin();
  const parsedId = projectIdSchema.parse(projectId);
  const db = getDb();

  const rows = await db
    .select({ id: projectMetrics.id })
    .from(projectMetrics)
    .where(eq(projectMetrics.projectId, parsedId))
    .orderBy(asc(projectMetrics.sortOrder));

  const [created] = await db
    .insert(projectMetrics)
    .values({
      projectId: parsedId,
      value: "—",
      label: "Metric",
      sortOrder: rows.length,
      version: 0,
      updatedAt: new Date(),
    })
    .returning({ id: projectMetrics.id });

  await writeAuditEvent({
    actorEmail: email,
    action: "project_metric.create",
    entityType: "project_metric",
    entityId: created.id,
    metadata: { projectId: parsedId },
  });
}

const metricPayloadSchema = z.object({
  value: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
});

export async function updateProjectMetric(
  projectId: string,
  metricId: string,
  payload: z.infer<typeof metricPayloadSchema>,
) {
  const { email } = await requireAdmin();
  const parsedProjectId = projectIdSchema.parse(projectId);
  const parsedMetricId = childIdSchema.parse(metricId);
  const parsedPayload = metricPayloadSchema.parse(payload);
  const db = getDb();

  await db
    .update(projectMetrics)
    .set({
      value: parsedPayload.value,
      label: parsedPayload.label,
      version: sql`${projectMetrics.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectMetrics.id, parsedMetricId),
        eq(projectMetrics.projectId, parsedProjectId),
      ),
    );

  await writeAuditEvent({
    actorEmail: email,
    action: "project_metric.update",
    entityType: "project_metric",
    entityId: parsedMetricId,
    metadata: { projectId: parsedProjectId },
  });
}

export async function deleteProjectMetric(projectId: string, metricId: string) {
  const { email } = await requireAdmin();
  const parsedProjectId = projectIdSchema.parse(projectId);
  const parsedMetricId = childIdSchema.parse(metricId);
  const db = getDb();
  const now = new Date();

  await db
    .delete(projectMetrics)
    .where(
      and(
        eq(projectMetrics.id, parsedMetricId),
        eq(projectMetrics.projectId, parsedProjectId),
      ),
    );

  const remaining = await db
    .select({ id: projectMetrics.id })
    .from(projectMetrics)
    .where(eq(projectMetrics.projectId, parsedProjectId))
    .orderBy(asc(projectMetrics.sortOrder));

  await db.transaction(async (tx) => {
    await Promise.all(
      remaining.map((row, index) =>
        tx
          .update(projectMetrics)
          .set({
            sortOrder: index,
            version: sql`${projectMetrics.version} + 1`,
            updatedAt: now,
          })
          .where(eq(projectMetrics.id, row.id)),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "project_metric.delete",
    entityType: "project_metric",
    entityId: parsedMetricId,
    metadata: { projectId: parsedProjectId },
  });
}

export async function reorderProjectMetrics(
  projectId: string,
  orderedMetricIds: string[],
) {
  const { email } = await requireAdmin();
  const parsedProjectId = projectIdSchema.parse(projectId);
  const parsedIds = z.array(childIdSchema).parse(orderedMetricIds);
  const db = getDb();
  const now = new Date();

  if (parsedIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: projectMetrics.id })
    .from(projectMetrics)
    .where(
      and(
        eq(projectMetrics.projectId, parsedProjectId),
        inArray(projectMetrics.id, parsedIds),
      ),
    );

  if (rows.length !== parsedIds.length) {
    throw new Error("Some metrics do not belong to this project.");
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      parsedIds.map((id, index) =>
        tx
          .update(projectMetrics)
          .set({
            sortOrder: index,
            version: sql`${projectMetrics.version} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(projectMetrics.id, id),
              eq(projectMetrics.projectId, parsedProjectId),
            ),
          ),
      ),
    );
  });

  await writeAuditEvent({
    actorEmail: email,
    action: "project_metric.reorder",
    entityType: "project_metric",
    entityId: parsedProjectId,
    metadata: { orderedIds: parsedIds },
  });
}

export type ProjectImageActionResult =
  | { ok: true; url: string | null }
  | { ok: false; message: string };

/** Uploads a showcase image/mockup for a project and publishes it. */
export async function uploadProjectImage(
  projectId: string,
  formData: FormData,
): Promise<ProjectImageActionResult> {
  const { email } = await requireAdmin();
  const parsedId = projectIdSchema.parse(projectId);
  const db = getDb();

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, parsedId))
    .limit(1);
  if (!existing) return { ok: false, message: "Project not found." };

  const file = formData.get("projectImageFile");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Pick an image file first." };
  }

  const uploaded = await uploadProjectImageFromFile(parsedId, file);
  if (!uploaded.ok) return { ok: false, message: uploaded.message };

  await db
    .update(projects)
    .set({
      imageUrl: uploaded.url,
      version: sql`${projects.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, parsedId));

  await writeAuditEvent({
    actorEmail: email,
    action: "project.image.upload",
    entityType: "project",
    entityId: parsedId,
    metadata: { url: uploaded.url },
  });

  revalidatePath("/");
  revalidatePath("/cms");

  return { ok: true, url: uploaded.url };
}

/** Removes a project's showcase image (tile falls back to the schematic). */
export async function clearProjectImage(
  projectId: string,
): Promise<ProjectImageActionResult> {
  const { email } = await requireAdmin();
  const parsedId = projectIdSchema.parse(projectId);
  const db = getDb();

  await db
    .update(projects)
    .set({
      imageUrl: null,
      version: sql`${projects.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, parsedId));

  await writeAuditEvent({
    actorEmail: email,
    action: "project.image.clear",
    entityType: "project",
    entityId: parsedId,
  });

  revalidatePath("/");
  revalidatePath("/cms");

  return { ok: true, url: null };
}

"use server";

import { and, asc, gte, lte, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import { auditEvents, meetings } from "@/lib/db/schema";
import { isCalendarEnabled, createCalendarEvent } from "@/lib/google/calendar";

export type MeetingRecord = {
  id: string;
  title: string;
  who: string;
  kind: string;
  status: string;
  platform: string;
  link: string;
  notes: string;
  startTime: Date;
  endTime: Date;
  gcalEventId: string | null;
  gcalMeetLink: string | null;
};

const meetingPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  who: z.string().trim().max(120).default(""),
  kind: z.enum(["CLIENT", "INBOUND", "FOCUS", "TEAM", "ROLE"]).default("CLIENT"),
  status: z.enum(["Confirmed", "Pending", "Hold"]).default("Confirmed"),
  platform: z.string().trim().max(100).default(""),
  link: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(2000).default(""),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

const meetingIdSchema = z.string().uuid();

async function auditLog(
  email: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const db = getDb();
  await db.insert(auditEvents).values({
    actorEmail: email,
    action,
    entityType: "meeting",
    entityId,
    metadata,
  });
}

export async function listMeetingsForWeekAction(
  weekStart: Date,
): Promise<MeetingRecord[]> {
  await requireAdmin();

  let db;
  try {
    db = getDb();
  } catch {
    return [];
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const rows = await db
    .select()
    .from(meetings)
    .where(
      and(
        gte(meetings.startTime, weekStart),
        lte(meetings.startTime, weekEnd),
      ),
    )
    .orderBy(asc(meetings.startTime));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    who: r.who,
    kind: r.kind,
    status: r.status,
    platform: r.platform,
    link: r.link,
    notes: r.notes,
    startTime: r.startTime,
    endTime: r.endTime,
    gcalEventId: r.gcalEventId ?? null,
    gcalMeetLink: r.gcalMeetLink ?? null,
  }));
}

export async function createMeetingAction(payload: unknown): Promise<string> {
  const { email } = await requireAdmin();
  const parsed = meetingPayloadSchema.parse(payload);
  const db = getDb();
  const now = new Date();

  const [created] = await db
    .insert(meetings)
    .values({
      title: parsed.title,
      who: parsed.who,
      kind: parsed.kind,
      status: parsed.status,
      platform: parsed.platform,
      link: parsed.link,
      notes: parsed.notes,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      version: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: meetings.id });

  // Auto-create Google Calendar event for confirmed meetings
  if (parsed.status === "Confirmed" && isCalendarEnabled()) {
    try {
      const { eventId, meetLink } = await createCalendarEvent({
        title: parsed.title,
        who: parsed.who,
        start: parsed.startTime,
        end: parsed.endTime,
        notes: parsed.notes,
      });
      await db
        .update(meetings)
        .set({ gcalEventId: eventId, gcalMeetLink: meetLink, link: meetLink ?? parsed.link })
        .where(eq(meetings.id, created.id));
    } catch (err) {
      console.error("[createMeeting] GCal error:", err);
    }
  }

  await auditLog(email, "meeting.create", created.id, { title: parsed.title });
  revalidatePath("/cms");
  return created.id;
}

export async function updateMeetingAction(
  id: string,
  payload: unknown,
): Promise<void> {
  const { email } = await requireAdmin();
  const parsedId = meetingIdSchema.parse(id);
  const parsed = meetingPayloadSchema.parse(payload);
  const db = getDb();
  const now = new Date();

  await db
    .update(meetings)
    .set({
      title: parsed.title,
      who: parsed.who,
      kind: parsed.kind,
      status: parsed.status,
      platform: parsed.platform,
      link: parsed.link,
      notes: parsed.notes,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      version: sql`${meetings.version} + 1`,
      updatedAt: now,
    })
    .where(eq(meetings.id, parsedId));

  await auditLog(email, "meeting.update", parsedId, { title: parsed.title });
  revalidatePath("/cms");
}

export async function deleteMeetingAction(id: string): Promise<void> {
  const { email } = await requireAdmin();
  const parsedId = meetingIdSchema.parse(id);
  const db = getDb();

  await db.delete(meetings).where(eq(meetings.id, parsedId));
  await auditLog(email, "meeting.delete", parsedId);
  revalidatePath("/cms");
}

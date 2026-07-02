"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import {
  auditEvents,
  bookingRequests,
  contactInquiries,
  newsletterSubscribers,
} from "@/lib/db/schema";
import { sendVisitorEmail } from "@/lib/email/resend";
import {
  fetchInboundThreads,
  filterInboundThreads,
} from "@/lib/inbound/queries";
import type { InboundFilterKind, InboundKind, InboundThread } from "@/lib/inbound/types";

const contactStatusSchema = z.enum(["new", "read", "archived"]);
const bookingStatusSchema = z.enum([
  "hold_requested",
  "confirmed",
  "declined",
  "archived",
]);
const subscriberStatusSchema = z.enum(["subscribed", "unsubscribed"]);

const filterInputSchema = z.object({
  kind: z.enum(["all", "contact", "booking", "subscriber"]).optional(),
  search: z.string().max(200).optional(),
});

export type ListInboundResult =
  | { ok: true; configured: boolean; threads: InboundThread[] }
  | { ok: false; error: "no_database" };

export async function listInboundThreadsAction(
  raw?: unknown,
): Promise<ListInboundResult> {
  await requireAdmin();

  try {
    getDb();
  } catch {
    return { ok: false, error: "no_database" };
  }

  const parsed = filterInputSchema.safeParse(raw ?? {});
  const kind = (parsed.success ? parsed.data.kind : undefined) ?? "all";
  const search = parsed.success ? parsed.data.search : undefined;

  const threads = filterInboundThreads(await fetchInboundThreads(), {
    kind: kind as InboundFilterKind,
    search,
  });

  return { ok: true, configured: true, threads };
}

export type UpdateInboundStatusResult =
  | { ok: true }
  | { ok: false; error: "no_database" | "invalid_input" | "not_found" };

const updatePayloadSchema = z.object({
  id: z.string().min(10).max(80),
  status: z.string().min(2).max(48),
});

function splitInboundId(compositeId: string): {
  kind: InboundKind;
  uuid: string;
} | null {
  const m = /^(contact|booking|subscriber):(.+)$/i.exec(compositeId.trim());
  if (!m) return null;
  const kind = m[1].toLowerCase() as InboundKind;
  const uuid = m[2];
  if (!z.string().uuid().safeParse(uuid).success) return null;
  return { kind, uuid };
}

export async function updateInboundStatusAction(
  raw: unknown,
): Promise<UpdateInboundStatusResult> {
  await requireAdmin();

  let db;
  try {
    db = getDb();
  } catch {
    return { ok: false, error: "no_database" };
  }

  const parsed = updatePayloadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const split = splitInboundId(parsed.data.id);
  if (!split) return { ok: false, error: "invalid_input" };

  const { kind, uuid } = split;
  const status = parsed.data.status;

  if (kind === "contact") {
    const s = contactStatusSchema.safeParse(status);
    if (!s.success) return { ok: false, error: "invalid_input" };
    const [row] = await db
      .update(contactInquiries)
      .set({ status: s.data })
      .where(eq(contactInquiries.id, uuid))
      .returning({ id: contactInquiries.id });
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true };
  }

  if (kind === "booking") {
    const s = bookingStatusSchema.safeParse(status);
    if (!s.success) return { ok: false, error: "invalid_input" };
    const [row] = await db
      .update(bookingRequests)
      .set({ status: s.data })
      .where(eq(bookingRequests.id, uuid))
      .returning({ id: bookingRequests.id });
    if (!row) return { ok: false, error: "not_found" };
    return { ok: true };
  }

  const s = subscriberStatusSchema.safeParse(status);
  if (!s.success) return { ok: false, error: "invalid_input" };
  const [row] = await db
    .update(newsletterSubscribers)
    .set({ status: s.data })
    .where(eq(newsletterSubscribers.id, uuid))
    .returning({ id: newsletterSubscribers.id });
  if (!row) return { ok: false, error: "not_found" };
  return { ok: true };
}

export type ReplyInboundResult =
  | { ok: true }
  | { ok: false; error: string };

const replyPayloadSchema = z.object({
  id: z.string().min(10).max(80),
  body: z.string().trim().min(2).max(5000),
});

/**
 * Sends a reply email to the visitor behind a contact or booking thread.
 * Delivery goes through the configured provider (Resend) from EMAIL_FROM,
 * with replies routed back to CONTACT_TO_EMAIL.
 */
export async function replyToInboundAction(
  raw: unknown,
): Promise<ReplyInboundResult> {
  const { email: adminEmail } = await requireAdmin();

  let db;
  try {
    db = getDb();
  } catch {
    return { ok: false, error: "Database is not configured." };
  }

  const parsed = replyPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Write a reply between 2 and 5000 characters." };
  }

  const split = splitInboundId(parsed.data.id);
  if (!split || split.kind === "subscriber") {
    return { ok: false, error: "Replies are only supported for contact and booking threads." };
  }

  const { kind, uuid } = split;

  let toEmail: string | null = null;
  let subject = "";

  if (kind === "contact") {
    const [row] = await db
      .select({ email: contactInquiries.email })
      .from(contactInquiries)
      .where(eq(contactInquiries.id, uuid))
      .limit(1);
    if (!row) return { ok: false, error: "Thread not found." };
    toEmail = row.email;
    subject = "Re: your inquiry — cakeintech";
  } else {
    const [row] = await db
      .select({
        email: bookingRequests.email,
        requestedDay: bookingRequests.requestedDay,
        requestedTime: bookingRequests.requestedTime,
      })
      .from(bookingRequests)
      .where(eq(bookingRequests.id, uuid))
      .limit(1);
    if (!row) return { ok: false, error: "Thread not found." };
    toEmail = row.email;
    subject = `Re: your call request (${row.requestedDay} ${row.requestedTime}) — cakeintech`;
  }

  const result = await sendVisitorEmail(toEmail, {
    subject,
    text: parsed.data.body,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "Email provider is not configured.",
    };
  }

  if (kind === "contact") {
    await db
      .update(contactInquiries)
      .set({ status: "read" })
      .where(eq(contactInquiries.id, uuid));
  }

  await db.insert(auditEvents).values({
    actorEmail: adminEmail,
    action: "inbound.reply",
    entityType: kind,
    entityId: uuid,
    metadata: { to: toEmail, chars: parsed.data.body.length },
  });

  return { ok: true };
}

export type MarkAllReadResult =
  | { ok: true }
  | { ok: false; error: "no_database" };

/** Marks all contact inquiries with status `new` as `read`. */
export async function markAllInboundReadAction(): Promise<MarkAllReadResult> {
  await requireAdmin();

  let db;
  try {
    db = getDb();
  } catch {
    return { ok: false, error: "no_database" };
  }

  await db
    .update(contactInquiries)
    .set({ status: "read" })
    .where(eq(contactInquiries.status, "new"));

  return { ok: true };
}

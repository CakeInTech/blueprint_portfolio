import { desc } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  bookingRequests,
  contactInquiries,
  newsletterSubscribers,
} from "@/lib/db/schema";
import type { InboundFilterKind, InboundKind, InboundThread } from "./types";

export type { InboundThread, InboundKind, InboundFilterKind } from "./types";

export type BookingRow = InferSelectModel<typeof bookingRequests>;
export type ContactRow = InferSelectModel<typeof contactInquiries>;
export type SubscriberRow = InferSelectModel<typeof newsletterSubscribers>;

function listLabelFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.length > 0 ? local : email;
}

function firstLine(text: string, max = 120): string {
  const line = text.split(/\r?\n/)[0]?.trim() ?? "";
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

function contactTitle(message: string, source: string): string {
  const line = firstLine(message, 100);
  if (line.length > 0) return line;
  return source === "contact" ? "Contact inquiry" : `Inquiry · ${source}`;
}

function mapContact(row: ContactRow): InboundThread {
  const meta = row.metadata ?? {};
  const name =
    typeof meta.name === "string" && meta.name.trim().length > 0
      ? meta.name.trim()
      : listLabelFromEmail(row.email);
  const unread = row.status === "new";
  return {
    kind: "contact",
    id: `contact:${row.id}`,
    createdAtIso: row.createdAt.toISOString(),
    title: contactTitle(row.message, row.source),
    preview: firstLine(row.message, 160),
    listLabel: name,
    secondary: row.source.toUpperCase(),
    tag: row.source === "contact" ? "CONTACT" : row.source.toUpperCase(),
    unread,
    status: row.status,
    emailStatus: row.emailStatus,
    email: row.email,
    message: row.message,
    source: row.source,
    metadata: meta as Record<string, unknown>,
  };
}

function mapBooking(row: BookingRow): InboundThread {
  const title = `Hold · ${row.requestedDay} ${row.requestedTime}`;
  const preview =
    row.notes.trim().length > 0 ? firstLine(row.notes, 160) : "No notes.";
  const unread = row.status === "hold_requested";
  return {
    kind: "booking",
    id: `booking:${row.id}`,
    createdAtIso: row.createdAt.toISOString(),
    title,
    preview,
    listLabel: listLabelFromEmail(row.email),
    secondary: "BOOKING",
    tag: "BOOKING",
    unread,
    status: row.status,
    emailStatus: row.emailStatus,
    email: row.email,
    requestedDay: row.requestedDay,
    requestedTime: row.requestedTime,
    notes: row.notes,
    confirmedMeetingId: row.confirmedMeetingId ?? undefined,
    meetLink: row.gcalMeetLink ?? undefined,
  };
}

function mapSubscriber(row: SubscriberRow): InboundThread {
  return {
    kind: "subscriber",
    id: `subscriber:${row.id}`,
    createdAtIso: row.createdAt.toISOString(),
    title: "Devlog subscription",
    preview: row.email,
    listLabel: listLabelFromEmail(row.email),
    secondary: "NEWSLETTER",
    tag: "DEVLOG",
    unread: false,
    status: row.status,
    emailStatus: row.emailStatus,
    email: row.email,
  };
}

/**
 * Merge DB rows into a single reverse-chronological feed.
 * Drops `contact_inquiries` rows that duplicate a `booking_requests` row (same fingerprint, source booking).
 */
export function mergeInboundRows(
  bookings: BookingRow[],
  inquiries: ContactRow[],
  subscribers: SubscriberRow[],
): InboundThread[] {
  const bookingFingerprints = new Set(bookings.map((b) => b.fingerprint));
  const inquiriesDeduped = inquiries.filter(
    (i) => !(i.source === "booking" && bookingFingerprints.has(i.fingerprint)),
  );

  const threads: InboundThread[] = [
    ...bookings.map(mapBooking),
    ...inquiriesDeduped.map(mapContact),
    ...subscribers.map(mapSubscriber),
  ];

  threads.sort(
    (a, b) =>
      new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime(),
  );

  return threads;
}

export function filterInboundThreads(
  threads: InboundThread[],
  opts: { kind?: InboundFilterKind; search?: string },
): InboundThread[] {
  const kind = opts.kind ?? "all";
  const q = (opts.search ?? "").trim().toLowerCase();
  let out = threads;
  if (kind !== "all") {
    out = out.filter((t) => t.kind === kind);
  }
  if (q.length === 0) return out;
  return out.filter((t) => {
    const hay = [
      t.title,
      t.preview,
      t.email,
      t.listLabel,
      t.tag,
      t.secondary,
      t.message ?? "",
      t.notes ?? "",
      t.source ?? "",
    ]
      .join("\n")
      .toLowerCase();
    return hay.includes(q);
  });
}

export async function fetchInboundThreads(): Promise<InboundThread[]> {
  if (!db) return [];

  const [bookingRows, inquiryRows, subscriberRows] = await Promise.all([
    db.select().from(bookingRequests).orderBy(desc(bookingRequests.createdAt)),
    db.select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt)),
    db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt)),
  ]);

  return mergeInboundRows(bookingRows, inquiryRows, subscriberRows);
}

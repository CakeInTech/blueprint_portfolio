"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import { auditEvents, bookingRequests, meetings } from "@/lib/db/schema";
import { isCalendarEnabled, createCalendarEvent } from "@/lib/google/calendar";
import { sendVisitorEmail } from "@/lib/email/resend";

export type ConfirmBookingResult =
  | { ok: true; meetingId: string; meetLink: string | null }
  | { ok: false; error: string };

const idSchema = z.string().uuid();

export async function confirmBookingAction(
  bookingRequestId: string,
): Promise<ConfirmBookingResult> {
  const { email: adminEmail } = await requireAdmin();
  const parsedId = idSchema.parse(bookingRequestId);
  const db = getDb();

  const [booking] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, parsedId))
    .limit(1);

  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.confirmedMeetingId) {
    return { ok: false, error: "Already confirmed." };
  }

  // Parse requestedDay (YYYY-MM-DD) + requestedTime (HH:MM) into Date
  const [y, mo, d] = booking.requestedDay.split("-").map(Number);
  const [h, m] = booking.requestedTime.split(":").map(Number);
  const start = new Date(y!, mo! - 1, d!, h!, m!, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  let gcalEventId: string | undefined;
  let meetLink: string | null = null;

  if (isCalendarEnabled()) {
    try {
      const result = await createCalendarEvent({
        title: `Call with ${booking.email.split("@")[0]}`,
        who: booking.email,
        start,
        end,
        notes: booking.notes,
      });
      gcalEventId = result.eventId;
      meetLink = result.meetLink;
    } catch (err) {
      console.error("[confirmBooking] GCal error:", err);
      // non-fatal — proceed without meet link
    }
  }

  const now = new Date();

  const [created] = await db
    .insert(meetings)
    .values({
      title: `Call with ${booking.email.split("@")[0]}`,
      who: booking.email,
      kind: "INBOUND",
      status: "Confirmed",
      platform: meetLink ? "Google Meet" : "",
      link: meetLink ?? "",
      notes: booking.notes,
      startTime: start,
      endTime: end,
      gcalEventId: gcalEventId ?? null,
      gcalMeetLink: meetLink,
      bookingRequestId: parsedId,
      version: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: meetings.id });

  await db
    .update(bookingRequests)
    .set({
      status: "confirmed",
      confirmedMeetingId: created.id,
      gcalMeetLink: meetLink,
    })
    .where(eq(bookingRequests.id, parsedId));

  if (meetLink) {
    await sendVisitorEmail(booking.email, {
      subject: "Your call is confirmed",
      text: [
        `Hi ${booking.email.split("@")[0]},`,
        "",
        `Your call has been confirmed for ${booking.requestedDay} at ${booking.requestedTime}.`,
        "",
        `Join via Google Meet: ${meetLink}`,
        "",
        booking.notes ? `Notes: ${booking.notes}` : "",
        "",
        "Looking forward to speaking with you.",
      ]
        .filter((l) => l !== undefined)
        .join("\n"),
    });
  }

  await db.insert(auditEvents).values({
    actorEmail: adminEmail,
    action: "booking.confirm",
    entityType: "booking",
    entityId: parsedId,
    metadata: { meetingId: created.id, hasMeetLink: !!meetLink },
  });

  revalidatePath("/cms");
  return { ok: true, meetingId: created.id, meetLink };
}

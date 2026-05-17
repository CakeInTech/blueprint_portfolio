"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { eq, gte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  bookingRequests,
  contactInquiries,
  newsletterSubscribers,
} from "@/lib/db/schema";
import { sendOwnerEmail } from "@/lib/email/resend";
import { checkFormRateLimit } from "@/lib/rate-limit/forms";

export type FormState = {
  ok: boolean;
  message: string;
};

const initialSuccess = {
  ok: true,
  message: "Received. I will follow up from my inbox.",
};

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  website: z.string().max(0).optional(),
});

const bookingSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  day: z.string().trim().min(3).max(48),
  time: z.string().trim().min(2).max(16),
  notes: z.string().trim().max(1500).optional().default(""),
  website: z.string().max(0).optional(),
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  message: z.string().trim().min(5).max(2000),
  website: z.string().max(0).optional(),
});

function fingerprint(parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

async function requestIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown"
  );
}

async function ensureAllowed(kind: string, email: string) {
  const ip = await requestIp();
  const byIp = await checkFormRateLimit(`${kind}:ip:${ip}`);
  const byEmail = await checkFormRateLimit(`${kind}:email:${email}`);

  return byIp.success && byEmail.success;
}

export async function subscribeToDevlog(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = subscribeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: "Use a valid email address." };
  }

  const { email } = parsed.data;

  if (!(await ensureAllowed("subscribe", email))) {
    return { ok: false, message: "Too many attempts. Try again later." };
  }

  const hash = fingerprint(["subscribe", email]);
  let db: ReturnType<typeof getDb>;

  try {
    db = getDb();
  } catch {
    return {
      ok: false,
      message: "The inbox is not configured yet. Please email me directly.",
    };
  }

  await db
    .insert(newsletterSubscribers)
    .values({
      email,
      fingerprint: hash,
      emailStatus: "pending",
    })
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: {
        status: "subscribed",
        emailStatus: "pending",
      },
    });

  const emailResult = await sendOwnerEmail({
    subject: "New devlog subscriber",
    text: `New subscriber: ${email}`,
    replyTo: email,
  });

  await db
    .update(newsletterSubscribers)
    .set({ emailStatus: emailResult.ok ? "sent" : "failed" })
    .where(eq(newsletterSubscribers.email, email));

  return emailResult.ok
    ? { ok: true, message: "You are on the list." }
    : {
        ok: true,
        message: "You are on the list. Email notification will retry later.",
      };
}

export async function requestBooking(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Add a valid email, day, time, and a shorter note.",
    };
  }

  const { email, day, time, notes } = parsed.data;

  if (!(await ensureAllowed("booking", email))) {
    return { ok: false, message: "Too many attempts. Try again later." };
  }

  const hash = fingerprint(["booking", email, day, time, notes]);
  let db: ReturnType<typeof getDb>;

  try {
    db = getDb();
  } catch {
    return {
      ok: false,
      message: "Booking is not configured yet. Please email me directly.",
    };
  }

  try {
    await db
      .insert(bookingRequests)
      .values({
        email,
        requestedDay: day,
        requestedTime: time,
        notes,
        fingerprint: hash,
        emailStatus: "pending",
      })
      .onConflictDoNothing({
        target: bookingRequests.fingerprint,
      });

    await db
      .insert(contactInquiries)
      .values({
        email,
        message: notes || `Booking hold requested for ${day} at ${time}.`,
        source: "booking",
        fingerprint: hash,
        emailStatus: "pending",
        metadata: { day, time },
      })
      .onConflictDoNothing({
        target: contactInquiries.fingerprint,
      });
  } catch {
    return {
      ok: false,
      message: "Could not save booking. Please email me directly.",
    };
  }

  const emailResult = await sendOwnerEmail({
    subject: "New portfolio booking hold",
    text: [
      `Email: ${email}`,
      `Requested: ${day} at ${time}`,
      "",
      notes || "No notes provided.",
    ].join("\n"),
    replyTo: email,
  });

  try {
    await db
      .update(bookingRequests)
      .set({ emailStatus: emailResult.ok ? "sent" : "failed" })
      .where(eq(bookingRequests.fingerprint, hash));

    await db
      .update(contactInquiries)
      .set({ emailStatus: emailResult.ok ? "sent" : "failed" })
      .where(eq(contactInquiries.fingerprint, hash));
  } catch {
    // email status update is best-effort
  }

  return emailResult.ok
    ? initialSuccess
    : {
        ok: true,
        message: "Hold saved. Email notification will retry later.",
      };
}

export async function submitContactInquiry(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Add your name, a valid email, and a clear message.",
    };
  }

  const { name, email, message } = parsed.data;

  if (!(await ensureAllowed("contact", email))) {
    return { ok: false, message: "Too many attempts. Try again later." };
  }

  const hash = fingerprint(["contact", name, email, message]);
  let db: ReturnType<typeof getDb>;

  try {
    db = getDb();
  } catch {
    return {
      ok: false,
      message: "Contact is not configured yet. Please email me directly.",
    };
  }

  await db
    .insert(contactInquiries)
    .values({
      email,
      message,
      source: "contact",
      fingerprint: hash,
      emailStatus: "pending",
      metadata: { name },
    })
    .onConflictDoNothing({
      target: contactInquiries.fingerprint,
    });

  const emailResult = await sendOwnerEmail({
    subject: "New portfolio inquiry",
    text: [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
    replyTo: email,
  });

  await db
    .update(contactInquiries)
    .set({ emailStatus: emailResult.ok ? "sent" : "failed" })
    .where(eq(contactInquiries.fingerprint, hash));

  return emailResult.ok
    ? initialSuccess
    : {
        ok: true,
        message: "Inquiry saved. Email notification will retry later.",
      };
}

/**
 * Returns upcoming booked days as YYYY-MM-DD strings so the landing page
 * calendar can mark them as unavailable.
 */
export async function getBookedDaysAction(): Promise<string[]> {
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return [];
  }

  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const rows = await db
      .select({ day: bookingRequests.requestedDay })
      .from(bookingRequests)
      .where(gte(bookingRequests.requestedDay, isoToday));

    // Return only YYYY-MM-DD shaped values so old free-text entries are ignored
    return rows
      .map((r) => r.day)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  } catch {
    return [];
  }
}

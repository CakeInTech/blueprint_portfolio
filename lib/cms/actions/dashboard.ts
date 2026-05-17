"use server";

import { and, count, eq, gte, or } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/client";
import { bookingRequests, newsletterSubscribers } from "@/lib/db/schema";
import { fetchInboundThreads } from "@/lib/inbound/queries";
import type { InboundThread } from "@/lib/inbound/types";

export type UpcomingBookingSummary = {
  email: string;
  requestedDay: string;
  requestedTime: string;
  status: string;
};

export type DashboardSummary = {
  unreadCount: number;
  upcomingCount: number;
  subscriberCount: number;
  recentThreads: InboundThread[];
  upcomingBookings: UpcomingBookingSummary[];
};

export type DashboardSummaryResult =
  | { ok: true; configured: boolean; summary: DashboardSummary }
  | { ok: false; error: string };

export async function getDashboardSummaryAction(): Promise<DashboardSummaryResult> {
  await requireAdmin();

  let db;
  try {
    db = getDb();
  } catch {
    return { ok: false, error: "no_database" };
  }

  try {
    const threads = await fetchInboundThreads();
    const unreadCount = threads.filter((t) => t.unread).length;
    const recentThreads = threads.slice(0, 5);

    const todayStr = new Date().toISOString().split("T")[0] ?? "";

    const upcomingBookings = await db
      .select({
        email: bookingRequests.email,
        requestedDay: bookingRequests.requestedDay,
        requestedTime: bookingRequests.requestedTime,
        status: bookingRequests.status,
      })
      .from(bookingRequests)
      .where(
        and(
          gte(bookingRequests.requestedDay, todayStr),
          or(
            eq(bookingRequests.status, "hold_requested"),
            eq(bookingRequests.status, "confirmed"),
          ),
        ),
      )
      .limit(4);

    const [subResult] = await db
      .select({ count: count() })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "subscribed"));

    return {
      ok: true,
      configured: true,
      summary: {
        unreadCount,
        upcomingCount: upcomingBookings.length,
        subscriberCount: Number(subResult?.count ?? 0),
        recentThreads,
        upcomingBookings,
      },
    };
  } catch (e) {
    console.error("getDashboardSummaryAction failed", e);
    return { ok: false, error: "query_failed" };
  }
}

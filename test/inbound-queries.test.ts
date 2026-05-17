import { describe, expect, it } from "vitest";
import {
  filterInboundThreads,
  mergeInboundRows,
  type BookingRow,
  type ContactRow,
  type SubscriberRow,
} from "@/lib/inbound/queries";

const baseDate = new Date("2026-01-15T12:00:00.000Z");

function booking(over: Partial<BookingRow> = {}): BookingRow {
  return {
    id: "b1111111-1111-4111-8111-111111111111",
    email: "user@example.com",
    requestedDay: "Mon Jan 20",
    requestedTime: "14:00",
    notes: "Need sync",
    status: "hold_requested",
    emailStatus: "sent",
    fingerprint: "fp-booking-1",
    confirmedMeetingId: null,
    gcalMeetLink: null,
    createdAt: baseDate,
    ...over,
  };
}

function inquiry(over: Partial<ContactRow> = {}): ContactRow {
  return {
    id: "c1111111-1111-4111-8111-111111111111",
    email: "solo@example.com",
    message: "Hello\nSecond line",
    source: "contact",
    status: "new",
    emailStatus: "sent",
    fingerprint: "fp-contact-1",
    metadata: { name: "Solo Dev" },
    createdAt: new Date(baseDate.getTime() - 60_000),
    ...over,
  };
}

function subscriber(over: Partial<SubscriberRow> = {}): SubscriberRow {
  return {
    id: "s1111111-1111-4111-8111-111111111111",
    email: "sub@example.com",
    status: "subscribed",
    emailStatus: "sent",
    fingerprint: "fp-sub-1",
    createdAt: new Date(baseDate.getTime() + 60_000),
    ...over,
  };
}

describe("mergeInboundRows", () => {
  it("dedupes contact rows that mirror a booking by fingerprint", () => {
    const b = booking();
    const dup = inquiry({
      id: "c2222222-2222-4222-8222-222222222222",
      source: "booking",
      fingerprint: b.fingerprint,
      message: "Booking hold…",
    });
    const solo = inquiry();

    const threads = mergeInboundRows([b], [dup, solo], []);

    expect(threads.map((t) => t.kind)).toEqual(["booking", "contact"]);
    expect(threads.find((t) => t.kind === "contact")?.id).toBe(
      `contact:${solo.id}`,
    );
  });

  it("sorts by createdAt descending", () => {
    const early = inquiry({
      id: "c-early",
      fingerprint: "fp-a",
      createdAt: new Date("2026-01-10T00:00:00.000Z"),
    });
    const late = subscriber({
      id: "s-late",
      fingerprint: "fp-s",
      createdAt: new Date("2026-01-20T00:00:00.000Z"),
    });

    const threads = mergeInboundRows([], [early], [late]);
    expect(threads[0]!.kind).toBe("subscriber");
    expect(threads[1]!.kind).toBe("contact");
  });

  it("maps contact unread from status new", () => {
    const read = inquiry({ status: "read" });
    const unread = inquiry({
      id: "c-unread",
      fingerprint: "fp-u",
      status: "new",
    });
    const threads = mergeInboundRows([], [read, unread], []);
    const tRead = threads.find((t) => t.id === `contact:${read.id}`);
    const tNew = threads.find((t) => t.id === `contact:${unread.id}`);
    expect(tRead?.unread).toBe(false);
    expect(tNew?.unread).toBe(true);
  });
});

describe("filterInboundThreads", () => {
  const threads = mergeInboundRows(
    [booking({ id: "b1", fingerprint: "f1" })],
    [
      inquiry({
        id: "c1",
        fingerprint: "f2",
        message: "findme unique string xyz",
      }),
    ],
    [subscriber({ id: "s1", fingerprint: "f3", email: "news@example.com" })],
  );

  it("filters by kind", () => {
    const onlyBook = filterInboundThreads(threads, { kind: "booking" });
    expect(onlyBook).toHaveLength(1);
    expect(onlyBook[0]!.kind).toBe("booking");
  });

  it("filters by search substring", () => {
    const found = filterInboundThreads(threads, {
      kind: "all",
      search: "xyz",
    });
    expect(found).toHaveLength(1);
    expect(found[0]!.kind).toBe("contact");
  });
});

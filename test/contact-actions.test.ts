import { afterEach, describe, expect, it, vi } from "vitest";

type InsertChain = {
  values: ReturnType<typeof vi.fn>;
  onConflictDoNothing: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
};

function makeInsertChain() {
  const chain: InsertChain = {
    values: vi.fn(),
    onConflictDoNothing: vi.fn(),
    onConflictDoUpdate: vi.fn(),
  };

  chain.values.mockReturnValue(chain);
  chain.onConflictDoNothing.mockResolvedValue(undefined);
  chain.onConflictDoUpdate.mockResolvedValue(undefined);

  return chain;
}

function makeUpdateChain() {
  const chain = {
    set: vi.fn(),
    where: vi.fn(),
  };

  chain.set.mockReturnValue(chain);
  chain.where.mockResolvedValue(undefined);

  return chain;
}

function makeFormData(entries: [string, string][]) {
  const formData = new FormData();
  for (const [key, value] of entries) {
    formData.append(key, value);
  }
  return formData;
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("contact actions", () => {
  it("submits direct contact inquiry and marks sent", async () => {
    const insertChain = makeInsertChain();
    const updateChain = makeUpdateChain();
    const insert = vi.fn().mockReturnValue(insertChain);
    const update = vi.fn().mockReturnValue(updateChain);
    const sendOwnerEmail = vi.fn().mockResolvedValue({ ok: true });

    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => ({
        get: vi.fn((key: string) => (key === "x-forwarded-for" ? "203.0.113.10" : null)),
      })),
    }));
    vi.doMock("@/lib/rate-limit/forms", () => ({
      checkFormRateLimit: vi.fn().mockResolvedValue({ success: true }),
    }));
    vi.doMock("@/lib/db/client", () => ({
      getDb: vi.fn(() => ({ insert, update })),
    }));
    vi.doMock("@/lib/email/resend", () => ({ sendOwnerEmail }));

    const { submitContactInquiry } = await import("@/lib/contact/actions");
    const result = await submitContactInquiry(
      { ok: false, message: "" },
      makeFormData([
        ["name", "Jane Doe"],
        ["email", "jane@example.com"],
        ["message", "I want to discuss a civic tech project."],
        ["website", ""],
      ]),
    );

    expect(result).toEqual({
      ok: true,
      message: "Received. I will follow up from my inbox.",
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insertChain.onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(sendOwnerEmail).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(updateChain.where).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid direct contact payloads including honeypot", async () => {
    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => ({ get: vi.fn(() => null) })),
    }));
    vi.doMock("@/lib/rate-limit/forms", () => ({
      checkFormRateLimit: vi.fn().mockResolvedValue({ success: true }),
    }));
    vi.doMock("@/lib/db/client", () => ({
      getDb: vi.fn(() => {
        throw new Error("db should not be used");
      }),
    }));
    vi.doMock("@/lib/email/resend", () => ({
      sendOwnerEmail: vi.fn(),
    }));

    const { submitContactInquiry } = await import("@/lib/contact/actions");
    const result = await submitContactInquiry(
      { ok: false, message: "" },
      makeFormData([
        ["name", "J"],
        ["email", "not-an-email"],
        ["message", "Hi"],
        ["website", "spam"],
      ]),
    );

    expect(result).toEqual({
      ok: false,
      message: "Add your name, a valid email, and a clear message.",
    });
  });

  it("applies rate limits to direct contact", async () => {
    const checkFormRateLimit = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false });

    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => ({ get: vi.fn(() => "198.51.100.22") })),
    }));
    vi.doMock("@/lib/rate-limit/forms", () => ({ checkFormRateLimit }));
    vi.doMock("@/lib/db/client", () => ({
      getDb: vi.fn(() => {
        throw new Error("db should not be used when limited");
      }),
    }));
    vi.doMock("@/lib/email/resend", () => ({ sendOwnerEmail: vi.fn() }));

    const { submitContactInquiry } = await import("@/lib/contact/actions");
    const result = await submitContactInquiry(
      { ok: false, message: "" },
      makeFormData([
        ["name", "Jane Doe"],
        ["email", "jane@example.com"],
        ["message", "I want to discuss a civic tech project."],
        ["website", ""],
      ]),
    );

    expect(result).toEqual({
      ok: false,
      message: "Too many attempts. Try again later.",
    });
    expect(checkFormRateLimit).toHaveBeenCalledTimes(2);
  });

  it("keeps direct contact successful when owner email delivery fails", async () => {
    const insertChain = makeInsertChain();
    const updateChain = makeUpdateChain();
    const insert = vi.fn().mockReturnValue(insertChain);
    const update = vi.fn().mockReturnValue(updateChain);
    const sendOwnerEmail = vi.fn().mockResolvedValue({ ok: false });

    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => ({ get: vi.fn(() => "203.0.113.11") })),
    }));
    vi.doMock("@/lib/rate-limit/forms", () => ({
      checkFormRateLimit: vi.fn().mockResolvedValue({ success: true }),
    }));
    vi.doMock("@/lib/db/client", () => ({
      getDb: vi.fn(() => ({ insert, update })),
    }));
    vi.doMock("@/lib/email/resend", () => ({ sendOwnerEmail }));

    const { submitContactInquiry } = await import("@/lib/contact/actions");
    const result = await submitContactInquiry(
      { ok: false, message: "" },
      makeFormData([
        ["name", "Jane Doe"],
        ["email", "jane@example.com"],
        ["message", "Checking fallback behavior."],
        ["website", ""],
      ]),
    );

    expect(result).toEqual({
      ok: true,
      message: "Inquiry saved. Email notification will retry later.",
    });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("uses conflict-safe write path for duplicate direct contact submissions", async () => {
    const insertChain = makeInsertChain();
    const updateChain = makeUpdateChain();
    const insert = vi.fn().mockReturnValue(insertChain);
    const update = vi.fn().mockReturnValue(updateChain);

    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => ({ get: vi.fn(() => "203.0.113.12") })),
    }));
    vi.doMock("@/lib/rate-limit/forms", () => ({
      checkFormRateLimit: vi.fn().mockResolvedValue({ success: true }),
    }));
    vi.doMock("@/lib/db/client", () => ({
      getDb: vi.fn(() => ({ insert, update })),
    }));
    vi.doMock("@/lib/email/resend", () => ({
      sendOwnerEmail: vi.fn().mockResolvedValue({ ok: true }),
    }));

    const { submitContactInquiry } = await import("@/lib/contact/actions");
    await submitContactInquiry(
      { ok: false, message: "" },
      makeFormData([
        ["name", "Jane Doe"],
        ["email", "jane@example.com"],
        ["message", "Duplicate-safe insert."],
        ["website", ""],
      ]),
    );

    expect(insertChain.onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(insertChain.onConflictDoNothing).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.anything(),
      }),
    );
  });

  it("preserves booking/subscribe persisted-first contract", async () => {
    const insertChain = makeInsertChain();
    const updateChain = makeUpdateChain();
    const insert = vi.fn().mockReturnValue(insertChain);
    const update = vi.fn().mockReturnValue(updateChain);

    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => ({ get: vi.fn(() => "203.0.113.13") })),
    }));
    vi.doMock("@/lib/rate-limit/forms", () => ({
      checkFormRateLimit: vi.fn().mockResolvedValue({ success: true }),
    }));
    vi.doMock("@/lib/db/client", () => ({
      getDb: vi.fn(() => ({ insert, update })),
    }));
    vi.doMock("@/lib/email/resend", () => ({
      sendOwnerEmail: vi.fn().mockResolvedValue({ ok: false }),
    }));

    const { requestBooking, subscribeToDevlog } = await import("@/lib/contact/actions");

    const booking = await requestBooking(
      { ok: false, message: "" },
      makeFormData([
        ["email", "booker@example.com"],
        ["day", "MON MAY 12"],
        ["time", "09:00"],
        ["notes", "Talk roadmap."],
        ["website", ""],
      ]),
    );

    const subscribe = await subscribeToDevlog(
      { ok: false, message: "" },
      makeFormData([
        ["email", "reader@example.com"],
        ["website", ""],
      ]),
    );

    expect(booking).toEqual({
      ok: true,
      message: "Hold saved. Email notification will retry later.",
    });
    expect(subscribe).toEqual({
      ok: true,
      message: "You are on the list. Email notification will retry later.",
    });
    expect(insert).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });
});

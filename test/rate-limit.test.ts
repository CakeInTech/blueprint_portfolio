import { describe, expect, it, vi } from "vitest";

describe("form rate limiting", () => {
  it("allows submissions when Redis is not configured", async () => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { checkFormRateLimit } = await import("@/lib/rate-limit/forms");

    await expect(checkFormRateLimit("booking:test")).resolves.toMatchObject({
      success: true,
    });
  });
});

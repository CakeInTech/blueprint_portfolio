import { describe, expect, it, vi } from "vitest";

describe("portfolio content loader", () => {
  it("returns null (no mock fallback) when DATABASE_URL is absent", async () => {
    vi.resetModules();
    delete process.env.DATABASE_URL;

    const { getPortfolioContent } = await import("@/lib/content/loaders");

    await expect(getPortfolioContent()).resolves.toBeNull();
  });

  it("exposes blank scaffolding for the CMS editors", async () => {
    const { EMPTY_PROFILE, EMPTY_ABOUT } = await import("@/lib/content/loaders");

    expect(EMPTY_PROFILE.name).toBe("");
    expect(EMPTY_PROFILE.resumeUrl).toBeNull();
    expect(EMPTY_ABOUT.currently).toEqual([]);
  });
});

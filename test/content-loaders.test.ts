import { describe, expect, it, vi } from "vitest";
import { CIT_DATA } from "@/app/components/data";

describe("portfolio content loader", () => {
  it("falls back to seeded static content when DATABASE_URL is absent", async () => {
    vi.resetModules();
    delete process.env.DATABASE_URL;

    const { getPortfolioContent } = await import("@/lib/content/loaders");

    await expect(getPortfolioContent()).resolves.toEqual(CIT_DATA);
  });
});

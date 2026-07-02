import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APPEARANCE,
  INTEGRATION_REGISTRY,
} from "@/lib/cms/cms-settings-model";

async function loadSettingsModule() {
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.doMock("@/lib/auth/admin", () => ({
    requireAdmin: vi.fn(async () => ({
      email: "owner@example.com",
      session: null,
    })),
  }));
  return import("@/lib/cms/actions/settings");
}

describe("CMS system settings", () => {
  it("exposes a stable integration registry for UI and seed alignment", () => {
    const keys = INTEGRATION_REGISTRY.map((r) => r.key);
    expect(keys).toEqual([
      "google_calendar",
      "gmail_smtp",
      "railway",
      "plausible",
    ]);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it("returns defaults when database client is unavailable", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/client", () => ({
      db: null,
      getDb: () => {
        throw new Error("DATABASE_URL is required for this server operation.");
      },
    }));
    const { getCmsSystemSettings } = await loadSettingsModule();
    const s = await getCmsSystemSettings();
    expect(s.appearance).toEqual(DEFAULT_APPEARANCE);
    expect(s.integrations.map((i) => i.key)).toEqual(
      INTEGRATION_REGISTRY.map((r) => r.key),
    );
  });

  it("getCmsSystemSettings matches defaults when db throws", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/client", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => {
                throw new Error("connection refused");
              },
            }),
          }),
        }),
      },
      getDb: () => {
        throw new Error("no db");
      },
    }));
    const { getCmsSystemSettings } = await loadSettingsModule();
    const s = await getCmsSystemSettings();
    expect(s.appearance.theme).toBe(DEFAULT_APPEARANCE.theme);
    expect(s.integrations.length).toBe(INTEGRATION_REGISTRY.length);
  });
});

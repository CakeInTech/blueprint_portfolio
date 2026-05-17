import { describe, expect, it, vi } from "vitest";

describe("requireAdmin", () => {
  it("returns normalized admin email for allowed users", async () => {
    vi.resetModules();
    vi.doMock("@/auth", () => ({
      auth: async () => ({ user: { email: "Owner@Example.com" } }),
    }));
    vi.doMock("next/navigation", () => ({
      redirect: vi.fn(),
    }));

    const { requireAdmin } = await import("@/lib/auth/admin");
    const result = await requireAdmin();

    expect(result.email).toBe("owner@example.com");
  });

  it("redirects non-admin users", async () => {
    vi.resetModules();
    const redirect = vi.fn(() => {
      throw new Error("redirected");
    });

    vi.doMock("@/auth", () => ({
      auth: async () => ({ user: { email: "stranger@example.com" } }),
    }));
    vi.doMock("next/navigation", () => ({ redirect }));

    const { requireAdmin } = await import("@/lib/auth/admin");

    await expect(requireAdmin()).rejects.toThrow("redirected");
    expect(redirect).toHaveBeenCalledWith("/login?callbackUrl=/cms");
  });
});

describe("executeProtectedCmsMutation denial", () => {
  it("returns unauthorized result when admin guard fails", async () => {
    const { executeProtectedCmsMutation } = await import(
      "@/lib/cms/protected-mutation"
    );

    const result = await executeProtectedCmsMutation(
      {
        action: "cms.settings.update",
        entityType: "integration_settings",
        entityId: "main",
      },
      async () => ({ saved: true }),
      {
        requireAdmin: async () => {
          throw new Error("Unauthorized");
        },
        getDb: () =>
          ({
            transaction: async () => {
              throw new Error("should not run");
            },
          }) as never,
      },
    );

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "You are not authorized.",
    });
  });
});

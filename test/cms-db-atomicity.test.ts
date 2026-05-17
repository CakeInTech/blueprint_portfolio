import { describe, expect, it, vi } from "vitest";
import { executeProtectedCmsMutation } from "@/lib/cms/protected-mutation";
import { auditEvents } from "@/lib/db/schema";

describe("executeProtectedCmsMutation", () => {
  it("returns success when mutation and audit write succeed", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockImplementation((table) => {
      if (table === auditEvents) {
        return { values };
      }

      return { values: vi.fn().mockResolvedValue(undefined) };
    });
    const tx = { insert };
    const getDb = () => ({
      transaction: async (callback: (value: typeof tx) => Promise<unknown>) =>
        callback(tx),
    });

    const result = await executeProtectedCmsMutation(
      {
        action: "cms.settings.update",
        entityType: "integration_settings",
        entityId: "main",
      },
      async ({ actorEmail }) => ({ actorEmail, saved: true }),
      {
        requireAdmin: async () => ({ session: null, email: "owner@example.com" }),
        getDb,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      code: "OK",
      data: { actorEmail: "owner@example.com", saved: true },
    });
    expect(values).toHaveBeenCalledTimes(1);
  });

  it("maps transaction errors to db error result", async () => {
    const getDb = () => ({
      transaction: async () => {
        throw { code: "23505" };
      },
    });

    const result = await executeProtectedCmsMutation(
      {
        action: "cms.settings.update",
        entityType: "integration_settings",
        entityId: "main",
      },
      async () => ({ saved: true }),
      {
        requireAdmin: async () => ({ session: null, email: "owner@example.com" }),
        getDb,
      },
    );

    expect(result).toEqual({
      ok: false,
      code: "DB_ERROR",
      message: "Unable to save changes right now.",
    });
  });
});

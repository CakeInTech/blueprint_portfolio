import { describe, expect, it, vi } from "vitest";
import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { auditEvents } from "@/lib/db/schema";

describe("writeAuditEvent", () => {
  it("writes expected audit payload", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const db = { insert };

    await writeAuditEvent(db, {
      actorEmail: "owner@example.com",
      action: "cms.project.update",
      entityType: "project",
      entityId: "p-1",
      metadata: { section: "headline" },
    });

    expect(insert).toHaveBeenCalledWith(auditEvents);
    expect(values).toHaveBeenCalledWith({
      actorEmail: "owner@example.com",
      action: "cms.project.update",
      entityType: "project",
      entityId: "p-1",
      metadata: { section: "headline" },
    });
  });

  it("defaults metadata to an empty object", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const db = { insert };

    await writeAuditEvent(db, {
      actorEmail: "owner@example.com",
      action: "cms.project.update",
      entityType: "project",
      entityId: "p-1",
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} }),
    );
  });
});

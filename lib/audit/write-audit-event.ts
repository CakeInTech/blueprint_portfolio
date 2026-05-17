import { auditEvents } from "@/lib/db/schema";

type AuditDb = {
  insert: (table: typeof auditEvents) => {
    values: (value: {
      actorEmail: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    }) => Promise<unknown>;
  };
};

export type WriteAuditEventInput = {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEvent(db: AuditDb, input: WriteAuditEventInput) {
  const metadata = input.metadata ?? {};

  await db.insert(auditEvents).values({
    actorEmail: input.actorEmail,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata,
  });
}

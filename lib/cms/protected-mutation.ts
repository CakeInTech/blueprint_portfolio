import { writeAuditEvent, type WriteAuditEventInput } from "@/lib/audit/write-audit-event";
import {
  cmsMutationSuccess,
  normalizeMutationError,
  type CmsMutationResult,
} from "@/lib/cms/mutation-result";
import type { AuraDb } from "@/lib/db/client";

type TransactionDb = Parameters<Parameters<AuraDb["transaction"]>[0]>[0];

export type CmsMutationContext = {
  db: TransactionDb;
  actorEmail: string;
};

export type ExecuteProtectedCmsMutationOptions = {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  successMessage?: string;
};

type Deps = {
  requireAdmin: () => Promise<{ email: string }>;
  getDb: () => AuraDb;
};

async function getDefaultDeps(): Promise<Deps> {
  const [{ requireAdmin }, { getDb }] = await Promise.all([
    import("@/lib/auth/admin"),
    import("@/lib/db/client"),
  ]);

  return { requireAdmin, getDb };
}

export async function executeProtectedCmsMutation<TData>(
  options: ExecuteProtectedCmsMutationOptions,
  mutation: (context: CmsMutationContext) => Promise<TData>,
  deps?: Deps,
): Promise<CmsMutationResult<TData>> {
  try {
    const resolvedDeps = deps ?? (await getDefaultDeps());
    const { email: actorEmail } = await resolvedDeps.requireAdmin();
    const db = resolvedDeps.getDb();

    const data = await db.transaction(async (tx) => {
      const result = await mutation({ db: tx, actorEmail });

      const event: WriteAuditEventInput = {
        actorEmail,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        metadata: options.metadata,
      };

      await writeAuditEvent(tx, event);
      return result;
    });

    return cmsMutationSuccess(data, options.successMessage ?? "Saved.");
  } catch (error) {
    return normalizeMutationError(error);
  }
}

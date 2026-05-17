import { sql } from "drizzle-orm";
import { executeProtectedCmsMutation } from "@/lib/cms/protected-mutation";

export type CmsFoundationHealthData = {
  touchedAt: string;
  actorEmail: string;
};

export async function runCmsFoundationMutation() {
  return executeProtectedCmsMutation(
    {
      action: "cms.foundation.mutation.run",
      entityType: "cms_foundation",
      entityId: "bootstrap",
      successMessage: "CMS mutation foundation is operational.",
    },
    async ({ db, actorEmail }) => {
      await db.execute(sql`select 1`);
      return {
        touchedAt: new Date().toISOString(),
        actorEmail,
      } satisfies CmsFoundationHealthData;
    },
  );
}

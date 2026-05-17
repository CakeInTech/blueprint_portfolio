"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { normalizeHex6Accent } from "@/lib/cms/appearance-tokens";
import {
  DEFAULT_APPEARANCE,
  INTEGRATION_KEYS,
  INTEGRATION_REGISTRY,
  type CmsSystemSettings,
} from "@/lib/cms/cms-settings-model";
import { db, getDb } from "@/lib/db/client";
import {
  appearanceSettings,
  auditEvents,
  integrationSettings,
} from "@/lib/db/schema";

export type SettingsFormState = {
  ok: boolean;
  message: string;
};

export type {
  AppearanceDto,
  CmsSystemSettings,
  IntegrationRowDto,
} from "@/lib/cms/cms-settings-model";

export async function getCmsSystemSettings(): Promise<CmsSystemSettings> {
  if (!db) {
    return {
      appearance: { ...DEFAULT_APPEARANCE },
      integrations: INTEGRATION_REGISTRY.map((def) => ({
        key: def.key,
        label: def.label,
        enabled: def.defaultEnabled,
      })),
    };
  }

  try {
    const [appearanceRow] = await db
      .select()
      .from(appearanceSettings)
      .where(eq(appearanceSettings.id, "main"))
      .limit(1);

    const integrationRows = await db
      .select()
      .from(integrationSettings)
      .orderBy(asc(integrationSettings.key));

    const byKey = new Map(integrationRows.map((r) => [r.key, r]));

    return {
      appearance: appearanceRow
        ? {
            theme: appearanceRow.theme,
            accent: normalizeHex6Accent(appearanceRow.accent),
            borderStyle: appearanceRow.borderStyle,
            gridDensity: appearanceRow.gridDensity,
            slashDensity: appearanceRow.slashDensity,
          }
        : { ...DEFAULT_APPEARANCE },
      integrations: INTEGRATION_REGISTRY.map((def) => {
        const row = byKey.get(def.key);
        return {
          key: def.key,
          label: def.label,
          enabled: row?.enabled ?? def.defaultEnabled,
        };
      }),
    };
  } catch (error) {
    console.error("getCmsSystemSettings", error);
    return {
      appearance: { ...DEFAULT_APPEARANCE },
      integrations: INTEGRATION_REGISTRY.map((def) => ({
        key: def.key,
        label: def.label,
        enabled: def.defaultEnabled,
      })),
    };
  }
}

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "auto"]),
  accent: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Accent must be a #RRGGBB color."),
  borderStyle: z.enum(["hand", "dashed", "double", "solid"]),
  gridDensity: z.coerce.number().int().min(16).max(80),
  slashDensity: z.coerce.number().int().min(3).max(20),
});

export async function saveAppearanceSettings(
  input: z.infer<typeof appearanceSchema>,
): Promise<SettingsFormState> {
  const { email: actorEmail } = await requireAdmin();
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check theme, colors, and density sliders, then try again.",
    };
  }

  let database;
  try {
    database = getDb();
  } catch {
    return {
      ok: false,
      message: "Database is not configured (DATABASE_URL).",
    };
  }

  const a = parsed.data;
  const now = new Date();

  try {
    await database.transaction(async (tx) => {
      await tx
        .insert(appearanceSettings)
        .values({
          id: "main",
          theme: a.theme,
          accent: a.accent,
          borderStyle: a.borderStyle,
          gridDensity: a.gridDensity,
          slashDensity: a.slashDensity,
        })
        .onConflictDoUpdate({
          target: appearanceSettings.id,
          set: {
            theme: a.theme,
            accent: a.accent,
            borderStyle: a.borderStyle,
            gridDensity: a.gridDensity,
            slashDensity: a.slashDensity,
            version: sql`${appearanceSettings.version} + 1`,
            updatedAt: now,
          },
        });

      await tx.insert(auditEvents).values({
        actorEmail,
        action: "cms.appearance.publish",
        entityType: "appearance_settings",
        entityId: "main",
        metadata: {
          theme: a.theme,
          accent: a.accent,
          borderStyle: a.borderStyle,
          gridDensity: a.gridDensity,
          slashDensity: a.slashDensity,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/cms");

    return { ok: true, message: "Appearance saved to the live site." };
  } catch (error) {
    console.error("saveAppearanceSettings", error);
    return {
      ok: false,
      message: "Could not save appearance. Try again or check the server logs.",
    };
  }
}

export async function updateIntegrationSetting(
  key: string,
  enabled: boolean,
): Promise<SettingsFormState> {
  const { email: actorEmail } = await requireAdmin();

  if (!INTEGRATION_KEYS.has(key)) {
    return { ok: false, message: "Unknown integration." };
  }

  let database;
  try {
    database = getDb();
  } catch {
    return {
      ok: false,
      message: "Database is not configured (DATABASE_URL).",
    };
  }

  const now = new Date();

  try {
    await database.transaction(async (tx) => {
      await tx
        .insert(integrationSettings)
        .values({
          key,
          enabled,
          metadata: {},
        })
        .onConflictDoUpdate({
          target: integrationSettings.key,
          set: {
            enabled,
            version: sql`${integrationSettings.version} + 1`,
            updatedAt: now,
          },
        });

      await tx.insert(auditEvents).values({
        actorEmail,
        action: "cms.integration.update",
        entityType: "integration_settings",
        entityId: key,
        metadata: { enabled },
      });
    });

    revalidatePath("/");
    revalidatePath("/cms");

    return { ok: true, message: "Integration updated." };
  } catch (error) {
    console.error("updateIntegrationSetting", error);
    return {
      ok: false,
      message: "Could not update integration. Try again or check the server logs.",
    };
  }
}

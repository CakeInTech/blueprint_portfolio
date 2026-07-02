"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { normalizeHex6Accent } from "@/lib/cms/appearance-tokens";
import {
  DEFAULT_APPEARANCE,
  DEFAULT_AVAILABILITY,
  DEFAULT_SITE_SETTINGS,
  INTEGRATION_KEYS,
  INTEGRATION_REGISTRY,
  type CmsSystemSettings,
  type IntegrationRowDto,
  type SiteSettingsDto,
} from "@/lib/cms/cms-settings-model";
import { db, getDb } from "@/lib/db/client";
import {
  appearanceSettings,
  auditEvents,
  integrationSettings,
  siteSettings,
  type WeeklyAvailability,
} from "@/lib/db/schema";
import { isCalendarEnabled } from "@/lib/google/calendar";

export type SettingsFormState = {
  ok: boolean;
  message: string;
};

export type {
  AppearanceDto,
  CmsSystemSettings,
  IntegrationRowDto,
  SiteSettingsDto,
} from "@/lib/cms/cms-settings-model";

/** Server-side env presence per integration — never exposes secret values. */
function integrationEnvStatus(key: string): { configured: boolean; detail: string } {
  switch (key) {
    case "google_calendar": {
      if (isCalendarEnabled()) {
        return { configured: true, detail: "Service account + calendar ID detected" };
      }
      const missing = [
        process.env.GOOGLE_CALENDAR_ENABLED === "true" ? null : "GOOGLE_CALENDAR_ENABLED=true",
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ? null : "GOOGLE_SERVICE_ACCOUNT_JSON_B64",
        process.env.GOOGLE_CALENDAR_ID ? null : "GOOGLE_CALENDAR_ID",
      ].filter(Boolean);
      return { configured: false, detail: `Missing env: ${missing.join(", ")}` };
    }
    case "gmail_smtp": {
      const missing = [
        process.env.RESEND_API_KEY ? null : "RESEND_API_KEY",
        process.env.EMAIL_FROM ? null : "EMAIL_FROM",
        process.env.CONTACT_TO_EMAIL ? null : "CONTACT_TO_EMAIL",
      ].filter(Boolean);
      if (missing.length === 0) {
        return {
          configured: true,
          detail: `Delivering to ${process.env.CONTACT_TO_EMAIL}`,
        };
      }
      return { configured: false, detail: `Missing env: ${missing.join(", ")}` };
    }
    case "railway": {
      const onRailway = !!(
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_PROJECT_ID ||
        process.env.RAILWAY_STATIC_URL
      );
      return onRailway
        ? { configured: true, detail: "Running on Railway" }
        : { configured: false, detail: "railway.json present — deploys via Railway CLI/GitHub" };
    }
    case "plausible": {
      return {
        configured: !!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
        detail: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
          ? `Tracking ${process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}`
          : "Set the site domain to link the dashboard",
      };
    }
    default:
      return { configured: false, detail: "" };
  }
}

function defaultIntegrations(): IntegrationRowDto[] {
  return INTEGRATION_REGISTRY.map((def) => ({
    key: def.key,
    label: def.label,
    enabled: def.defaultEnabled,
    metadata: {},
    ...integrationEnvStatus(def.key),
  }));
}

function normalizeAvailability(raw: unknown): WeeklyAvailability {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_AVAILABILITY };
  const out = { ...DEFAULT_AVAILABILITY };
  for (const day of Object.keys(out) as (keyof WeeklyAvailability)[]) {
    const d = (raw as Record<string, unknown>)[day];
    if (d && typeof d === "object") {
      const { enabled, start, end } = d as Record<string, unknown>;
      out[day] = {
        enabled: typeof enabled === "boolean" ? enabled : out[day].enabled,
        start: typeof start === "string" ? start : out[day].start,
        end: typeof end === "string" ? end : out[day].end,
      };
    }
  }
  return out;
}

export async function getCmsSystemSettings(): Promise<CmsSystemSettings> {
  if (!db) {
    return {
      appearance: { ...DEFAULT_APPEARANCE },
      integrations: defaultIntegrations(),
      site: { ...DEFAULT_SITE_SETTINGS },
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

    const [siteRow] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, "main"))
      .limit(1);

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
        const metadata: Record<string, string> = {};
        if (row?.metadata && typeof row.metadata === "object") {
          for (const [k, v] of Object.entries(row.metadata)) {
            if (typeof v === "string") metadata[k] = v;
          }
        }
        return {
          key: def.key,
          label: def.label,
          enabled: row?.enabled ?? def.defaultEnabled,
          metadata,
          ...integrationEnvStatus(def.key),
        };
      }),
      site: siteRow
        ? {
            primaryDomain: siteRow.primaryDomain,
            aliases: siteRow.aliases,
            availability: normalizeAvailability(siteRow.availability),
          }
        : { ...DEFAULT_SITE_SETTINGS },
    };
  } catch (error) {
    console.error("getCmsSystemSettings", error);
    return {
      appearance: { ...DEFAULT_APPEARANCE },
      integrations: defaultIntegrations(),
      site: { ...DEFAULT_SITE_SETTINGS },
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

    revalidatePath("/", "layout");
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

const availabilityDaySchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const siteSettingsSchema = z.object({
  primaryDomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Use a bare domain like cakeintech.com"),
  aliases: z.string().trim().max(400),
  availability: z.object({
    mon: availabilityDaySchema,
    tue: availabilityDaySchema,
    wed: availabilityDaySchema,
    thu: availabilityDaySchema,
    fri: availabilityDaySchema,
    sat: availabilityDaySchema,
    sun: availabilityDaySchema,
  }),
});

export async function saveSiteSettings(
  input: SiteSettingsDto,
): Promise<SettingsFormState> {
  const { email: actorEmail } = await requireAdmin();
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "Check the domain and availability hours, then try again.",
    };
  }

  let database;
  try {
    database = getDb();
  } catch {
    return { ok: false, message: "Database is not configured (DATABASE_URL)." };
  }

  const s = parsed.data;
  const now = new Date();

  try {
    await database.transaction(async (tx) => {
      await tx
        .insert(siteSettings)
        .values({
          id: "main",
          primaryDomain: s.primaryDomain,
          aliases: s.aliases,
          availability: s.availability,
        })
        .onConflictDoUpdate({
          target: siteSettings.id,
          set: {
            primaryDomain: s.primaryDomain,
            aliases: s.aliases,
            availability: s.availability,
            version: sql`${siteSettings.version} + 1`,
            updatedAt: now,
          },
        });

      await tx.insert(auditEvents).values({
        actorEmail,
        action: "cms.site_settings.save",
        entityType: "site_settings",
        entityId: "main",
        metadata: { primaryDomain: s.primaryDomain },
      });
    });

    revalidatePath("/", "layout");
    revalidatePath("/cms");

    return { ok: true, message: "Site settings saved." };
  } catch (error) {
    console.error("saveSiteSettings", error);
    return {
      ok: false,
      message: "Could not save site settings. Try again or check the server logs.",
    };
  }
}

const availabilityOnlySchema = z.object({
  mon: availabilityDaySchema,
  tue: availabilityDaySchema,
  wed: availabilityDaySchema,
  thu: availabilityDaySchema,
  fri: availabilityDaySchema,
  sat: availabilityDaySchema,
  sun: availabilityDaySchema,
});

/** Saves weekly availability without touching domain settings. */
export async function saveAvailabilitySettings(
  input: WeeklyAvailability,
): Promise<SettingsFormState> {
  const { email: actorEmail } = await requireAdmin();
  const parsed = availabilityOnlySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Hours must be HH:MM (24h). Check each day." };
  }

  for (const [day, cfg] of Object.entries(parsed.data)) {
    if (cfg.enabled && cfg.start >= cfg.end) {
      return { ok: false, message: `${day.toUpperCase()}: start must be before end.` };
    }
  }

  let database;
  try {
    database = getDb();
  } catch {
    return { ok: false, message: "Database is not configured (DATABASE_URL)." };
  }

  const now = new Date();

  try {
    await database.transaction(async (tx) => {
      await tx
        .insert(siteSettings)
        .values({ id: "main", availability: parsed.data })
        .onConflictDoUpdate({
          target: siteSettings.id,
          set: {
            availability: parsed.data,
            version: sql`${siteSettings.version} + 1`,
            updatedAt: now,
          },
        });

      await tx.insert(auditEvents).values({
        actorEmail,
        action: "cms.availability.save",
        entityType: "site_settings",
        entityId: "main",
        metadata: {},
      });
    });

    revalidatePath("/", "layout");
    revalidatePath("/cms");

    return { ok: true, message: "Availability hours saved — booking slots updated." };
  } catch (error) {
    console.error("saveAvailabilitySettings", error);
    return { ok: false, message: "Could not save availability. Try again." };
  }
}

const integrationMetadataSchema = z.record(
  z.string().max(64),
  z.string().trim().max(500),
);

export async function updateIntegrationSetting(
  key: string,
  enabled: boolean,
  metadata?: Record<string, string>,
): Promise<SettingsFormState> {
  const { email: actorEmail } = await requireAdmin();

  if (!INTEGRATION_KEYS.has(key)) {
    return { ok: false, message: "Unknown integration." };
  }

  let parsedMetadata: Record<string, string> | undefined;
  if (metadata !== undefined) {
    const parsed = integrationMetadataSchema.safeParse(metadata);
    if (!parsed.success) {
      return { ok: false, message: "Integration config values are too long." };
    }
    parsedMetadata = parsed.data;
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
          metadata: parsedMetadata ?? {},
        })
        .onConflictDoUpdate({
          target: integrationSettings.key,
          set: {
            enabled,
            ...(parsedMetadata !== undefined ? { metadata: parsedMetadata } : {}),
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

    revalidatePath("/", "layout");
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

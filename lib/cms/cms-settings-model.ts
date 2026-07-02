/** Shared CMS settings types and defaults (not a `"use server"` module). */

import type { WeeklyAvailability } from "@/lib/db/schema";

export type AppearanceDto = {
  theme: string;
  accent: string;
  borderStyle: string;
  gridDensity: number;
  slashDensity: number;
};

export type IntegrationRowDto = {
  key: string;
  label: string;
  enabled: boolean;
  /** True when the server-side env for this integration is present. */
  configured: boolean;
  /** Human-readable status detail ("Service account + calendar ID set", "RESEND_API_KEY missing", …). */
  detail: string;
  /** Non-secret per-integration config editable from the CMS. */
  metadata: Record<string, string>;
};

export type SiteSettingsDto = {
  primaryDomain: string;
  aliases: string;
  availability: WeeklyAvailability;
};

export type CmsSystemSettings = {
  appearance: AppearanceDto;
  integrations: IntegrationRowDto[];
  site: SiteSettingsDto;
};

export type IntegrationConfigField = {
  key: string;
  label: string;
  placeholder: string;
};

/** Display order, defaults, and CMS-editable (non-secret) config fields. */
export const INTEGRATION_REGISTRY: {
  key: string;
  label: string;
  defaultEnabled: boolean;
  /** What the toggle controls / where secrets live. */
  hint: string;
  fields: IntegrationConfigField[];
}[] = [
  {
    key: "google_calendar",
    label: "Google Calendar",
    defaultEnabled: true,
    hint: "Creates Meet events for confirmed bookings. Secrets: GOOGLE_SERVICE_ACCOUNT_JSON_B64, GOOGLE_CALENDAR_ID, GOOGLE_CALENDAR_ENABLED=true in the environment.",
    fields: [
      {
        key: "calendarLabel",
        label: "Calendar name",
        placeholder: "cakeintech bookings",
      },
    ],
  },
  {
    key: "gmail_smtp",
    label: "Email delivery (Resend / Gmail SMTP)",
    defaultEnabled: true,
    hint: "Owner + visitor email. Secrets: RESEND_API_KEY, EMAIL_FROM, CONTACT_TO_EMAIL in the environment.",
    fields: [
      {
        key: "notifyTo",
        label: "Notify address",
        placeholder: "Mohamed@breviswork.com",
      },
    ],
  },
  {
    key: "railway",
    label: "Railway deployment",
    defaultEnabled: true,
    hint: "Deployment target (railway.json). Set project + service in Railway dashboard; this stores the reference.",
    fields: [
      {
        key: "projectUrl",
        label: "Project URL",
        placeholder: "https://railway.app/project/…",
      },
    ],
  },
  {
    key: "plausible",
    label: "Plausible Analytics",
    defaultEnabled: false,
    hint: "Privacy-friendly analytics. Set the site domain; the dashboard link appears in Analytics.",
    fields: [
      {
        key: "domain",
        label: "Site domain",
        placeholder: "cakeintech.com",
      },
    ],
  },
];

export const INTEGRATION_KEYS = new Set(
  INTEGRATION_REGISTRY.map((r) => r.key),
);

export const DEFAULT_APPEARANCE: AppearanceDto = {
  theme: "light",
  accent: "#d4ff3d",
  borderStyle: "dashed",
  gridDensity: 32,
  slashDensity: 7,
};

export const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  mon: { enabled: true, start: "09:00", end: "17:00" },
  tue: { enabled: true, start: "09:00", end: "17:00" },
  wed: { enabled: true, start: "09:00", end: "17:00" },
  thu: { enabled: true, start: "09:00", end: "17:00" },
  fri: { enabled: true, start: "09:00", end: "17:00" },
  sat: { enabled: false, start: "09:00", end: "17:00" },
  sun: { enabled: false, start: "09:00", end: "17:00" },
};

export const DEFAULT_SITE_SETTINGS: SiteSettingsDto = {
  primaryDomain: "cakeintech.com",
  aliases: "",
  availability: DEFAULT_AVAILABILITY,
};

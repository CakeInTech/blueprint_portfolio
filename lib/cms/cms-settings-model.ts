/** Shared CMS settings types and defaults (not a `"use server"` module). */

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
};

export type CmsSystemSettings = {
  appearance: AppearanceDto;
  integrations: IntegrationRowDto[];
};

/** Display order and defaults when no DB row exists yet. */
export const INTEGRATION_REGISTRY: {
  key: string;
  label: string;
  defaultEnabled: boolean;
}[] = [
  { key: "google_calendar", label: "Google Calendar", defaultEnabled: true },
  { key: "gmail_smtp", label: "Gmail SMTP", defaultEnabled: true },
  { key: "vercel", label: "Vercel", defaultEnabled: true },
  { key: "plausible", label: "Plausible Analytics", defaultEnabled: true },
  { key: "zapier", label: "Zapier", defaultEnabled: false },
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

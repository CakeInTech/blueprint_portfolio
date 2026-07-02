"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/app/components/blueprint";
import type {
  AppearanceDto,
  IntegrationRowDto,
  SiteSettingsDto,
} from "@/lib/cms/cms-settings-model";
import { INTEGRATION_REGISTRY } from "@/lib/cms/cms-settings-model";
import {
  saveAppearanceSettings,
  saveSiteSettings,
  updateIntegrationSetting,
} from "@/lib/cms/actions/settings";
import {
  accentInkForAccent,
  cssBorderStyleFromCms,
  normalizeHex6Accent,
} from "@/lib/cms/appearance-tokens";
import type { WeeklyAvailability } from "@/lib/db/schema";
import { Card, Field, PageHead } from "../shell";

/* Theme palettes mirror :root / [data-theme="dark"] in globals.css so the
   preview shows exactly what the live site will paint. */
const PREVIEW_THEMES = {
  light: {
    bg: "#ece6d6",
    ink: "#14110a",
    ink3: "#5b5240",
    ruleSoft: "rgba(20,17,10,0.35)",
  },
  dark: {
    bg: "#0a0d11",
    ink: "#e8e4d9",
    ink3: "#8a8270",
    ruleSoft: "rgba(232,228,217,0.32)",
  },
} as const;

const ACCENT_PRESETS = ["#d4ff3d", "#ff7a45", "#4fc3f7", "#7cff6b", "#ffd54a"];

/* ===== Appearance ===== */
export function Appearance({ initial }: { initial: AppearanceDto }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const [accent, setAccent] = useState(initial.accent);
  const [borderStyle, setBs] = useState(initial.borderStyle);
  const [theme, setTheme] = useState(initial.theme);
  const [grid, setGrid] = useState(initial.gridDensity);
  const [slash, setSlash] = useState(initial.slashDensity);

  useEffect(() => {
    setAccent(initial.accent);
    setBs(initial.borderStyle);
    setTheme(initial.theme);
    setGrid(initial.gridDensity);
    setSlash(initial.slashDensity);
  }, [
    initial.accent,
    initial.borderStyle,
    initial.theme,
    initial.gridDensity,
    initial.slashDensity,
  ]);

  function applyToLiveSite() {
    setBanner(null);
    startTransition(async () => {
      const res = await saveAppearanceSettings({
        theme: theme as "light" | "dark" | "auto",
        accent: normalizeHex6Accent(accent),
        borderStyle: borderStyle as "hand" | "dashed" | "double" | "solid",
        gridDensity: grid,
        slashDensity: slash,
      });
      setBanner({ ok: res.ok, text: res.message });
      if (res.ok) {
        router.refresh();
      }
    });
  }

  /* Preview derives everything exactly like the live site does. */
  const previewTheme =
    theme === "dark" ? PREVIEW_THEMES.dark : PREVIEW_THEMES.light;
  const normalizedAccent = normalizeHex6Accent(accent);
  const accentInk = accentInkForAccent(normalizedAccent);
  const cssBorder = cssBorderStyleFromCms(borderStyle);

  return (
    <div>
      <PageHead
        code="20"
        sub="SYSTEM — APPEARANCE"
        title="Site appearance"
        action={
          <button
            type="button"
            className="btn primary"
            style={{ height: 36 }}
            disabled={pending}
            onClick={applyToLiveSite}
          >
            {pending ? "SAVING…" : "APPLY TO LIVE SITE"}
          </button>
        }
      />
      {banner ? (
        <p
          style={{
            fontSize: 12,
            marginBottom: 12,
            color: banner.ok ? "var(--ink-2)" : "var(--danger)",
          }}
        >
          {banner.text}
        </p>
      ) : null}
      <div className="cms-grid-2">
        <Card label="20.A — TOKENS">
          <Field label="Theme" hint="AUTO follows the visitor's system">
            <div style={{ display: "flex", gap: 6 }}>
              {["light", "dark", "auto"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTheme(m)}
                  className="btn"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    background:
                      theme === m ? "var(--ink)" : "transparent",
                    color: theme === m ? "var(--bg)" : "var(--ink)",
                  }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
          <div style={{ height: 14 }} />
          <Field label="Accent" hint="highlights, chips, CTAs, selection">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Accent ${c}`}
                  onClick={() => setAccent(c)}
                  style={{
                    width: 48,
                    height: 36,
                    background: c,
                    border:
                      normalizedAccent === c
                        ? "2px solid var(--ink)"
                        : "1px dashed var(--rule)",
                    cursor: "pointer",
                  }}
                />
              ))}
              <label
                title="Custom accent color"
                style={{
                  width: 48,
                  height: 36,
                  border: "1px dashed var(--rule)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  position: "relative",
                  fontSize: 14,
                  background: ACCENT_PRESETS.includes(normalizedAccent)
                    ? "transparent"
                    : normalizedAccent,
                }}
              >
                <span style={{ mixBlendMode: "difference", color: "#fff" }}>✎</span>
                <input
                  type="color"
                  value={normalizedAccent}
                  onChange={(e) => setAccent(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />
              </label>
              <span className="num" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {normalizedAccent.toUpperCase()}
              </span>
            </div>
          </Field>
          <div style={{ height: 14 }} />
          <Field label="Border style" hint="buttons, fields, frames">
            <div style={{ display: "flex", gap: 6 }}>
              {["hand", "dashed", "double", "solid"].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBs(b)}
                  className="btn"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    background:
                      borderStyle === b ? "var(--ink)" : "transparent",
                    color: borderStyle === b ? "var(--bg)" : "var(--ink)",
                  }}
                >
                  {b.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
          <div style={{ height: 14 }} />
          <Field label={`Grid density · ${grid}px`} hint="blueprint background grid">
            <input
              type="range"
              min={16}
              max={80}
              value={grid}
              onChange={(e) => setGrid(+e.target.value)}
              style={{ width: "100%", accentColor: "var(--ink)" }}
            />
          </Field>
          <Field label={`Slash density · ${slash}px`} hint="hatch fill spacing">
            <input
              type="range"
              min={3}
              max={20}
              value={slash}
              onChange={(e) => setSlash(+e.target.value)}
              style={{ width: "100%", accentColor: "var(--ink)" }}
            />
          </Field>
        </Card>

        <Card label="20.B — PREVIEW" spec={theme === "auto" ? "AUTO → LIGHT SHOWN" : "LIVE"}>
          <div
            style={{
              position: "relative",
              minHeight: 360,
              border: `1.25px ${cssBorder} ${previewTheme.ink}`,
              padding: 20,
              background: previewTheme.bg,
              color: previewTheme.ink,
              overflow: "hidden",
            }}
          >
            {/* Blueprint grid at the exact density */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.5,
                backgroundImage: `linear-gradient(to right, ${previewTheme.ruleSoft} 1px, transparent 1px), linear-gradient(to bottom, ${previewTheme.ruleSoft} 1px, transparent 1px)`,
                backgroundSize: `${grid}px ${grid}px`,
              }}
            />
            <div style={{ position: "relative" }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: previewTheme.ink3,
                }}
              >
                PREVIEW · HERO BLOCK
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  marginTop: 12,
                }}
              >
                Mohamed Abdulhakim
              </div>
              <p style={{ fontSize: 12.5, opacity: 0.7, maxWidth: 340 }}>
                Fullstack engineer —{" "}
                <span
                  style={{
                    background: normalizedAccent,
                    color: accentInk,
                    padding: "0 4px",
                  }}
                >
                  accent highlight
                </span>{" "}
                exactly as it renders live.
              </p>
              <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    background: previewTheme.ink,
                    color: previewTheme.bg,
                    fontSize: 12,
                    border: `1.25px ${cssBorder} ${previewTheme.ink}`,
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, background: normalizedAccent }}
                  />
                  BOOK A CALL →
                </span>
                <span
                  style={{
                    padding: "10px 18px",
                    border: `1.25px ${cssBorder} ${previewTheme.ink}`,
                    fontSize: 12,
                    backgroundImage: `repeating-linear-gradient(-45deg, ${previewTheme.ruleSoft} 0, ${previewTheme.ruleSoft} 1px, transparent 1px, transparent ${slash}px)`,
                  }}
                >
                  SEE WORK ↓
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "10px 18px",
                    background: normalizedAccent,
                    color: accentInk,
                    fontSize: 12,
                    border: `1.25px ${cssBorder} ${previewTheme.ink}`,
                  }}
                >
                  ACCENT CTA
                </span>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 22,
                    padding: "0 8px",
                    fontSize: 11,
                    border: `1px ${cssBorder} ${previewTheme.ink}`,
                  }}
                >
                  @cakeintech
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 22,
                    padding: "0 8px",
                    fontSize: 11,
                    border: `1px ${cssBorder} ${previewTheme.ink}`,
                    background: normalizedAccent,
                    color: accentInk,
                  }}
                >
                  ACCENT CHIP
                </span>
              </div>
              {borderStyle === "hand" && (
                <p style={{ fontSize: 10.5, marginTop: 16, color: previewTheme.ink3 }}>
                  HAND frames render as sketched SVG strokes on the live site
                  (dashed shown here).
                </p>
              )}
              {theme === "auto" && (
                <p style={{ fontSize: 10.5, marginTop: 8, color: previewTheme.ink3 }}>
                  AUTO follows each visitor&apos;s system light/dark preference.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ===== Settings ===== */
export function Settings({
  integrations,
  site,
}: {
  integrations: IntegrationRowDto[];
  site: SiteSettingsDto;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(integrations);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const [primaryDomain, setPrimaryDomain] = useState(site.primaryDomain);
  const [aliases, setAliases] = useState(site.aliases);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftMeta, setDraftMeta] = useState<Record<string, string>>({});

  useEffect(() => {
    setRows(integrations);
  }, [integrations]);

  useEffect(() => {
    setPrimaryDomain(site.primaryDomain);
    setAliases(site.aliases);
  }, [site.primaryDomain, site.aliases]);

  function saveDomain() {
    setBanner(null);
    startTransition(async () => {
      const res = await saveSiteSettings({
        primaryDomain,
        aliases,
        availability: site.availability as WeeklyAvailability,
      });
      setBanner({ ok: res.ok, text: res.message });
      if (res.ok) router.refresh();
    });
  }

  function toggleRow(row: IntegrationRowDto) {
    setBanner(null);
    startTransition(async () => {
      const res = await updateIntegrationSetting(row.key, !row.enabled);
      setBanner({ ok: res.ok, text: res.message });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.key === row.key ? { ...r, enabled: !row.enabled } : r,
          ),
        );
        router.refresh();
      }
    });
  }

  function openConfig(row: IntegrationRowDto) {
    setExpanded((cur) => (cur === row.key ? null : row.key));
    setDraftMeta({ ...row.metadata });
  }

  function saveConfig(row: IntegrationRowDto) {
    setBanner(null);
    startTransition(async () => {
      const res = await updateIntegrationSetting(row.key, row.enabled, draftMeta);
      setBanner({ ok: res.ok, text: res.message });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.key === row.key ? { ...r, metadata: { ...draftMeta } } : r,
          ),
        );
        setExpanded(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <PageHead code="21" sub="SYSTEM — SETTINGS" title="Settings" />
      {banner ? (
        <p
          style={{
            fontSize: 12,
            marginBottom: 12,
            color: banner.ok ? "var(--ink-2)" : "var(--danger)",
          }}
        >
          {banner.text}
        </p>
      ) : null}
      <div className="cms-grid-2">
        <Card label="21.A — DOMAIN">
          <Field label="Primary domain" hint="canonical host for the live site">
            <input
              className="fld"
              value={primaryDomain}
              placeholder="cakeintech.com"
              onChange={(e) => setPrimaryDomain(e.target.value)}
            />
          </Field>
          <div style={{ height: 14 }} />
          <Field label="Aliases" hint="comma-separated, redirect to primary">
            <input
              className="fld"
              value={aliases}
              placeholder="www.cakeintech.com"
              onChange={(e) => setAliases(e.target.value)}
            />
          </Field>
          <div style={{ height: 16 }} />
          <button
            type="button"
            className="btn primary"
            style={{ height: 34 }}
            disabled={pending}
            onClick={saveDomain}
          >
            {pending ? "SAVING…" : "SAVE DOMAIN"}
          </button>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 14, lineHeight: 1.5 }}>
            Point DNS for <b>{primaryDomain || "cakeintech.com"}</b> at your
            Railway service, then add it as a custom domain in Railway →
            Settings → Networking.
          </p>
        </Card>

        <Card label="21.B — INTEGRATIONS" pad={0}>
          {rows.map((row) => {
            const def = INTEGRATION_REGISTRY.find((d) => d.key === row.key);
            const isOpen = expanded === row.key;
            return (
              <div
                key={row.key}
                style={{ borderBottom: "1px dashed var(--rule-soft)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 18px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 13 }}>{row.label}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 }}>
                      {row.detail}
                    </div>
                  </div>
                  <Chip accent={row.enabled && row.configured}>
                    {!row.enabled
                      ? "OFF"
                      : row.configured
                        ? "ACTIVE"
                        : "ENABLED · ENV MISSING"}
                  </Chip>
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 26, padding: "0 10px", fontSize: 10 }}
                    disabled={pending}
                    onClick={() => openConfig(row)}
                  >
                    {isOpen ? "CLOSE" : "CONFIGURE"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ height: 26, padding: "0 10px", fontSize: 10 }}
                    disabled={pending}
                    onClick={() => toggleRow(row)}
                  >
                    {row.enabled ? "DISABLE" : "ENABLE"}
                  </button>
                </div>
                {isOpen && def && (
                  <div
                    style={{
                      padding: "4px 18px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      background: "var(--paper-tint)",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "var(--ink-3)", margin: 0, lineHeight: 1.5 }}>
                      {def.hint}
                    </p>
                    {def.fields.map((f) => (
                      <Field key={f.key} label={f.label}>
                        <input
                          className="fld"
                          value={draftMeta[f.key] ?? ""}
                          placeholder={f.placeholder}
                          onChange={(e) =>
                            setDraftMeta((m) => ({ ...m, [f.key]: e.target.value }))
                          }
                          style={{ padding: "8px 12px", fontSize: 12 }}
                        />
                      </Field>
                    ))}
                    <div>
                      <button
                        type="button"
                        className="btn primary"
                        style={{ height: 30, padding: "0 14px", fontSize: 11 }}
                        disabled={pending}
                        onClick={() => saveConfig(row)}
                      >
                        {pending ? "SAVING…" : "SAVE CONFIG"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <p style={{ fontSize: 10.5, color: "var(--ink-3)", padding: "12px 18px", margin: 0, lineHeight: 1.5 }}>
            Secrets (API keys, service accounts) stay in environment variables
            on the server — status above reflects what the runtime can see.
          </p>
        </Card>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/app/components/blueprint";
import type {
  AppearanceDto,
  IntegrationRowDto,
} from "@/lib/cms/cms-settings-model";
import {
  saveAppearanceSettings,
  updateIntegrationSetting,
} from "@/lib/cms/actions/settings";
import { Card, Field, PageHead } from "../shell";

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
        accent,
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
            color: banner.ok ? "var(--ink-2)" : "#c44",
          }}
        >
          {banner.text}
        </p>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <Card label="20.A — TOKENS">
          <Field label="Theme">
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
          <Field label="Accent">
            <div style={{ display: "flex", gap: 8 }}>
              {["#d4ff3d", "#ff7a45", "#4fc3f7", "#7cff6b", "#ffffff"].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccent(c)}
                    style={{
                      width: 48,
                      height: 36,
                      background: c,
                      border:
                        accent === c
                          ? "2px solid var(--ink)"
                          : "1px dashed var(--rule)",
                      cursor: "pointer",
                    }}
                  />
                )
              )}
            </div>
          </Field>
          <div style={{ height: 14 }} />
          <Field label="Border style">
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
          <Field label={`Grid density · ${grid}px`}>
            <input
              type="range"
              min={16}
              max={80}
              value={grid}
              onChange={(e) => setGrid(+e.target.value)}
              style={{ width: "100%", accentColor: "var(--ink)" }}
            />
          </Field>
          <Field label={`Slash density · ${slash}px`}>
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

        <Card label="20.B — PREVIEW" spec="LIVE">
          <div
            style={{
              position: "relative",
              height: 360,
              border:
                "1px " +
                (borderStyle === "double"
                  ? "double"
                  : borderStyle === "hand"
                    ? "dashed"
                    : borderStyle) +
                " var(--ink)",
              padding: 20,
              background: theme === "dark" ? "#0a0d11" : "#ece6d6",
              color: theme === "dark" ? "#e8e4d9" : "#14110a",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.5,
                backgroundImage: `linear-gradient(to right, ${
                  theme === "dark"
                    ? "rgba(255,255,255,0.16)"
                    : "rgba(0,0,0,0.18)"
                } 1px, transparent 1px), linear-gradient(to bottom, ${
                  theme === "dark"
                    ? "rgba(255,255,255,0.16)"
                    : "rgba(0,0,0,0.18)"
                } 1px, transparent 1px)`,
                backgroundSize: `${grid}px ${grid}px`,
              }}
            />
            <div style={{ position: "relative" }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  opacity: 0.65,
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
              <p
                style={{
                  fontSize: 12.5,
                  opacity: 0.7,
                  maxWidth: 340,
                }}
              >
                Fullstack engineer building offline-first SaaS.
              </p>
              <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    background: "currentColor",
                    color:
                      theme === "dark" ? "#0a0d11" : "#ece6d6",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, background: accent }}
                  />
                  BOOK A CALL →
                </span>
                <span
                  style={{
                    padding: "10px 18px",
                    border: "1px dashed currentColor",
                    fontSize: 12,
                    backgroundImage: `repeating-linear-gradient(-45deg, currentColor 0, currentColor 1px, transparent 1px, transparent ${slash}px)`,
                    backgroundClip: "padding-box",
                  }}
                >
                  SEE WORK ↓
                </span>
              </div>
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
}: {
  integrations: IntegrationRowDto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(integrations);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    setRows(integrations);
  }, [integrations]);

  function toggleRow(key: string, nextEnabled: boolean) {
    setBanner(null);
    startTransition(async () => {
      const res = await updateIntegrationSetting(key, nextEnabled);
      setBanner({ ok: res.ok, text: res.message });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.key === key ? { ...r, enabled: nextEnabled } : r,
          ),
        );
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
            color: banner.ok ? "var(--ink-2)" : "#c44",
          }}
        >
          {banner.text}
        </p>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <Card label="21.A — DOMAIN">
          <Field label="Primary domain">
            <input className="fld" defaultValue="cakeintech.dev" readOnly />
          </Field>
          <div style={{ height: 14 }} />
          <Field label="Aliases" hint="comma-separated">
            <input
              className="fld"
              defaultValue="mohamed.dev, cake.intech"
              readOnly
            />
          </Field>
        </Card>
        <Card label="21.B — INTEGRATIONS">
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              disabled={pending}
              onClick={() => toggleRow(row.key, !row.enabled)}
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px dashed var(--rule-soft)",
                background: "none",
                borderLeft: "none",
                borderRight: "none",
                borderTop: "none",
                cursor: pending ? "wait" : "pointer",
                color: "inherit",
                font: "inherit",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 13 }}>{row.label}</span>
              <Chip accent={row.enabled}>
                {row.enabled ? "CONNECTED" : "OFF"}
              </Chip>
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}

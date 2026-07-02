"use client";

import { useState, useEffect, type CSSProperties } from "react";
import {
  BPFrame, Chip, Slash, Crosshairs, Monogram, SectionHead, DimLine,
} from "./blueprint";
import { MarkdownBody } from "./MarkdownBody";
import type { AboutContent, Profile, Stat } from "./data";

/* ===== Hero ===== */
export function Hero({ profile, stats }: { profile: Profile; stats: Stat[] }) {
  // null until mount so server HTML matches first client paint (avoids clock hydration mismatch).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const tz = now
    ? now.toLocaleTimeString("en-GB", {
        timeZone: "Africa/Addis_Ababa",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  const [first, ...rest] = profile.name.split(" ");

  return (
    <section id="hero" style={{ position: "relative", paddingTop: 56, paddingBottom: 96 }}>
      <div
        className="bp-bg fade-top"
        style={{ position: "absolute", inset: 0, opacity: 0.6, pointerEvents: "none" }}
      />
      <div className="wrap" style={{ position: "relative" }}>
        <div className="hero-grid">
          {/* Left: identity */}
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
              <Chip>@{profile.handle}</Chip>
              <Chip>{profile.location}</Chip>
              <Chip className="resp-hide-mobile">
                <span>{tz}</span>&nbsp;{profile.timezone}
              </Chip>
            </div>

            <h1 className="display" style={{ marginBottom: 12 }}>
              {first}<br />
              {rest.join(" ")}<span style={{ color: "var(--ink-3)" }}>.</span>
            </h1>

            <div style={{ fontSize: 16, color: "var(--ink-2)", marginBottom: 4, letterSpacing: "0.01em" }}>
              {profile.role}&nbsp;<span style={{ color: "var(--ink-3)" }}>—</span>&nbsp;
              <span className="mark">{profile.yearsExp}+ yrs</span> shipping SaaS
            </div>

            <p style={{
              fontSize: 17, lineHeight: 1.6, color: "var(--ink-2)",
              maxWidth: 560, marginTop: 28, marginBottom: 36, margin: "28px 0 36px",
            }}>
              {profile.tagline}
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="#contact"
                className="btn primary"
                onClick={(e) => { e.preventDefault(); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }}
              >
                <span style={{ width: 6, height: 6, background: "var(--accent)" }} />
                Book a call →
              </a>
              <a
                href="#projects"
                className="btn slash"
                onClick={(e) => { e.preventDefault(); document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); }}
              >
                See work ↓
              </a>
              {profile.resumeUrl ? (
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  Resume.pdf
                </a>
              ) : null}
            </div>

            {stats.length > 0 && (() => {
              const label = stats
                .slice(0, 3)
                .map((s) => `${s.v} ${s.k.toLowerCase()}`)
                .join(" · ");
              // ~6.4px per mono glyph at 10px + end ticks
              const length = Math.min(520, Math.max(220, label.length * 6.4 + 30));
              return (
                <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12, color: "var(--ink-3)", maxWidth: "100%", overflow: "hidden" }}>
                  <DimLine length={length} label={label} />
                </div>
              );
            })()}
          </div>

          {/* Right: spec card */}
          <SpecCard profile={profile} />
        </div>
      </div>
    </section>
  );
}

function SpecCard({ profile }: { profile: Profile }) {
  const rows: [string, string][] = [
    ["DESIGNATION", profile.role.toUpperCase()],
    ["HANDLE",      "@" + profile.handle],
    ["BASE",        profile.location.toUpperCase()],
    ["ZONE",        profile.timezone],
    ["STATUS",      profile.available ? "AVAILABLE FOR WORK" : "AT CAPACITY"],
    ["CONTACT",     profile.email],
  ];

  return (
    <BPFrame
      borderStyle="dashed"
      label="SPEC SHEET — 01.A"
      spec="REF / IDENTITY"
      pad={0}
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Monogram block */}
      <div style={{
        position: "relative", padding: 28,
        borderBottom: "1px dashed var(--rule)",
        display: "flex", alignItems: "center", gap: 20,
      }}>
        <Slash style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
        <div style={{
          width: 88, height: 88,
          border: "1.5px solid var(--rule)",
          background: "var(--bg)", display: "grid", placeItems: "center",
          position: "relative", flexShrink: 0,
          overflow: "hidden",
        }}>
          {profile.heroImageUrl?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element -- CMS URLs and data URLs; not next/image
            <img
              src={profile.heroImageUrl.trim()}
              alt=""
              width={88}
              height={88}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Monogram size={56} />
          )}
          <Crosshairs />
        </div>
        <div style={{ position: "relative" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{profile.name}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
            @{profile.handle}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, letterSpacing: "0.08em" }}>
            ID — CIT-{profile.yearsExp}-2026
          </div>
        </div>
      </div>

      {/* Spec rows */}
      <div>
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className="spec-rows-grid"
            style={{
              padding: "11px 28px",
              borderBottom: i === rows.length - 1 ? "none" : "1px dashed var(--rule-soft)",
              fontSize: 12.5, letterSpacing: "0.04em",
            }}
          >
            <span style={{ color: "var(--ink-3)", fontSize: 10.5, letterSpacing: "0.16em", paddingTop: 2 }}>
              {k}
            </span>
            <span style={{ color: "var(--ink)" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: "14px 28px",
        borderTop: "1px solid var(--rule)",
        background: "var(--ink)", color: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 11, letterSpacing: "0.12em",
        marginTop: "auto",
      }}>
        <span>
          <span style={{ color: "var(--accent)" }}>●</span>&nbsp;ONLINE · {profile.email}
        </span>
        <span>↗</span>
      </div>
    </BPFrame>
  );
}

/* ===== Stats Strip ===== */
export function StatsStrip({ stats }: { stats: Stat[] }) {
  return (
    <section style={{
      position: "relative", padding: "10px 0",
      borderTop: "1px solid var(--rule)",
      borderBottom: "1px solid var(--rule)",
    }}>
      <div className="wrap">
        <div
          className="stats-strip-grid"
          style={{ "--stats-cols": stats.length } as CSSProperties}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "18px 24px",
                borderRight: i < stats.length - 1 ? "1px dashed var(--rule)" : "none",
                position: "relative",
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-0.04em" }}>{s.v}</div>
              <div style={{ fontSize: 10.5, letterSpacing: "0.16em", color: "var(--ink-3)", marginTop: 4 }}>
                {s.k.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== About ===== */
export function About({ about }: { about: AboutContent }) {
  return (
    <section
      id="about"
      style={{ position: "relative", padding: "80px 0", borderBottom: "1px dashed var(--rule)" }}
    >
      <div className="wrap">
        <SectionHead
          code={about.headCode}
          label={about.headLabel}
          title={about.headTitle}
        />
        <div className="about-grid">
          <div style={{ fontSize: 18, lineHeight: 1.65, color: "var(--ink-2)", letterSpacing: "0.005em" }}>
            {about.contentMd?.trim() ? (
              <MarkdownBody>{about.contentMd}</MarkdownBody>
            ) : (
              <>
                <p style={{ margin: "0 0 18px" }}>{about.paragraph1}</p>
                <p style={{ margin: "0 0 18px" }}>
                  {about.paragraph2Prefix}
                  {about.paragraph2Highlight ? (
                    <span className="mark">{about.paragraph2Highlight}</span>
                  ) : null}
                  {about.paragraph2Mid}
                  {about.paragraph2Emphasis ? (
                    <em style={{ fontStyle: "normal", color: "var(--ink)" }}>
                      {about.paragraph2Emphasis}
                    </em>
                  ) : null}
                  {about.paragraph2Suffix}
                </p>
                <p style={{ margin: 0 }}>{about.paragraph3}</p>
              </>
            )}
          </div>

          <BPFrame borderStyle="dashed" label={about.frameLabel} spec={about.frameSpec} pad={24}>
            <Slash style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
              {about.currently.map((row, i) => (
                <div key={`${i}-${row.title}`}>
                  <div style={{ fontSize: 10.5, letterSpacing: "0.16em", color: "var(--ink-3)" }}>
                    {row.title}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--ink)", marginTop: 2 }}>{row.description}</div>
                </div>
              ))}
            </div>
          </BPFrame>
        </div>
      </div>
    </section>
  );
}

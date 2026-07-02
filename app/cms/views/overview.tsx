"use client";

import React, { useEffect, useState, useTransition } from "react";
import type { Profile, Stat } from "@/app/components/data";
import { Chip } from "@/app/components/blueprint";
import { Card, PageHead, Dot } from "../shell";
import {
  getDashboardSummaryAction,
  type DashboardSummary,
} from "@/lib/cms/actions/dashboard";
import type { InboundThread } from "@/lib/inbound/types";

/* ===== Helpers ===== */
function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay)
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return d
    .toLocaleString("en", { month: "short", day: "2-digit" })
    .toUpperCase();
}

function relativeDayLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const target = new Date(y!, mo! - 1, d!);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diff === 0) return "TODAY";
  if (diff === 1) return "TMR";
  if (diff < 0) return "PAST";
  return target.toLocaleString("en", { weekday: "short" }).toUpperCase();
}

/* ===== StatCard ===== */
function StatCard({
  label,
  v,
  delta,
  spark = [],
  accent = false,
}: {
  label: string;
  v: string;
  delta: string;
  spark?: number[];
  accent?: boolean;
}) {
  const max = Math.max(...spark, 1);
  const W = 130,
    H = 32;
  const pts = spark
    .map((y, i) => `${(i / (spark.length - 1)) * W},${H - (y / max) * H}`)
    .join(" ");
  return (
    <Card
      style={{
        padding: 18,
        background: accent ? "var(--ink)" : "var(--bg)",
        color: accent ? "var(--bg)" : "var(--ink)",
      }}
      label={label}
      spec={delta}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div
          className="num"
          style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-0.03em" }}
        >
          {v}
        </div>
        {spark.length > 1 && (
          <svg width={W} height={H} style={{ overflow: "visible" }}>
            <polyline
              points={pts}
              fill="none"
              stroke={accent ? "var(--accent)" : "var(--ink-2)"}
              strokeWidth={1.4}
            />
            <polyline
              points={`${pts} ${W},${H} 0,${H}`}
              fill={
                accent ? "rgba(212,255,61,0.18)" : "rgba(20,17,10,0.08)"
              }
              stroke="none"
            />
          </svg>
        )}
      </div>
    </Card>
  );
}

/* ===== MessagesPreview ===== */
function MessagesPreview({
  threads,
  loading,
}: {
  threads: InboundThread[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        style={{
          padding: "16px 18px",
          fontSize: 12,
          color: "var(--ink-3)",
          fontFamily: "var(--mono)",
        }}
      >
        Loading…
      </div>
    );
  }
  if (threads.length === 0) {
    return (
      <div
        style={{
          padding: "16px 18px",
          fontSize: 12,
          color: "var(--ink-3)",
          fontFamily: "var(--mono)",
        }}
      >
        No messages yet.
      </div>
    );
  }
  return (
    <div>
      {threads.map((m, i) => (
        <div
          key={m.id}
          style={{
            display: "grid",
            gridTemplateColumns: "26px 1fr auto 80px",
            gap: 12,
            alignItems: "center",
            padding: "13px 18px",
            borderBottom:
              i === threads.length - 1
                ? "none"
                : "1px dashed var(--rule-soft)",
            background: m.unread ? "var(--paper-tint)" : "transparent",
          }}
        >
          <Dot on={m.unread} color="var(--accent)" />
          <div>
            <div style={{ fontSize: 13, fontWeight: m.unread ? 600 : 400 }}>
              {m.listLabel}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{m.title}</div>
          </div>
          <Chip>{m.tag}</Chip>
          <div
            className="num"
            style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}
          >
            {relativeTime(m.createdAtIso)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== UpcomingPreview ===== */
function UpcomingPreview({
  bookings,
  loading,
}: {
  bookings: DashboardSummary["upcomingBookings"];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        style={{
          padding: "16px 18px",
          fontSize: 12,
          color: "var(--ink-3)",
          fontFamily: "var(--mono)",
        }}
      >
        Loading…
      </div>
    );
  }
  if (bookings.length === 0) {
    return (
      <div
        style={{
          padding: "16px 18px",
          fontSize: 12,
          color: "var(--ink-3)",
          fontFamily: "var(--mono)",
        }}
      >
        No upcoming calls.
      </div>
    );
  }
  return (
    <div>
      {bookings.map((b, i) => {
        const confirmed = b.status === "confirmed";
        return (
          <div
            key={i}
            style={{
              padding: "13px 18px",
              borderBottom:
                i === bookings.length - 1
                  ? "none"
                  : "1px dashed var(--rule-soft)",
              display: "grid",
              gridTemplateColumns: "70px 1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>
              <div
                className="num"
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  color: "var(--ink-3)",
                }}
              >
                {relativeDayLabel(b.requestedDay)}
              </div>
              <div
                className="num"
                style={{ fontSize: 12.5, fontWeight: 600 }}
              >
                {b.requestedTime}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {b.email.split("@")[0]}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                {b.email}
              </div>
            </div>
            <Chip accent={confirmed}>
              {confirmed ? "CONFIRMED" : "PENDING"}
            </Chip>
          </div>
        );
      })}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ===== Overview ===== */
export function Overview({
  profile,
  stats,
  onNavigate,
}: {
  profile: Profile;
  stats: Stat[];
  onNavigate?: (viewId: string) => void;
}) {
  const firstName = profile.name.split(" ")[0] || "there";
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getDashboardSummaryAction();
      if (res.ok) setSummary(res.summary);
      setLoading(false);
    });
  }, []);

  const unreadCount = summary?.unreadCount ?? 0;
  const upcomingCount = summary?.upcomingCount ?? 0;
  const subscriberCount = summary?.subscriberCount ?? 0;
  const recentThreads = summary?.recentThreads ?? [];
  const upcomingBookings = summary?.upcomingBookings ?? [];

  return (
    <div>
      <PageHead
        code="00"
        sub="WORKSPACE — DASHBOARD"
        title={`${greeting()}, ${firstName}.`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn slash"
              style={{ height: 36 }}
              onClick={() => onNavigate?.("blog")}
            >
              + NEW POST
            </button>
            <button
              className="btn primary"
              style={{ height: 36 }}
              onClick={() => onNavigate?.("projects")}
            >
              + NEW PROJECT
            </button>
          </div>
        }
      />

      <Card label="LIVE SITE STATS" spec="POSTGRES · HOMEPAGE" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(stats.length || 1, 6)}, 1fr)`,
            gap: 12,
          }}
        >
          {(stats.length > 0 ? stats : [{ v: "—", k: "No stats yet" }]).map(
            (s, i) => (
              <div
                key={`${s.k}-${i}`}
                style={{
                  padding: "12px 14px",
                  border: "1px dashed var(--rule-soft)",
                }}
              >
                <div
                  className="num"
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {s.v}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    marginTop: 4,
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.k.toUpperCase()}
                </div>
              </div>
            ),
          )}
        </div>
      </Card>

      {/* Stat cards */}
      <div className="cms-stat-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="UNREAD MESSAGES"
          v={loading ? "—" : String(unreadCount)}
          delta={loading ? "…" : `${unreadCount} NEW`}
        />
        <StatCard
          label="UPCOMING CALLS"
          v={loading ? "—" : String(upcomingCount)}
          delta="UPCOMING"
          accent
        />
        <StatCard
          label="VIEWS · 7D"
          v="—"
          delta="NO ANALYTICS"
        />
        <StatCard
          label="SUBSCRIBERS"
          v={loading ? "—" : String(subscriberCount)}
          delta={loading ? "…" : "TOTAL"}
        />
      </div>

      {/* Main grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 18,
        }}
      >
        <Card
          label="RECENT MESSAGES · 02.A"
          spec={loading ? "…" : `${unreadCount} UNREAD`}
          pad={0}
        >
          <MessagesPreview threads={recentThreads} loading={loading} />
        </Card>
        <Card label="UPCOMING · 02.B" spec="BOOKINGS" pad={0}>
          <UpcomingPreview bookings={upcomingBookings} loading={loading} />
        </Card>
      </div>

      {/* Bottom row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 18,
          marginTop: 18,
        }}
      >
        <Card label="DRAFTS · 04.A" spec="IN PROGRESS">
          <div
            style={{ padding: "10px 0", fontSize: 12, color: "var(--ink-3)" }}
          >
            Open the Devlog editor to manage draft posts.
          </div>
        </Card>

        <Card label="DEPLOYS · 00.C" spec="RAILWAY">
          {[
            ["Pre-deploy migration", "OK", "on deploy"],
            ["Health endpoint", "OK", "/api/health"],
            ["Standalone output", "OK", "next build"],
          ].map(([h, s, t]) => (
            <div
              key={h}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px dashed var(--rule-soft)",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--ink-2)" }}>{h}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    background:
                      s === "OK" ? "var(--accent)" : "transparent",
                    border:
                      s === "OK" ? "none" : "1px dashed var(--rule)",
                    color:
                      s === "OK" ? "var(--accent-ink)" : "var(--ink-3)",
                  }}
                >
                  {s}
                </span>
                <span style={{ color: "var(--ink-3)", fontSize: 11 }}>{t}</span>
              </span>
            </div>
          ))}
        </Card>

        <Card label="QUICK LINKS · 00.D" spec="ADMIN">
          {[
            ["Profile & hero", "profile"],
            ["About section", "about"],
            ["Work experience", "work"],
            ["Projects", "projects"],
            ["Devlog posts", "blog"],
          ].map(([label, viewId]) => (
            <button
              key={String(label)}
              type="button"
              onClick={() => onNavigate?.(String(viewId))}
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                textAlign: "left",
                padding: "10px 0",
                borderBottom: "1px dashed var(--rule-soft)",
                fontSize: 12.5,
                color: "var(--ink-2)",
                background: "none",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderRadius: 0,
                cursor: "pointer",
                font: "inherit",
              }}
            >
              → {label}
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}

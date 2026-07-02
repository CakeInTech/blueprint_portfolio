"use client";

import React, { ReactNode, CSSProperties } from "react";
import { Monogram, Slash } from "@/app/components/blueprint";
import Link from "next/link";
import { cmsSignOut } from "@/app/cms/auth-actions";

/* ===== Dot ===== */
export function Dot({ on = true, color }: { on?: boolean; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 999,
        background: on ? (color || "var(--accent)") : "transparent",
        border: on ? "none" : "1px dashed var(--ink-3)",
        boxShadow: on
          ? `0 0 0 4px color-mix(in oklab, ${color || "var(--accent)"} 30%, transparent)`
          : "none",
        flexShrink: 0,
      }}
    />
  );
}

/* ===== Row (key-value detail row) ===== */
export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span
        style={{
          fontSize: 10.5,
          letterSpacing: "0.14em",
          color: "var(--ink-3)",
          minWidth: 80,
          paddingTop: 1,
        }}
      >
        {k}
      </span>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{v}</span>
    </div>
  );
}

/* ===== Card ===== */
export function Card({
  children,
  label,
  spec,
  pad = 22,
  style,
}: {
  children?: ReactNode;
  label?: string;
  spec?: string;
  pad?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        border: "1px dashed var(--rule)",
        padding: pad,
        background: "var(--bg)",
        ...style,
      }}
    >
      {label && (
        <div
          style={{
            position: "absolute",
            top: -7,
            left: 14,
            background: "var(--bg)",
            padding: "0 8px",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "var(--ink-3)",
          }}
        >
          {label}
        </div>
      )}
      {spec && (
        <div
          style={{
            position: "absolute",
            top: -7,
            right: 14,
            background: "var(--bg)",
            padding: "0 8px",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.12em",
          }}
        >
          {spec}
        </div>
      )}
      {children}
    </div>
  );
}

/* ===== Field ===== */
export function Field({
  label,
  hint,
  children,
  style,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <label
          style={{
            fontSize: 10.5,
            letterSpacing: "0.16em",
            color: "var(--ink-3)",
          }}
        >
          {label.toUpperCase()}
        </label>
        {hint && (
          <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ===== PageHead ===== */
export function PageHead({
  code,
  title,
  sub,
  action,
}: {
  code: string;
  title: string;
  sub: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="cms-page-head"
      style={{
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 16,
        paddingBottom: 16,
        borderBottom: "1px dashed var(--rule)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: "0.18em",
            color: "var(--ink-3)",
            marginBottom: 8,
          }}
        >
          <span className="num">{code}</span> · {sub}
        </div>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "-0.025em",
          }}
        >
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}

/* ===== NAV config ===== */
export const NAV = [
  {
    sec: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", code: "00" },
      { id: "inbox", label: "Messages", code: "01" },
      { id: "calendar", label: "Meetings", code: "02" },
      { id: "analytics", label: "Analytics", code: "03" },
    ],
  },
  {
    sec: "CONTENT",
    items: [
      { id: "profile", label: "Profile / Hero", code: "10" },
      { id: "about", label: "About", code: "10A" },
      { id: "work", label: "Work", code: "11" },
      { id: "projects", label: "Projects", code: "12" },
      { id: "skills", label: "Stack", code: "13" },
      { id: "blog", label: "Devlog", code: "14" },
      { id: "media", label: "Media", code: "15" },
    ],
  },
  {
    sec: "SYSTEM",
    items: [
      { id: "appearance", label: "Appearance", code: "20" },
      { id: "settings", label: "Settings", code: "21" },
    ],
  },
];

/* ===== Sidebar ===== */
export function Sidebar({
  current,
  setCurrent,
  adminEmail,
}: {
  current: string;
  setCurrent: (id: string) => void;
  adminEmail?: string;
}) {
  return (
    <aside className="cms-sidebar">
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 18,
          borderBottom: "1px dashed var(--rule)",
        }}
      >
        <Monogram size={26} />
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            CIT·CMS
          </div>
          <div
            style={{
              fontSize: 9,
              color: "var(--ink-3)",
              letterSpacing: "0.16em",
            }}
          >
            REV. 03 — 2026
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          flex: 1,
        }}
      >
        {NAV.map((grp) => (
          <div key={grp.sec}>
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: "0.2em",
                color: "var(--ink-4)",
                padding: "8px 8px 6px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{grp.sec}</span>
              <Slash
                style={{
                  flex: 1,
                  height: 6,
                  margin: "5px 0 0 8px",
                  opacity: 0.5,
                }}
              />
            </div>
            {grp.items.map((it) => (
              <button
                key={it.id}
                onClick={() => setCurrent(it.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  background:
                    current === it.id ? "var(--ink)" : "transparent",
                  color:
                    current === it.id ? "var(--bg)" : "var(--ink-2)",
                  border: 0,
                  fontFamily: "var(--mono)",
                  fontSize: 12.5,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  letterSpacing: "0.02em",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    className="num"
                    style={{
                      fontSize: 9,
                      color:
                        current === it.id
                          ? "var(--accent)"
                          : "var(--ink-4)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {it.code}
                  </span>
                  {it.label}
                </span>
                {current === it.id && (
                  <span style={{ color: "var(--accent)" }}>●</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* User footer */}
      <div
        style={{
          padding: 14,
          borderTop: "1px dashed var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 11,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            border: "1px dashed var(--rule)",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          MA
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {adminEmail || "Admin"}
          </div>
          <div style={{ color: "var(--ink-3)", fontSize: 10 }}>Owner</div>
        </div>
        <Link
          href="/"
          title="View site"
          style={{ color: "var(--ink-3)", fontSize: 16 }}
        >
          ↗
        </Link>
      </div>
    </aside>
  );
}

/* ===== Topbar ===== */
export function Topbar({
  current,
  onMenu,
}: {
  current: string;
  onMenu?: () => void;
}) {
  const label = NAV.flatMap((g) => g.items).find((i) => i.id === current);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "14px 16px",
        borderBottom: "1px dashed var(--rule)",
        background: "var(--bg)",
        height: 60,
        position: "sticky",
        top: 0,
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 12,
          color: "var(--ink-3)",
          minWidth: 0,
        }}
      >
        <button
          type="button"
          className="cms-menu-btn"
          aria-label="Toggle navigation"
          onClick={onMenu}
        >
          ☰
        </button>
        <span style={{ letterSpacing: "0.14em" }}>CMS</span>
        <span>/</span>
        <span
          style={{
            color: "var(--ink-2)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label?.label || "—"}
        </span>
        <span
          className="num cms-topbar-chips"
          style={{
            fontSize: 10,
            color: "var(--ink-4)",
            letterSpacing: "0.14em",
          }}
        >
          · {label?.code}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <Link
          href="/"
          className="btn"
          style={{ height: 32, padding: "0 14px", fontSize: 11 }}
        >
          VIEW SITE ↗
        </Link>
        <form action={cmsSignOut}>
          <button
            type="submit"
            className="btn"
            style={{ height: 32, padding: "0 14px", fontSize: 11 }}
          >
            LOG OUT
          </button>
        </form>
      </div>
    </div>
  );
}

/* ===== CMSShell ===== */
export function CMSShell({
  children,
  current,
  setCurrent,
  adminEmail,
}: {
  children: ReactNode;
  current: string;
  setCurrent: (id: string) => void;
  adminEmail?: string;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className={`cms-shell${menuOpen ? " sidebar-open" : ""}`}>
      <button
        type="button"
        className="cms-sidebar-overlay"
        aria-label="Close navigation"
        onClick={() => setMenuOpen(false)}
      />
      <Sidebar
        current={current}
        setCurrent={(id) => {
          setCurrent(id);
          setMenuOpen(false);
        }}
        adminEmail={adminEmail}
      />
      <main style={{ position: "relative", overflow: "hidden", minWidth: 0 }}>
        <Topbar current={current} onMenu={() => setMenuOpen((v) => !v)} />
        <div className="cms-content">{children}</div>
      </main>
    </div>
  );
}

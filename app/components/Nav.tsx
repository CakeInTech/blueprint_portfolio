"use client";

import { useState } from "react";
import Link from "next/link";
import { Live } from "./blueprint";

const NAV_ITEMS = [
  { l: "INDEX",    id: "hero" },
  { l: "WORK",     id: "work" },
  { l: "PROJECTS", id: "projects" },
  { l: "STACK",    id: "stack" },
  { l: "DEVLOG",   id: "devlog" },
  { l: "CONTACT",  id: "contact" },
];

export function Nav({
  theme,
  onToggleTheme,
}: {
  theme: string;
  onToggleTheme: () => void;
}) {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
    setOpen(false);
  };

  return (
    <header
      className={open ? "menu-open" : ""}
      style={{
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "var(--bg)",
        isolation: "isolate",
      }}
    >
      <div className="wrap" style={{ display: "flex", alignItems: "stretch", height: 60 }}>
        {/* Logo */}
        <a
          href="#hero"
          onClick={(e) => { e.preventDefault(); scrollTo("hero"); }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            paddingRight: 24,
            fontWeight: 600, letterSpacing: "0.02em", flex: "0 0 auto",
            textDecoration: "none", color: "inherit",
          }}
        >
          <span style={{ fontSize: 14 }}>
            CAKE<span style={{ color: "var(--ink-3)" }}>·</span>INTECH
          </span>
        </a>

        {/* Desktop nav */}
        <nav style={{ display: "flex", flex: 1 }}>
          {NAV_ITEMS.map((it) => (
            <button
              key={it.id}
              onClick={() => scrollTo(it.id)}
              style={{
                flex: "0 0 auto", padding: "0 22px", height: "100%",
                background: "transparent", border: 0,
                fontFamily: "var(--mono)", color: "var(--ink-2)",
                fontSize: 12, letterSpacing: "0.14em", cursor: "pointer",
              }}
            >
              {it.l}
            </button>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            style={{
              flex: "0 0 auto",
              padding: "0 22px",
              height: "100%",
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "stretch",
              fontFamily: "var(--mono)",
              color: "var(--ink-2)",
              fontSize: 12,
              letterSpacing: "0.14em",
            }}
          >
            SIGN IN
          </Link>
        </nav>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 18, marginLeft: "auto" }}>
          <Live />
          <button
            onClick={onToggleTheme}
            title="Toggle theme"
            style={{
              width: 36, height: 36,
              border: 0,
              background: "transparent", color: "var(--ink)",
              cursor: "pointer", display: "grid", placeItems: "center",
              flex: "0 0 auto", fontFamily: "var(--mono)", fontSize: 16,
            }}
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>

          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setOpen(!open)}
            style={{
              display: "none", width: 36, height: 36,
              border: 0,
              background: open ? "var(--ink)" : "transparent",
              color: open ? "var(--bg)" : "var(--ink)",
              cursor: "pointer", placeItems: "center",
              flex: "0 0 auto", fontSize: 18, lineHeight: 1,
              fontFamily: "var(--mono)",
            }}
          >
            {open ? "✕" : "≡"}
          </button>
        </div>
      </div>
    </header>
  );
}

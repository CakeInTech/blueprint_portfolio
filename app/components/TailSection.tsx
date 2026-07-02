"use client";

import Image from "next/image";
import { useActionState, useState, useMemo, useEffect, type CSSProperties } from "react";
import { BPFrame, Chip, Slash, SectionHead, Live } from "./blueprint";
import type { Profile, DevlogPost } from "./data";
import type { WeeklyAvailability } from "@/lib/db/schema";
import { DEFAULT_AVAILABILITY } from "@/lib/cms/cms-settings-model";
import {
  requestBooking,
  submitContactInquiry,
  subscribeToDevlog,
  getBookedDaysAction,
  type FormState,
} from "@/lib/contact/actions";

/** "linkedin.com/in/x" or full URL → https href; empty stays empty. */
function toHref(value: string): string {
  const t = value.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** Display label without protocol. */
function toLabel(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/* ===== Stack Grid ===== */
export function StackGrid({
  stack,
  profile,
}: {
  stack: Record<string, string[]>;
  profile: Profile;
}) {
  const groups = Object.entries(stack);
  const partCount = groups.reduce((n, [, items]) => n + items.length, 0);
  if (groups.length === 0) return null;
  return (
    <section
      id="stack"
      style={{ position: "relative", padding: "80px 0", borderBottom: "1px dashed var(--rule)" }}
    >
      <div className="wrap">
        <SectionHead
          code="03"
          label="STACK — PARTS LIST"
          title="What I build with."
          right={<Chip>BOM · {partCount} PARTS</Chip>}
        />
        <div
          className="stack-grid stack-grid-cols"
          style={{ "--stack-cols": groups.length } as CSSProperties}
        >
          {groups.map(([cat, items], i) => (
            <div
              key={cat}
              className="stack-grid-cell"
              style={{
                padding: "22px 20px",
                position: "relative",
              }}
            >
              <div style={{
                fontSize: 10.5, letterSpacing: "0.18em", color: "var(--ink-3)",
                marginBottom: 14, paddingBottom: 10,
                borderBottom: "1px dashed var(--rule-soft)",
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{cat.toUpperCase()}</span>
                <span>{String(i + 1).padStart(2, "0")} / {String(groups.length).padStart(2, "0")}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map((it, j) => (
                  <div key={it} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "var(--ink-2)" }}>
                    <span style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.08em" }}>
                      {String(j + 1).padStart(2, "0")}
                    </span>
                    <span>{it}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Availability strip — driven by the CMS profile flag */}
        <div style={{
          marginTop: 24, padding: 24,
          border: "1px dashed var(--rule)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 24, flexWrap: "wrap",
          position: "relative",
        }}>
          <Slash style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
          <div style={{ position: "relative" }}>
            <div className="eyebrow">AVAILABILITY</div>
            <div style={{ fontSize: 15, marginTop: 8 }}>
              {profile.available
                ? "Open for contract and advisory work."
                : "Currently at capacity — inquiries still welcome."}
            </div>
          </div>
          <a
            href="#contact"
            className="btn accent"
            style={{ position: "relative" }}
            onClick={(e) => { e.preventDefault(); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }}
          >
            {profile.available ? "BOOK A CALL →" : "GET IN TOUCH →"}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ===== Devlog ===== */
export function Devlog({ posts, profile }: { posts: DevlogPost[]; profile: Profile }) {
  if (posts.length === 0) return null;
  return (
    <section
      id="devlog"
      style={{ position: "relative", padding: "80px 0", borderBottom: "1px dashed var(--rule)" }}
    >
      <div className="wrap">
        <SectionHead
          code="04"
          label="DEVLOG — FIELD NOTES"
          title="Posts from the build."
          right={<Chip>RSS · {posts.length} ENTRIES</Chip>}
        />
        <div className="devlog-grid">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {posts.map((p, i) => (
              <DevlogEntry key={i} p={p} idx={i} last={i === posts.length - 1} />
            ))}
          </div>
          <SubscribePanel profile={profile} />
        </div>
      </div>
    </section>
  );
}

function DevlogEntry({ p, idx, last }: { p: DevlogPost; idx: number; last: boolean }) {
  const [hover, setHover] = useState(false);
  const date = new Date(p.date);
  const dStr = date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    .toUpperCase();

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="devlog-entry-grid"
      style={{
        padding: "26px 0",
        borderBottom: last ? "none" : "1px dashed var(--rule)",
        cursor: "pointer",
        background: hover ? "var(--paper-tint)" : "transparent",
        transition: "background .15s",
        paddingLeft: hover ? 8 : 0,
      }}
    >
      <div>
        <div style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--ink-3)" }}>{dStr}</div>
        <Chip style={{ marginTop: 8 }}>{p.kind.toUpperCase()}</Chip>
      </div>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 6 }}>
          <span style={{ color: "var(--ink-4)", fontSize: 11, letterSpacing: "0.16em", marginRight: 8 }}>
            #{String(idx + 1).padStart(3, "0")}
          </span>
          {p.title}
        </h3>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, margin: 0, maxWidth: 640 }}>
          {p.excerpt}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.12em" }}>{p.read}</span>
        <span style={{
          fontSize: 22,
          color: hover ? "var(--ink)" : "var(--ink-3)",
          transition: "transform .15s",
          transform: hover ? "translateX(4px)" : "none",
        }}>→</span>
      </div>
    </article>
  );
}

function SubscribePanel({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    subscribeToDevlog,
    { ok: false, message: "" },
  );

  const links: [string, string][] = [
    profile.github ? [toLabel(profile.github), toHref(profile.github)] : null,
    profile.linkedin ? [toLabel(profile.linkedin), toHref(profile.linkedin)] : null,
    profile.email ? [profile.email, `mailto:${profile.email}`] : null,
  ].filter((l): l is [string, string] => l !== null);

  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BPFrame borderStyle="dashed" label="04.SUB" spec="RSS · EMAIL" pad={22}>
        <Slash style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
        <div style={{ position: "relative" }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>FIELD NOTES</div>
          <div style={{ fontSize: 18, lineHeight: 1.35, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 12 }}>
            New posts straight from the build.
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, margin: "0 0 16px" }}>
            No newsletter, no tracking. Just plain text to your inbox.
          </p>
          <form action={action}>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
            <input
              className="fld"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              style={{ marginBottom: 10 }}
            />
            <button disabled={pending} type="submit" className="btn primary" style={{ width: "100%", justifyContent: "center" }}>
              {state.ok ? "✓ ON THE LIST" : pending ? "SUBMITTING..." : "SUBSCRIBE →"}
            </button>
            {state.message && (
              <p style={{ fontSize: 11.5, color: state.ok ? "var(--ok)" : "var(--danger)", margin: "10px 0 0" }}>
                {state.message}
              </p>
            )}
          </form>
        </div>
      </BPFrame>

      {links.length > 0 && (
        <BPFrame borderStyle="dashed" label="04.FEED" pad={18}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>SAY HELLO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            {links.map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed var(--rule-soft)" }}
              >
                <span style={{ overflowWrap: "anywhere" }}>{label}</span>
                <span style={{ color: "var(--ink-3)" }}>↗</span>
              </a>
            ))}
          </div>
        </BPFrame>
      )}
    </aside>
  );
}

/* ===== Contact / Booking CTA ===== */
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function buildBaseSlots(availability: WeeklyAvailability) {
  const out: { d: string; mon: string; dow: string; isoDate: string; dayKey: keyof WeeklyAvailability }[] = [];
  const d = new Date();
  let added = 0, i = 0;
  // Look ahead up to 45 days for the next 14 available days.
  while (added < 14 && i < 45) {
    const cur = new Date(d);
    cur.setDate(d.getDate() + i);
    const dayKey = WEEKDAY_KEYS[cur.getDay()]!;
    if (availability[dayKey]?.enabled) {
      const y = cur.getFullYear();
      const mo = String(cur.getMonth() + 1).padStart(2, "0");
      const day = String(cur.getDate()).padStart(2, "0");
      out.push({
        d: day,
        mon: cur.toLocaleString("en", { month: "short" }).toUpperCase(),
        dow: cur.toLocaleString("en", { weekday: "short" }).toUpperCase(),
        isoDate: `${y}-${mo}-${day}`,
        dayKey,
      });
      added++;
    }
    i++;
  }
  return out;
}

/** 90-minute grid inside the day's availability window (max 6 options). */
function buildTimesForDay(day: WeeklyAvailability[keyof WeeklyAvailability]): string[] {
  const [sh, sm] = day.start.split(":").map(Number);
  const [eh, em] = day.end.split(":").map(Number);
  const startMin = (sh ?? 9) * 60 + (sm ?? 0);
  const endMin = (eh ?? 17) * 60 + (em ?? 0);
  const times: string[] = [];
  for (let t = startMin; t + 30 <= endMin && times.length < 6; t += 90) {
    times.push(
      `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`,
    );
  }
  return times;
}

export function ContactCTA({
  profile,
  availability = DEFAULT_AVAILABILITY,
}: {
  profile: Profile;
  availability?: WeeklyAvailability;
}) {
  const baseSlots = useMemo(() => buildBaseSlots(availability), [availability]);
  const [bookedDays, setBookedDays] = useState<string[]>([]);
  const slots = useMemo(
    () => baseSlots.map((s) => ({ ...s, busy: bookedDays.includes(s.isoDate) })),
    [baseSlots, bookedDays],
  );
  const [picked, setPicked] = useState<number | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);

  useEffect(() => {
    void getBookedDaysAction().then(setBookedDays);
  }, []);
  const [state, action, pending] = useActionState<FormState, FormData>(
    requestBooking,
    { ok: false, message: "" },
  );
  const [contactState, contactAction, contactPending] = useActionState<FormState, FormData>(
    submitContactInquiry,
    { ok: false, message: "" },
  );

  const times = useMemo(
    () =>
      picked != null && slots[picked]
        ? buildTimesForDay(availability[slots[picked].dayKey])
        : [],
    [picked, slots, availability],
  );

  const socialLinks: [string, string][] = [
    profile.github ? ["GITHUB", toHref(profile.github)] : null,
    profile.linkedin ? ["LINKEDIN", toHref(profile.linkedin)] : null,
  ].filter((l): l is [string, string] => l !== null);

  return (
    <section
      id="contact"
      style={{ position: "relative", padding: "80px 0", borderBottom: "1px dashed var(--rule)" }}
    >
      <div className="wrap">
        <SectionHead
          code="05"
          label="CONTACT — ENGAGE"
          title="Let's draw something."
          right={<Live label="REPLYING WITHIN 24H · EAT BUSINESS HOURS" />}
        />

        <div className="contact-grid">
          {/* Calendar picker */}
          <BPFrame borderStyle="dashed" label="05.A — BOOK A CALL" spec="30 MIN · GMEET" pad={28}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>30-min intro call</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                  {profile.timezone} · Scheduled directly from this page
                </div>
              </div>
              <Chip accent>FREE</Chip>
            </div>

            {/* Day picker */}
            <div className="day-picker-grid">
              {slots.slice(0, 14).map((s, i) => (
                <button
                  key={i}
                  onClick={() => { if (!s.busy) { setPicked(i); setPickedTime(null); } }}
                  disabled={s.busy}
                  style={{
                    padding: "10px 4px",
                    border: picked === i ? "1.5px solid var(--ink)" : "1px var(--border-style, dashed) var(--rule)",
                    backgroundColor: picked === i ? "var(--accent)" : "transparent",
                    backgroundImage: s.busy
                      ? "repeating-linear-gradient(-45deg, var(--rule-soft) 0, var(--rule-soft) 1px, transparent 1px, transparent var(--slash-density, 7px))"
                      : "none",
                    color: s.busy ? "var(--ink-4)" : picked === i ? "var(--accent-ink)" : "var(--ink)",
                    fontFamily: "var(--mono)", fontSize: 11,
                    cursor: s.busy ? "not-allowed" : "pointer",
                  }}
                >
                  <div style={{ fontSize: 9, letterSpacing: "0.12em", opacity: 0.65 }}>{s.dow}</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{s.d}</div>
                  <div style={{ fontSize: 9, opacity: 0.65, marginTop: 2 }}>{s.mon}</div>
                </button>
              ))}
            </div>

            {picked != null && slots[picked] && (
              <form action={action}>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
                <input
                  type="hidden"
                  name="day"
                  value={slots[picked]!.isoDate}
                />
                <input type="hidden" name="time" value={pickedTime ?? ""} />
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  SELECT A TIME · {slots[picked].dow} {slots[picked].mon} {slots[picked].d}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                  {times.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPickedTime(t)}
                      style={{
                        padding: "9px 14px",
                        border: pickedTime === t ? "1.5px solid var(--ink)" : "1px var(--border-style, dashed) var(--rule)",
                        background: pickedTime === t ? "var(--accent)" : "transparent",
                        color: pickedTime === t ? "var(--accent-ink)" : "var(--ink)",
                        fontFamily: "var(--mono)", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input className="fld" name="email" type="email" required placeholder="Your email" style={{ marginBottom: 8 }} />
                <textarea
                  className="fld"
                  name="notes"
                  rows={3}
                  placeholder="What should we discuss?"
                  style={{ marginBottom: 12, resize: "vertical" }}
                />
                <button
                  disabled={!pickedTime || pending}
                  type="submit"
                  className="btn primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {state.ok
                    ? "✓ HOLD CONFIRMED — CHECK YOUR INBOX"
                    : pending
                    ? "CONFIRMING..."
                    : `CONFIRM HOLD — ${slots[picked].dow} ${slots[picked].mon} ${slots[picked].d} · ${pickedTime || "—"}`}
                </button>
                {state.message && (
                  <p style={{ fontSize: 11.5, color: state.ok ? "var(--ok)" : "var(--danger)", margin: "10px 0 0" }}>
                    {state.message}
                  </p>
                )}
              </form>
            )}

            {picked == null && (
              <div style={{ padding: "16px 0", fontSize: 12.5, color: "var(--ink-3)", borderTop: "1px dashed var(--rule-soft)" }}>
                ↑ Pick a day to see times. Holds are confirmed by email.
              </div>
            )}
          </BPFrame>

          {/* Side: email + fit */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <BPFrame borderStyle="dashed" label="05.B" spec="EMAIL / DM" pad={24}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>DIRECT</div>
              <div
                style={{
                  fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em",
                  display: "block", marginBottom: 4, wordBreak: "break-all",
                }}
              >
                {profile.email}
              </div>
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "0 0 16px" }}>
                I reply within 24h on weekdays. Cold emails welcome, no template necessary.
              </p>
              <form action={contactAction} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
                <input className="fld" name="name" required placeholder="Your name" />
                <input className="fld" name="email" type="email" required placeholder="you@example.com" />
                <textarea
                  className="fld"
                  name="message"
                  rows={3}
                  required
                  placeholder="What are you building? What do you need help with?"
                  style={{ resize: "vertical" }}
                />
                <button
                  disabled={contactPending}
                  type="submit"
                  className="btn primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {contactState.ok ? "✓ INQUIRY SENT" : contactPending ? "SENDING..." : "SEND INQUIRY →"}
                </button>
                {contactState.message && (
                  <p style={{ fontSize: 11.5, color: contactState.ok ? "var(--ok)" : "var(--danger)", margin: "2px 0 0" }}>
                    {contactState.message}
                  </p>
                )}
              </form>
              {socialLinks.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${socialLinks.length}, 1fr)`, gap: 6 }}>
                  {socialLinks.map(([label, href]) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn slash"
                      style={{ justifyContent: "center" }}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </BPFrame>

            <BPFrame borderStyle="hand" label="05.C" pad={24}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>FIT</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {([
                  ["Offline-first SaaS",       true],
                  ["Multi-tenant systems",      true],
                  ["Civic/public-sector tech",  true],
                  ["Frontend-only mockups",     false],
                  ["Crypto / NFT projects",     false],
                ] as [string, boolean][]).map(([t, ok]) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <span style={{
                      width: 14, height: 14,
                      border: "1px solid var(--rule)",
                      display: "grid", placeItems: "center",
                      background: ok ? "var(--accent)" : "transparent",
                      color: ok ? "var(--accent-ink)" : "var(--ink-3)",
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {ok ? "✓" : "—"}
                    </span>
                    <span style={{ color: ok ? "var(--ink)" : "var(--ink-3)", textDecoration: ok ? "none" : "line-through" }}>
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </BPFrame>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===== Resume Band ===== */
export function ResumeBand({ profile }: { profile: Profile }) {
  if (!profile.resumeUrl) return null;

  const updated = profile.resumeUpdatedAt
    ? new Date(profile.resumeUpdatedAt)
        .toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase()
    : null;

  return (
    <section
      id="resume"
      style={{ position: "relative", padding: "60px 0", borderBottom: "1px dashed var(--rule)" }}
    >
      <div className="wrap">
        <BPFrame
          borderStyle="solid"
          pad={36}
          style={{
            background: "var(--ink)", color: "var(--bg)",
            borderColor: "var(--ink)", position: "relative",
          }}
        >
          <div style={{
            position: "absolute", inset: 0, opacity: 0.18,
            backgroundImage:
              "repeating-linear-gradient(-45deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 14px)",
          }} />
          <div style={{
            position: "relative",
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 24, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: "0.18em", opacity: 0.6, marginBottom: 8 }}>
                06 — DOWNLOAD
              </div>
              <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 4 }}>
                Resume —{" "}
                <span style={{ background: "var(--accent)", color: "var(--accent-ink)", padding: "0 6px" }}>
                  cakeintech.pdf
                </span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                Always-current for {profile.name}, uploaded from the CMS.
                {updated ? ` Last updated ${updated}.` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn accent"
                style={{ borderColor: "var(--bg)" }}
              >
                ↓ DOWNLOAD .PDF
              </a>
            </div>
          </div>
        </BPFrame>
      </div>
    </section>
  );
}

/* ===== Footer ===== */
export function Footer({ profile, theme }: { profile: Profile; theme?: string }) {
  const year = new Date().getFullYear();

  const elsewhere: [string, string][] = [
    profile.github ? ["GitHub", toHref(profile.github)] : null,
    profile.linkedin ? ["LinkedIn", toHref(profile.linkedin)] : null,
    profile.email ? ["Email", `mailto:${profile.email}`] : null,
  ].filter((l): l is [string, string] => l !== null);

  const system: [string, string][] = profile.resumeUrl
    ? [["Resume.pdf", profile.resumeUrl]]
    : [];

  const columns: [string, [string, string][]][] = [
    ["NAVIGATE", [
      ["Index",    "#hero"],
      ["Work",     "#work"],
      ["Projects", "#projects"],
      ["Devlog",   "#devlog"],
      ["Contact",  "#contact"],
    ]],
    ["ELSEWHERE", elsewhere],
    ["SYSTEM", system],
  ];

  return (
    <footer style={{ position: "relative", padding: "48px 0 32px", background: "var(--bg)" }}>
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Image
              src="/logo.png"
              alt="cakeintech"
              width={4199}
              height={3045}
              style={{
                height: 48,
                width: "auto",
                filter: theme === "dark" ? "invert(1)" : "none",
                transition: "filter 0.2s",
              }}
            />
            <div style={{ marginTop: 14, fontSize: 13, color: "var(--ink-2)", maxWidth: 280, lineHeight: 1.55 }}>
              cakeintech — built and maintained from {profile.location || "the field"}. Every section editable via the CMS.
            </div>
            <div style={{ marginTop: 18, fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.12em" }}>
              © {year} · {profile.name.toUpperCase()}
            </div>
          </div>

          {columns
            .filter(([, rows]) => rows.length > 0)
            .map(([t, rows]) => (
              <div key={t}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>{t}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rows.map(([l, h]) => (
                    <a
                      key={l}
                      href={h}
                      target={/^https?:\/\//.test(h) ? "_blank" : undefined}
                      rel={/^https?:\/\//.test(h) ? "noopener noreferrer" : undefined}
                      style={{ fontSize: 13, color: "var(--ink-2)" }}
                    >
                      {l} <span style={{ color: "var(--ink-4)" }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
        </div>

        <div style={{
          marginTop: 36, paddingTop: 18,
          borderTop: "1px dashed var(--rule)",
          display: "flex", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
          fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.14em",
        }}>
          <span>© {year} · cakeintech</span>
          <span>{profile.email}</span>
        </div>
      </div>
    </footer>
  );
}

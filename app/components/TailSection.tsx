"use client";

import { useActionState, useState, useMemo, useEffect } from "react";
import { BPFrame, Chip, Slash, Monogram, SectionHead, Live } from "./blueprint";
import type { Profile, DevlogPost } from "./data";
import {
  requestBooking,
  submitContactInquiry,
  subscribeToDevlog,
  getBookedDaysAction,
  type FormState,
} from "@/lib/contact/actions";

/* ===== Stack Grid ===== */
export function StackGrid({ stack }: { stack: Record<string, string[]> }) {
  const groups = Object.entries(stack);
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
          right={<Chip>BOM · 36 PARTS</Chip>}
        />
        <div
          className="stack-grid"
          style={{
            gridTemplateColumns: `repeat(${groups.length}, 1fr)`,
          }}
        >
          {groups.map(([cat, items], i) => (
            <div
              key={cat}
              style={{
                borderRight: i < groups.length - 1 ? "1px dashed var(--rule)" : "none",
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

        {/* Exploring + Availability */}
        <div style={{
          marginTop: 24, padding: 24,
          border: "1px dashed var(--rule)",
          display: "grid", gridTemplateColumns: "2fr 1fr",
          gap: 32, position: "relative",
        }}>
          <Slash style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
          <div style={{ position: "relative" }}>
            <div className="eyebrow">CURRENTLY EXPLORING</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {[
                "CRDT sync", "Edge functions", "Rust + WASM",
                "Local-first auth", "AI agents in SaaS", "OIDC + verifiable credentials",
              ].map((t) => <Chip key={t}>{t}</Chip>)}
            </div>
          </div>
          <div style={{ position: "relative", borderLeft: "1px dashed var(--rule)", paddingLeft: 24 }}>
            <div className="eyebrow">AVAILABILITY · Q2 / Q3 2026</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
              <AvailRow k="CONTRACT"  v="OPEN"              ok />
              <AvailRow k="ADVISORY"  v="OPEN"              ok />
              <AvailRow k="FULL-TIME" v="2 OFFERS PENDING"     />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AvailRow({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "var(--ink-3)", letterSpacing: "0.12em" }}>{k}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink)" }}>
        {ok && <span style={{ width: 6, height: 6, background: "var(--accent)" }} />}
        {v}
      </span>
    </div>
  );
}

/* ===== Devlog ===== */
export function Devlog({ posts }: { posts: DevlogPost[] }) {
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
          <SubscribePanel />
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

function SubscribePanel() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    subscribeToDevlog,
    { ok: false, message: "" },
  );

  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BPFrame borderStyle="dashed" label="04.SUB" spec="RSS · EMAIL" pad={22}>
        <Slash style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
        <div style={{ position: "relative" }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>FIELD NOTES</div>
          <div style={{ fontSize: 18, lineHeight: 1.35, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 12 }}>
            New post every ~3 weeks. Mostly devlog, sometimes opinion.
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

      <BPFrame borderStyle="dashed" label="04.FEED" pad={18}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>SAY HELLO</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
          {[
            ["github.com/cakeintech", "https://github.com/cakeintech"],
            ["linkedin.com/in/cakeintech", "https://linkedin.com/in/cakeintech"],
            ["x.com/cakeintech", "https://x.com/cakeintech"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed var(--rule-soft)" }}
            >
              <span>{label}</span>
              <span style={{ color: "var(--ink-3)" }}>↗</span>
            </a>
          ))}
        </div>
      </BPFrame>
    </aside>
  );
}

/* ===== Contact / Booking CTA ===== */
function buildBaseSlots() {
  const out: { d: string; mon: string; dow: string; isoDate: string }[] = [];
  const d = new Date();
  let added = 0, i = 0;
  while (added < 14) {
    const cur = new Date(d);
    cur.setDate(d.getDate() + i);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      const y = cur.getFullYear();
      const mo = String(cur.getMonth() + 1).padStart(2, "0");
      const day = String(cur.getDate()).padStart(2, "0");
      out.push({
        d: day,
        mon: cur.toLocaleString("en", { month: "short" }).toUpperCase(),
        dow: cur.toLocaleString("en", { weekday: "short" }).toUpperCase(),
        isoDate: `${y}-${mo}-${day}`,
      });
      added++;
    }
    i++;
  }
  return out;
}

export function ContactCTA({ profile }: { profile: Profile }) {
  const baseSlots = useMemo(() => buildBaseSlots(), []);
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

  const times = ["09:00", "10:30", "13:00", "14:30", "16:00"];

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
          <BPFrame borderStyle="dashed" label="05.A — BOOK A CALL" spec="30 MIN · GMEET / ZOOM" pad={28}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>30-min intro call</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                  {profile.timezone} · Scheduled directly from this page
                </div>
              </div>
              <Chip accent>FREE</Chip>
            </div>

            {/* Day picker */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 18 }}>
              {slots.slice(0, 14).map((s, i) => (
                <button
                  key={i}
                  onClick={() => !s.busy && setPicked(i)}
                  disabled={s.busy}
                  style={{
                    padding: "10px 4px",
                    border: picked === i ? "1.5px solid var(--ink)" : "1px dashed var(--rule)",
                    backgroundColor: picked === i ? "var(--accent)" : "transparent",
                    backgroundImage: s.busy
                      ? "repeating-linear-gradient(-45deg, var(--rule-soft) 0, var(--rule-soft) 1px, transparent 1px, transparent 6px)"
                      : picked === i
                      ? "none"
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

            {picked != null && (
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
                      onClick={() => setPickedTime(t)}
                      style={{
                        padding: "9px 14px",
                        border: pickedTime === t ? "1.5px solid var(--ink)" : "1px dashed var(--rule)",
                        background: pickedTime === t ? "var(--accent)" : "transparent",
                        color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 12, cursor: "pointer",
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <a
                  href="https://x.com/cakeintech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn slash"
                  style={{ justifyContent: "center" }}
                >
                  X / TWITTER
                </a>
                <a
                  href="https://linkedin.com/in/cakeintech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn slash"
                  style={{ justifyContent: "center" }}
                >
                  LINKEDIN
                </a>
              </div>
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
                Always-current for {profile.name}, exported from the CMS. 2 pages. Last updated 11 MAY 2026.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="#" className="btn accent" style={{ borderColor: "var(--bg)" }}>
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
export function Footer({ profile }: { profile: Profile }) {
  return (
    <footer style={{ position: "relative", padding: "48px 0 32px", background: "var(--bg)" }}>
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Monogram size={36} />
            <div style={{ marginTop: 14, fontSize: 13, color: "var(--ink-2)", maxWidth: 280, lineHeight: 1.55 }}>
              cakeintech — built and maintained from Addis Ababa. Every section editable via the CMS.
            </div>
            <div style={{ marginTop: 18, fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.12em" }}>
              © 2026 · {profile.name.toUpperCase()}
            </div>
          </div>

          {([
            ["NAVIGATE", [
              ["Index",    "#hero"],
              ["Work",     "#work"],
              ["Projects", "#projects"],
              ["Devlog",   "#devlog"],
              ["Contact",  "#contact"],
            ]],
            ["ELSEWHERE", [
              ["GitHub",     "https://github.com/cakeintech"],
              ["LinkedIn",   "https://linkedin.com/in/cakeintech"],
              ["X / Twitter","https://x.com/cakeintech"],
              ["Email",      `mailto:${profile.email}`],
            ]],
            ["SYSTEM", [
              ["Resume.pdf", "#"],
              ["Colophon",   "#"],
              ["RSS feed",   "#"],
            ]],
          ] as [string, [string, string][]][]).map(([t, rows]) => (
            <div key={t}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>{t}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rows.map(([l, h]) => (
                  <a key={l} href={h} style={{ fontSize: 13, color: "var(--ink-2)" }}>
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
          fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.14em",
        }}>
          <span>© 2026 · cakeintech</span>
          <span>{profile.email}</span>
        </div>
      </div>
    </footer>
  );
}

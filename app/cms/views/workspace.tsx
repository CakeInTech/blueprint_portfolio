"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useTransition,
} from "react";
import { Chip } from "@/app/components/blueprint";
import { Card, PageHead, Dot, Row } from "../shell";
import {
  listMeetingsForWeekAction,
  createMeetingAction,
  deleteMeetingAction,
  type MeetingRecord,
} from "@/lib/cms/actions/meetings";

/* ===== Date helpers ===== */
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmt(d: Date): string {
  return d.toLocaleString("en", { month: "short", day: "2-digit" }).toUpperCase();
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
type CalEvent = {
  id: string;
  start: Date;
  end: Date;
  title: string;
  who: string;
  kind: string;
  status: string;
  platform: string;
  link: string;
  notes: string;
};

function meetingToCalEvent(m: MeetingRecord): CalEvent {
  return {
    id: m.id,
    start: m.startTime instanceof Date ? m.startTime : new Date(m.startTime),
    end: m.endTime instanceof Date ? m.endTime : new Date(m.endTime),
    title: m.title,
    who: m.who,
    kind: m.kind,
    status: m.status,
    platform: m.platform,
    link: m.link,
    notes: m.notes,
  };
}

function toDateInputValue(d: Date): string {
  return d.toISOString().split("T")[0] ?? "";
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

function EventChip({
  ev,
  selected,
  onClick,
}: {
  ev: CalEvent;
  selected: boolean;
  onClick: () => void;
}) {
  const span = (ev.end.getTime() - ev.start.getTime()) / (60 * 60 * 1000);
  const top = (ev.start.getMinutes() / 60) * 52;
  const h = Math.max(28, span * 52 - 4);
  const colors: Record<string, { bg: string; color: string; border: string; slash?: boolean }> = {
    confirmed: { bg: "var(--ink)", color: "var(--bg)", border: "var(--ink)" },
    pending: {
      bg: "transparent",
      color: "var(--ink)",
      border: "var(--rule)",
      slash: true,
    },
    hold: {
      bg: "var(--accent)",
      color: "var(--accent-ink)",
      border: "var(--ink)",
    },
  };
  const c = colors[ev.status.toLowerCase()] || colors.confirmed;
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        left: 3,
        right: 3,
        top,
        height: h,
        background: c.bg,
        color: c.color,
        border: `${selected ? 1.5 : 1}px ${c.slash ? "dashed" : "solid"} ${
          selected ? "var(--accent)" : c.border
        }`,
        fontFamily: "var(--mono)",
        padding: "5px 7px",
        fontSize: 10.5,
        textAlign: "left",
        cursor: "pointer",
        backgroundImage: c.slash
          ? "repeating-linear-gradient(-45deg, var(--rule-soft) 0, var(--rule-soft) 1px, transparent 1px, transparent 6px)"
          : undefined,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          lineHeight: 1.2,
          marginBottom: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {ev.title}
      </div>
      <div className="num" style={{ fontSize: 9, opacity: 0.75 }}>
        {fmtTime(ev.start)}–{fmtTime(ev.end)}
      </div>
    </button>
  );
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const KIND_OPTIONS = ["CLIENT", "INBOUND", "FOCUS", "TEAM", "ROLE"] as const;
const STATUS_OPTIONS = ["Confirmed", "Pending", "Hold"] as const;

type NewMeetingForm = {
  title: string;
  who: string;
  kind: (typeof KIND_OPTIONS)[number];
  status: (typeof STATUS_OPTIONS)[number];
  platform: string;
  link: string;
  notes: string;
  date: string;
  startHour: string;
  startMin: string;
  durationMin: number;
};

function emptyForm(weekStart: Date): NewMeetingForm {
  return {
    title: "",
    who: "",
    kind: "CLIENT",
    status: "Confirmed",
    platform: "",
    link: "",
    notes: "",
    date: toDateInputValue(weekStart),
    startHour: "09",
    startMin: "00",
    durationMin: 60,
  };
}

/* ===== MeetingsCalendar ===== */
export function MeetingsCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const start = useMemo(
    () => startOfWeek(addDays(new Date(), weekOffset * 7)),
    [weekOffset],
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    [start],
  );

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState<NewMeetingForm>(() => emptyForm(start));
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");

  const selEv = events.find((e) => e.id === sel);

  const loadEvents = useCallback(() => {
    startTransition(async () => {
      try {
        const rows = await listMeetingsForWeekAction(start);
        setEvents(rows.map(meetingToCalEvent));
        setLoading(false);
      } catch {
        setEvents([]);
        setLoading(false);
      }
    });
  }, [start]);

  useEffect(() => {
    setLoading(true);
    loadEvents();
  }, [loadEvents]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteMeetingAction(id);
        setSel(undefined);
        await loadEvents();
        setStatus("Meeting deleted.");
      } catch {
        setStatus("Could not delete meeting.");
      }
    });
  };

  const handleCreate = () => {
    const [yStr, moStr, dStr] = newForm.date.split("-");
    const y = parseInt(yStr ?? "2026", 10);
    const mo = parseInt(moStr ?? "1", 10);
    const d = parseInt(dStr ?? "1", 10);
    const h = parseInt(newForm.startHour, 10);
    const m = parseInt(newForm.startMin, 10);
    const startTime = new Date(y, mo - 1, d, h, m, 0, 0);
    const endTime = new Date(startTime.getTime() + newForm.durationMin * 60 * 1000);

    startTransition(async () => {
      try {
        await createMeetingAction({
          title: newForm.title,
          who: newForm.who,
          kind: newForm.kind,
          status: newForm.status,
          platform: newForm.platform,
          link: newForm.link,
          notes: newForm.notes,
          startTime,
          endTime,
        });
        setCreating(false);
        setNewForm(emptyForm(start));
        await loadEvents();
        setStatus("Meeting created.");
      } catch {
        setStatus("Could not create meeting. Check all fields.");
      }
    });
  };

  const confirmedCount = events.filter(
    (e) => e.status.toLowerCase() === "confirmed",
  ).length;
  const pendingCount = events.filter(
    (e) => e.status.toLowerCase() === "pending",
  ).length;
  const holdCount = events.filter(
    (e) => e.status.toLowerCase() === "hold",
  ).length;

  return (
    <div>
      <PageHead
        code="02"
        sub="WORKSPACE — MEETINGS"
        title="Meetings & scheduling"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {status && (
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {status}
              </span>
            )}
            <button
              type="button"
              className="btn primary"
              style={{ height: 36 }}
              onClick={() => {
                setNewForm(emptyForm(start));
                setCreating(true);
                setSel(undefined);
              }}
            >
              + NEW MEETING
            </button>
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 18,
        }}
      >
        <Card
          label="02.A — WEEK VIEW"
          spec={`${fmt(start)} → ${fmt(addDays(start, 6))}`}
          pad={0}
        >
          {/* Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: "1px dashed var(--rule)",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn"
                style={{ height: 28, padding: "0 12px", fontSize: 11 }}
                onClick={() => setWeekOffset(weekOffset - 1)}
              >
                ← PREV
              </button>
              <button
                type="button"
                className="btn"
                style={{ height: 28, padding: "0 12px", fontSize: 11 }}
                onClick={() => setWeekOffset(0)}
              >
                TODAY
              </button>
              <button
                type="button"
                className="btn"
                style={{ height: 28, padding: "0 12px", fontSize: 11 }}
                onClick={() => setWeekOffset(weekOffset + 1)}
              >
                NEXT →
              </button>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {confirmedCount > 0 && <Chip>{confirmedCount} CONFIRMED</Chip>}
              {pendingCount > 0 && <Chip>{pendingCount} PENDING</Chip>}
              {holdCount > 0 && <Chip accent>{holdCount} HOLD</Chip>}
              {loading && <Chip>LOADING…</Chip>}
              {!loading && events.length === 0 && (
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  No meetings this week
                </span>
              )}
            </div>
          </div>

          {/* Calendar grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "44px repeat(7, 1fr)",
              borderTop: "1px dashed var(--rule)",
              overflowX: "auto",
            }}
          >
            {/* Header */}
            <div
              style={{
                borderRight: "1px dashed var(--rule)",
                borderBottom: "1px dashed var(--rule)",
              }}
            />
            {days.map((d) => {
              const isToday = sameDay(d, new Date());
              return (
                <div
                  key={d.toISOString()}
                  style={{
                    borderRight: "1px dashed var(--rule)",
                    borderBottom: "1px dashed var(--rule)",
                    padding: "8px 10px",
                    background: isToday
                      ? "var(--paper-tint)"
                      : "transparent",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9.5,
                      letterSpacing: "0.16em",
                      color: "var(--ink-3)",
                    }}
                  >
                    {d
                      .toLocaleString("en", { weekday: "short" })
                      .toUpperCase()}
                  </div>
                  <div
                    className="num"
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {String(d.getDate()).padStart(2, "0")}
                  </div>
                </div>
              );
            })}

            {/* Hour rows */}
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <div
                  className="num"
                  style={{
                    borderRight: "1px dashed var(--rule)",
                    borderBottom: "1px dashed var(--rule-soft)",
                    padding: "4px 6px",
                    textAlign: "right",
                    fontSize: 10,
                    color: "var(--ink-3)",
                  }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
                {days.map((d, di) => (
                  <div
                    key={di}
                    style={{
                      borderRight: "1px dashed var(--rule)",
                      borderBottom: "1px dashed var(--rule-soft)",
                      position: "relative",
                      minHeight: 52,
                      background: sameDay(d, new Date())
                        ? "rgba(212,255,61,0.04)"
                        : "transparent",
                    }}
                  >
                    {events
                      .filter(
                        (e) =>
                          sameDay(e.start, d) &&
                          e.start.getHours() === h
                      )
                      .map((e) => (
                        <EventChip
                          key={e.id}
                          ev={e}
                          selected={e.id === sel && !creating}
                          onClick={() => {
                            setSel(e.id);
                            setCreating(false);
                          }}
                        />
                      ))}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* Side panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            label={creating ? "02.B — NEW MEETING" : "02.B — SELECTED"}
            spec={creating ? "DRAFT" : selEv ? selEv.status.toUpperCase() : "—"}
            pad={0}
          >
            {creating ? (
              /* ── New meeting form ── */
              <div>
                <div
                  style={{
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderBottom: "1px dashed var(--rule)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>TITLE *</div>
                    <input
                      className="fld"
                      value={newForm.title}
                      placeholder="Meeting title"
                      onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                      style={{ padding: "7px 10px", fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>WHO</div>
                      <input
                        className="fld"
                        value={newForm.who}
                        placeholder="Contact name"
                        onChange={(e) => setNewForm((f) => ({ ...f, who: e.target.value }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>KIND</div>
                      <select
                        className="fld"
                        value={newForm.kind}
                        onChange={(e) => setNewForm((f) => ({ ...f, kind: e.target.value as NewMeetingForm["kind"] }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      >
                        {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>STATUS</div>
                      <select
                        className="fld"
                        value={newForm.status}
                        onChange={(e) => setNewForm((f) => ({ ...f, status: e.target.value as NewMeetingForm["status"] }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>PLATFORM</div>
                      <input
                        className="fld"
                        value={newForm.platform}
                        placeholder="Zoom, GMeet…"
                        onChange={(e) => setNewForm((f) => ({ ...f, platform: e.target.value }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>DATE</div>
                    <input
                      type="date"
                      className="fld"
                      value={newForm.date}
                      onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))}
                      style={{ padding: "7px 10px", fontSize: 12 }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>HOUR</div>
                      <select
                        className="fld"
                        value={newForm.startHour}
                        onChange={(e) => setNewForm((f) => ({ ...f, startHour: e.target.value }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={String(h).padStart(2, "0")}>
                            {String(h).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>MIN</div>
                      <select
                        className="fld"
                        value={newForm.startMin}
                        onChange={(e) => setNewForm((f) => ({ ...f, startMin: e.target.value }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      >
                        {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>DURATION</div>
                      <select
                        className="fld"
                        value={newForm.durationMin}
                        onChange={(e) => setNewForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      >
                        {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}m</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>NOTES</div>
                    <textarea
                      className="fld"
                      rows={2}
                      value={newForm.notes}
                      placeholder="Optional notes…"
                      onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
                      style={{ padding: "7px 10px", fontSize: 12, resize: "vertical" }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 30, padding: "0 12px", fontSize: 11 }}
                    disabled={isPending}
                    onClick={() => setCreating(false)}
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    style={{ height: 30, padding: "0 14px", fontSize: 11 }}
                    disabled={isPending || !newForm.title.trim() || !newForm.date}
                    onClick={handleCreate}
                  >
                    {isPending ? "SAVING…" : "CREATE ✓"}
                  </button>
                </div>
              </div>
            ) : selEv ? (
              /* ── Event detail ── */
              <div>
                <div
                  style={{
                    padding: 18,
                    borderBottom: "1px dashed var(--rule)",
                  }}
                >
                  <div
                    className="num"
                    style={{
                      fontSize: 10.5,
                      letterSpacing: "0.14em",
                      color: "var(--ink-3)",
                      marginBottom: 4,
                    }}
                  >
                    {selEv.start
                      .toLocaleString("en", { weekday: "long" })
                      .toUpperCase()}{" "}
                    · {fmtTime(selEv.start)} → {fmtTime(selEv.end)}
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {selEv.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-3)",
                      marginTop: 2,
                    }}
                  >
                    {selEv.who ? `w/ ${selEv.who} · ` : ""}{selEv.kind}
                  </div>
                </div>
                <div
                  style={{
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    fontSize: 12,
                  }}
                >
                  <Row k="STATUS" v={selEv.status} />
                  {selEv.platform && <Row k="PLATFORM" v={selEv.platform} />}
                  {selEv.link && selEv.link !== "—" && <Row k="LINK" v={selEv.link} />}
                  {selEv.notes && <Row k="NOTES" v={selEv.notes} />}
                </div>
                <div
                  style={{
                    padding: 14,
                    borderTop: "1px dashed var(--rule)",
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      borderColor: "var(--danger)",
                      color: "var(--danger)",
                      fontSize: 11,
                    }}
                    disabled={isPending}
                    onClick={() => handleDelete(selEv.id)}
                  >
                    DELETE
                  </button>
                  {selEv.link && selEv.link !== "—" && selEv.link !== "" && (
                    <button
                      type="button"
                      className="btn primary"
                      style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
                    >
                      JOIN ↗
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "22px 18px",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  fontFamily: "var(--mono)",
                }}
              >
                {loading
                  ? "Loading meetings…"
                  : "Click an event to see details, or + NEW MEETING to create one."}
              </div>
            )}
          </Card>

          <Card label="02.C — AVAILABILITY HOURS" spec="EAT · UTC+3">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["MON", "TUE", "WED", "THU", "FRI"].map((d) => (
                <div
                  key={d}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 1fr 24px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      letterSpacing: "0.14em",
                      color: "var(--ink-3)",
                    }}
                  >
                    {d}
                  </span>
                  <input
                    className="fld"
                    defaultValue="09:00"
                    style={{ padding: "6px 8px", fontSize: 12 }}
                  />
                  <input
                    className="fld"
                    defaultValue="17:00"
                    style={{ padding: "6px 8px", fontSize: 12 }}
                  />
                  <Dot color="var(--accent)" />
                </div>
              ))}
              {["SAT", "SUN"].map((d) => (
                <div
                  key={d}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 24px",
                    gap: 8,
                    alignItems: "center",
                    opacity: 0.55,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      letterSpacing: "0.14em",
                      color: "var(--ink-3)",
                    }}
                  >
                    {d}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    UNAVAILABLE
                  </span>
                  <Dot on={false} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ===== Analytics ===== */
export function Analytics() {
  const series = [
    120, 180, 220, 260, 290, 310, 420, 380, 460, 540, 580, 620, 700, 660,
  ];
  return (
    <div>
      <PageHead
        code="03"
        sub="WORKSPACE — ANALYTICS"
        title="Audience & traffic"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Chip>LAST 14 DAYS</Chip>
            <button className="btn">EXPORT CSV</button>
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 18,
        }}
      >
        {[
          {
            label: "UNIQUE VISITORS",
            v: "6,184",
            delta: "+24%",
            spark: [120, 180, 200, 260, 310, 420, 700],
            accent: true,
          },
          {
            label: "PAGE VIEWS",
            v: "14,902",
            delta: "+18%",
            spark: [300, 420, 500, 640, 780, 860, 1200],
          },
          {
            label: "AVG SESSION",
            v: "2m 14s",
            delta: "+0:18",
            spark: [80, 90, 95, 110, 120, 130, 134],
          },
          {
            label: "BOUNCE",
            v: "32%",
            delta: "-4%",
            spark: [40, 38, 38, 36, 35, 33, 32],
          },
        ].map(({ label, v, delta, spark, accent }) => {
          const max = Math.max(...spark, 1);
          const W = 130,
            H = 32;
          const pts = spark
            .map(
              (y, i) =>
                `${(i / (spark.length - 1)) * W},${H - (y / max) * H}`
            )
            .join(" ");
          return (
            <Card
              key={label}
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
                  style={{
                    fontSize: 36,
                    fontWeight: 500,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {v}
                </div>
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
                      accent
                        ? "rgba(212,255,61,0.18)"
                        : "rgba(20,17,10,0.08)"
                    }
                    stroke="none"
                  />
                </svg>
              </div>
            </Card>
          );
        })}
      </div>

      <Card label="03.A — TRAFFIC · 14D" spec="DAILY" style={{ marginBottom: 18 }}>
        <div style={{ position: "relative", height: 220 }}>
          <svg
            viewBox="0 0 800 220"
            preserveAspectRatio="none"
            style={{ width: "100%", height: "100%" }}
          >
            <defs>
              <pattern
                id="ana-grid"
                width="60"
                height="44"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 44"
                  fill="none"
                  stroke="var(--rule-soft)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="800" height="220" fill="url(#ana-grid)" />
            {(() => {
              const max = Math.max(...series);
              const pts = series
                .map(
                  (y, i) =>
                    `${(i / (series.length - 1)) * 800},${
                      220 - (y / max) * 200
                    }`
                )
                .join(" ");
              return (
                <>
                  <polyline
                    points={`${pts} 800,220 0,220`}
                    fill="rgba(212,255,61,0.25)"
                    stroke="none"
                  />
                  <polyline
                    points={pts}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth={1.5}
                  />
                  {series.map((y, i) => (
                    <circle
                      key={i}
                      cx={(i / (series.length - 1)) * 800}
                      cy={220 - (y / max) * 200}
                      r={3}
                      fill="var(--bg)"
                      stroke="var(--ink)"
                      strokeWidth={1.2}
                    />
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      </Card>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
      >
        <Card label="03.B — TOP PAGES" pad={0}>
          {[
            ["/", "4,210", 100],
            ["/projects", "1,840", 44],
            ["/devlog/offline-first-conflict-resolution", "1,402", 33],
            ["/work", "892", 21],
            ["/contact", "684", 16],
          ].map(([p, v, w]) => (
            <div
              key={String(p)}
              style={{
                padding: "12px 18px",
                borderBottom: "1px dashed var(--rule-soft)",
                display: "grid",
                gridTemplateColumns: "1fr 80px",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 12.5 }}>{p}</div>
                <div
                  style={{
                    height: 4,
                    background: "var(--rule-soft)",
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      width: `${w}%`,
                      height: "100%",
                      background: "var(--ink)",
                    }}
                  />
                </div>
              </div>
              <div
                className="num"
                style={{
                  fontSize: 13,
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </Card>
        <Card label="03.C — REFERRERS" pad={0}>
          {[
            ["github.com", "1,820"],
            ["news.ycombinator.com", "1,210"],
            ["linkedin.com", "604"],
            ["x.com / twitter", "421"],
            ["direct / —", "2,129"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                padding: "12px 18px",
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px dashed var(--rule-soft)",
                fontSize: 12.5,
              }}
            >
              <span>{k}</span>
              <span className="num" style={{ fontWeight: 600 }}>
                {v}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

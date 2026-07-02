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
  updateMeetingAction,
  deleteMeetingAction,
  type MeetingRecord,
} from "@/lib/cms/actions/meetings";
import { saveAvailabilitySettings } from "@/lib/cms/actions/settings";
import type { IntegrationRowDto } from "@/lib/cms/cms-settings-model";
import { DEFAULT_AVAILABILITY } from "@/lib/cms/cms-settings-model";
import type { WeeklyAvailability } from "@/lib/db/schema";

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
  gcalMeetLink: string | null;
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
    gcalMeetLink: m.gcalMeetLink,
  };
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
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

type MeetingForm = {
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

function emptyForm(weekStart: Date): MeetingForm {
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

function formFromEvent(ev: CalEvent): MeetingForm {
  const durationMin = Math.max(
    15,
    Math.round((ev.end.getTime() - ev.start.getTime()) / (60 * 1000)),
  );
  const kind = (KIND_OPTIONS as readonly string[]).includes(ev.kind)
    ? (ev.kind as MeetingForm["kind"])
    : "CLIENT";
  const status = (STATUS_OPTIONS as readonly string[]).includes(ev.status)
    ? (ev.status as MeetingForm["status"])
    : "Confirmed";
  return {
    title: ev.title,
    who: ev.who,
    kind,
    status,
    platform: ev.platform,
    link: ev.link,
    notes: ev.notes,
    date: toDateInputValue(ev.start),
    startHour: String(ev.start.getHours()).padStart(2, "0"),
    startMin: String(ev.start.getMinutes()).padStart(2, "0"),
    durationMin: DURATION_OPTIONS.includes(durationMin) ? durationMin : 60,
  };
}

const DAY_ORDER: (keyof WeeklyAvailability)[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

/* ===== MeetingsCalendar ===== */
export function MeetingsCalendar({
  initialAvailability = DEFAULT_AVAILABILITY,
}: {
  initialAvailability?: WeeklyAvailability;
}) {
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
  /** null = viewing; "new" = creating; event id = editing */
  const [formMode, setFormMode] = useState<null | "new" | string>(null);
  const [form, setForm] = useState<MeetingForm>(() => emptyForm(start));
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");

  const [availability, setAvailability] = useState<WeeklyAvailability>(
    initialAvailability,
  );
  const [availStatus, setAvailStatus] = useState("");

  useEffect(() => {
    setAvailability(initialAvailability);
  }, [initialAvailability]);

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

  const handleSubmit = () => {
    const [yStr, moStr, dStr] = form.date.split("-");
    const y = parseInt(yStr ?? "2026", 10);
    const mo = parseInt(moStr ?? "1", 10);
    const d = parseInt(dStr ?? "1", 10);
    const h = parseInt(form.startHour, 10);
    const m = parseInt(form.startMin, 10);
    const startTime = new Date(y, mo - 1, d, h, m, 0, 0);
    const endTime = new Date(startTime.getTime() + form.durationMin * 60 * 1000);

    const payload = {
      title: form.title,
      who: form.who,
      kind: form.kind,
      status: form.status,
      platform: form.platform,
      link: form.link,
      notes: form.notes,
      startTime,
      endTime,
    };

    const editingId = formMode !== "new" ? formMode : null;

    startTransition(async () => {
      try {
        if (editingId) {
          await updateMeetingAction(editingId, payload);
          setStatus("Meeting updated.");
        } else {
          await createMeetingAction(payload);
          setStatus("Meeting created.");
        }
        setFormMode(null);
        setForm(emptyForm(start));
        await loadEvents();
      } catch {
        setStatus("Could not save meeting. Check all fields.");
      }
    });
  };

  const handleSaveAvailability = () => {
    setAvailStatus("");
    startTransition(async () => {
      const res = await saveAvailabilitySettings(availability);
      setAvailStatus(res.message);
    });
  };

  const setDay = (
    day: keyof WeeklyAvailability,
    patch: Partial<WeeklyAvailability[keyof WeeklyAvailability]>,
  ) => {
    setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
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

  const joinHref = selEv
    ? (selEv.gcalMeetLink || selEv.link || "").trim()
    : "";

  return (
    <div>
      <PageHead
        code="02"
        sub="WORKSPACE — MEETINGS"
        title="Meetings & scheduling"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
                setForm(emptyForm(start));
                setFormMode("new");
                setSel(undefined);
              }}
            >
              + NEW MEETING
            </button>
          </div>
        }
      />

      <div className="cms-meetings-grid">
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
              gap: 10,
              flexWrap: "wrap",
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
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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

          {/* Calendar grid — scrolls horizontally on small screens */}
          <div className="cms-cal-scroll">
            <div className="cms-cal-grid keep-grid">
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
                          ? "var(--paper-tint)"
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
                            selected={e.id === sel && formMode === null}
                            onClick={() => {
                              setSel(e.id);
                              setFormMode(null);
                            }}
                          />
                        ))}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Card>

        {/* Side panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            label={
              formMode === "new"
                ? "02.B — NEW MEETING"
                : formMode
                  ? "02.B — EDIT MEETING"
                  : "02.B — SELECTED"
            }
            spec={
              formMode
                ? "DRAFT"
                : selEv
                  ? selEv.status.toUpperCase()
                  : "—"
            }
            pad={0}
          >
            {formMode !== null ? (
              /* ── Meeting form (create / edit) ── */
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
                      value={form.title}
                      placeholder="Meeting title"
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      style={{ padding: "7px 10px", fontSize: 13 }}
                    />
                  </div>
                  <div className="keep-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>WHO</div>
                      <input
                        className="fld"
                        value={form.who}
                        placeholder="Contact name"
                        onChange={(e) => setForm((f) => ({ ...f, who: e.target.value }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>KIND</div>
                      <select
                        className="fld"
                        value={form.kind}
                        onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as MeetingForm["kind"] }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      >
                        {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="keep-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>STATUS</div>
                      <select
                        className="fld"
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MeetingForm["status"] }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>PLATFORM</div>
                      <input
                        className="fld"
                        value={form.platform}
                        placeholder="Zoom, GMeet…"
                        onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>DATE</div>
                    <input
                      type="date"
                      className="fld"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      style={{ padding: "7px 10px", fontSize: 12 }}
                    />
                  </div>
                  <div className="keep-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>HOUR</div>
                      <select
                        className="fld"
                        value={form.startHour}
                        onChange={(e) => setForm((f) => ({ ...f, startHour: e.target.value }))}
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
                        value={form.startMin}
                        onChange={(e) => setForm((f) => ({ ...f, startMin: e.target.value }))}
                        style={{ padding: "7px 10px", fontSize: 12 }}
                      >
                        {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 4 }}>DURATION</div>
                      <select
                        className="fld"
                        value={form.durationMin}
                        onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
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
                      value={form.notes}
                      placeholder="Optional notes…"
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      style={{ padding: "7px 10px", fontSize: 12, resize: "vertical" }}
                    />
                  </div>
                  {formMode === "new" && form.status === "Confirmed" && (
                    <p style={{ fontSize: 10.5, color: "var(--ink-3)", margin: 0, lineHeight: 1.5 }}>
                      Confirmed meetings are pushed to Google Calendar with a
                      Meet link when the integration is configured.
                    </p>
                  )}
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
                    onClick={() => setFormMode(null)}
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    style={{ height: 30, padding: "0 14px", fontSize: 11 }}
                    disabled={isPending || !form.title.trim() || !form.date}
                    onClick={handleSubmit}
                  >
                    {isPending ? "SAVING…" : formMode === "new" ? "CREATE ✓" : "SAVE ✓"}
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
                  {joinHref && <Row k="LINK" v={joinHref} />}
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
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
                    disabled={isPending}
                    onClick={() => {
                      setForm(formFromEvent(selEv));
                      setFormMode(selEv.id);
                    }}
                  >
                    EDIT
                  </button>
                  {joinHref && (
                    <a
                      href={joinHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn primary"
                      style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
                    >
                      JOIN ↗
                    </a>
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

          <Card label="02.C — AVAILABILITY HOURS" spec="DRIVES PUBLIC BOOKING">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DAY_ORDER.map((day) => {
                const cfg = availability[day];
                return (
                  <div
                    key={day}
                    className="keep-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 1fr 44px",
                      gap: 8,
                      alignItems: "center",
                      opacity: cfg.enabled ? 1 : 0.55,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10.5,
                        letterSpacing: "0.14em",
                        color: "var(--ink-3)",
                      }}
                    >
                      {day.toUpperCase()}
                    </span>
                    <input
                      className="fld"
                      type="time"
                      value={cfg.start}
                      disabled={!cfg.enabled}
                      onChange={(e) => setDay(day, { start: e.target.value })}
                      style={{ padding: "6px 8px", fontSize: 12 }}
                    />
                    <input
                      className="fld"
                      type="time"
                      value={cfg.end}
                      disabled={!cfg.enabled}
                      onChange={(e) => setDay(day, { end: e.target.value })}
                      style={{ padding: "6px 8px", fontSize: 12 }}
                    />
                    <button
                      type="button"
                      title={cfg.enabled ? "Disable day" : "Enable day"}
                      onClick={() => setDay(day, { enabled: !cfg.enabled })}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        padding: 4,
                      }}
                    >
                      <Dot on={cfg.enabled} color="var(--accent)" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn primary"
                style={{ height: 30, padding: "0 14px", fontSize: 11 }}
                disabled={isPending}
                onClick={handleSaveAvailability}
              >
                {isPending ? "SAVING…" : "SAVE HOURS"}
              </button>
              {availStatus && (
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {availStatus}
                </span>
              )}
            </div>
            <p style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.5 }}>
              The public &ldquo;Book a call&rdquo; day and time slots come from
              these hours.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ===== Analytics ===== */
export function Analytics({
  plausible,
  primaryDomain,
}: {
  plausible?: IntegrationRowDto;
  primaryDomain?: string;
}) {
  const domain =
    plausible?.metadata?.domain?.trim() || primaryDomain || "cakeintech.com";
  const active = !!plausible?.enabled;

  return (
    <div>
      <PageHead
        code="03"
        sub="WORKSPACE — ANALYTICS"
        title="Audience & traffic"
        action={
          active ? (
            <a
              className="btn primary"
              style={{ height: 36, display: "inline-flex", alignItems: "center" }}
              href={`https://plausible.io/${encodeURIComponent(domain)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              OPEN PLAUSIBLE ↗
            </a>
          ) : undefined
        }
      />

      <Card label="03.A — STATUS" spec={active ? "CONNECTED" : "NOT CONNECTED"}>
        {active ? (
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>
            <p style={{ margin: "0 0 10px" }}>
              Analytics for <b>{domain}</b> are tracked with Plausible — a
              privacy-friendly, cookie-free analytics service.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)" }}>
              Visitor counts, top pages, and referrers live in the Plausible
              dashboard. No tracking data is stored in this CMS.
            </p>
          </div>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>
            <p style={{ margin: "0 0 10px" }}>
              No analytics provider is connected, so there is nothing to show
              here — this dashboard never displays sample numbers.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)" }}>
              Enable <b>Plausible Analytics</b> under System → Settings →
              Integrations and set the site domain to activate this view.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Chip } from "@/app/components/blueprint";
import {
  listInboundThreadsAction,
  markAllInboundReadAction,
  updateInboundStatusAction,
} from "@/lib/inbound/actions";
import type { InboundFilterKind, InboundThread } from "@/lib/inbound/types";
import { confirmBookingAction } from "@/lib/cms/actions/bookings";
import { Card, PageHead, Dot } from "../shell";

function formatThreadTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return d
    .toLocaleString("en", { month: "short", day: "2-digit" })
    .toUpperCase();
}

const FILTER_CHIPS: { id: InboundFilterKind; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "contact", label: "CONTACT" },
  { id: "booking", label: "BOOKING" },
  { id: "subscriber", label: "DEVLOG" },
];

export function Inbox() {
  const [threads, setThreads] = useState<InboundThread[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [filterKind, setFilterKind] = useState<InboundFilterKind>("all");
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      setLoadError(null);
      const res = await listInboundThreadsAction({
        kind: filterKind,
        search: search.trim() || undefined,
      });
      if (!res.ok) {
        if (res.error === "no_database") {
          setConfigured(false);
          setThreads([]);
        }
        return;
      }
      setConfigured(res.configured);
      setThreads(res.threads);
    });
  }, [filterKind, search]);

  useEffect(() => {
    const t = setTimeout(refresh, search.trim().length > 0 ? 220 : 0);
    return () => clearTimeout(t);
  }, [refresh]);

  const cur = useMemo(
    () => threads.find((t) => t.id === selId) ?? null,
    [threads, selId],
  );

  useEffect(() => {
    if (threads.length === 0) {
      setSelId(null);
      return;
    }
    if (!selId || !threads.some((t) => t.id === selId)) {
      setSelId(threads[0]!.id);
    }
  }, [threads, selId]);

  const unreadCount = useMemo(
    () => threads.filter((t) => t.unread).length,
    [threads],
  );

  async function handleMarkAllRead() {
    startTransition(async () => {
      const res = await markAllInboundReadAction();
      if (!res.ok) {
        setLoadError("Database is not configured.");
        return;
      }
      await refresh();
    });
  }

  async function handleMarkRead(thread: InboundThread) {
    const next =
      thread.kind === "booking"
        ? { status: "archived" as const }
        : { status: "read" as const };
    startTransition(async () => {
      const res = await updateInboundStatusAction({
        id: thread.id,
        status: next.status,
      });
      if (!res.ok) {
        setLoadError("Could not update status.");
        return;
      }
      await refresh();
    });
  }

  function handleConfirmBooking(thread: InboundThread) {
    const rawId = thread.id.replace(/^booking:/, "");
    setConfirmStatus("Confirming…");
    startTransition(async () => {
      const res = await confirmBookingAction(rawId);
      if (!res.ok) {
        setConfirmStatus(`Error: ${res.error}`);
        return;
      }
      setConfirmStatus(
        res.meetLink
          ? `Confirmed. Meet link: ${res.meetLink}`
          : "Confirmed. (Google Calendar not configured — no Meet link.)",
      );
      await refresh();
    });
  }

  async function handleArchive(thread: InboundThread) {
    if (thread.kind === "subscriber") {
      startTransition(async () => {
        const res = await updateInboundStatusAction({
          id: thread.id,
          status: "unsubscribed",
        });
        if (!res.ok) {
          setLoadError("Could not update subscriber.");
          return;
        }
        await refresh();
      });
      return;
    }
    startTransition(async () => {
      const res = await updateInboundStatusAction({
        id: thread.id,
        status: "archived",
      });
      if (!res.ok) {
        setLoadError("Could not archive.");
        return;
      }
      await refresh();
    });
  }

  const emptyCopy = !configured
    ? "Connect DATABASE_URL to load inquiries, bookings, and subscribers."
    : loadError ?? "No inbound items yet.";

  return (
    <div>
      <PageHead
        code="01"
        sub="WORKSPACE — INBOX"
        title={`Messages · ${unreadCount} unread`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn slash"
              style={{ height: 36 }}
              disabled={pending || !configured}
              onClick={() => void handleMarkAllRead()}
            >
              MARK ALL READ
            </button>
            <button
              type="button"
              className="btn primary"
              style={{ height: 36, opacity: 0.45 }}
              disabled
              title="Use your email client to compose."
            >
              + COMPOSE
            </button>
          </div>
        }
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        {FILTER_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="btn slash"
            style={{
              height: 30,
              padding: "0 12px",
              fontSize: 10,
              opacity: filterKind === c.id ? 1 : 0.55,
            }}
            onClick={() => setFilterKind(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 16,
          minHeight: 580,
        }}
      >
        <Card label="01.A — THREADS" pad={0}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px dashed var(--rule)",
            }}
          >
            <input
              className="fld"
              placeholder="Search inbox…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "8px 12px" }}
            />
          </div>
          <div>
            {threads.length === 0 ? (
              <div
                style={{
                  padding: "22px 16px",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  fontFamily: "var(--mono)",
                }}
              >
                {emptyCopy}
              </div>
            ) : (
              threads.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelId(m.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 16px",
                    borderBottom:
                      i === threads.length - 1
                        ? "none"
                        : "1px dashed var(--rule-soft)",
                    background:
                      selId === m.id
                        ? "var(--ink)"
                        : m.unread
                          ? "var(--paper-tint)"
                          : "transparent",
                    color: selId === m.id ? "var(--bg)" : "var(--ink)",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <Dot on={m.unread} color="var(--accent)" />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: m.unread ? 600 : 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.listLabel}
                      </span>
                      {m.secondary !== "—" && (
                        <span
                          style={{
                            fontSize: 10.5,
                            color:
                              selId === m.id
                                ? "rgba(255,255,255,0.5)"
                                : "var(--ink-3)",
                          }}
                        >
                          · {m.secondary}
                        </span>
                      )}
                    </div>
                    <span
                      className="num"
                      style={{
                        fontSize: 10,
                        color:
                          selId === m.id
                            ? "rgba(255,255,255,0.55)"
                            : "var(--ink-3)",
                      }}
                    >
                      {formatThreadTime(m.createdAtIso)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: m.unread ? 500 : 400,
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        selId === m.id
                          ? "rgba(255,255,255,0.55)"
                          : "var(--ink-3)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.preview}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card
          label="01.B — THREAD"
          spec={cur ? cur.id : "—"}
          pad={0}
        >
          {cur && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  padding: 22,
                  borderBottom: "1px dashed var(--rule)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip>{cur.tag}</Chip>
                  <Chip accent={false}>{cur.status}</Chip>
                  <Chip accent={false}>{cur.emailStatus}</Chip>
                  <span style={{ flex: 1 }} />
                  {cur.unread && (
                    <button
                      type="button"
                      className="btn slash"
                      style={{ height: 26, padding: "0 10px", fontSize: 10 }}
                      disabled={pending}
                      onClick={() => void handleMarkRead(cur)}
                    >
                      MARK READ
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn slash"
                    style={{ height: 26, padding: "0 10px", fontSize: 10 }}
                    disabled={pending}
                    onClick={() => void handleArchive(cur)}
                  >
                    {cur.kind === "subscriber" ? "UNSUBSCRIBE" : "ARCHIVE"}
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    marginBottom: 6,
                  }}
                >
                  {cur.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  <b style={{ color: "var(--ink)" }}>{cur.email}</b> ·{" "}
                  {formatThreadTime(cur.createdAtIso)}
                </div>
              </div>
              <div
                style={{
                  padding: 22,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                  flex: 1,
                }}
              >
                {cur.kind === "booking" && (
                  <p style={{ margin: "0 0 14px" }}>
                    <strong>Requested:</strong> {cur.requestedDay} at{" "}
                    {cur.requestedTime}
                  </p>
                )}
                {cur.message && (
                  <p style={{ margin: "0 0 14px", whiteSpace: "pre-wrap" }}>
                    {cur.message}
                  </p>
                )}
                {cur.kind === "booking" && cur.notes !== undefined && (
                  <p style={{ margin: "0 0 14px", whiteSpace: "pre-wrap" }}>
                    <strong>Notes:</strong> {cur.notes || "—"}
                  </p>
                )}
                {cur.kind === "booking" && cur.status !== "confirmed" && (
                  <div style={{ marginBottom: 14 }}>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ height: 32, fontSize: 12 }}
                      disabled={pending}
                      onClick={() => handleConfirmBooking(cur)}
                    >
                      CONFIRM + MEET
                    </button>
                    {confirmStatus && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "var(--ink-3)",
                          fontFamily: "var(--mono)",
                        }}
                      >
                        {confirmStatus}
                      </div>
                    )}
                  </div>
                )}
                {cur.kind === "booking" && cur.meetLink && (
                  <p style={{ margin: "0 0 14px" }}>
                    <strong>Meet link:</strong>{" "}
                    <a
                      href={cur.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent)", wordBreak: "break-all" }}
                    >
                      {cur.meetLink}
                    </a>
                  </p>
                )}
                {cur.kind === "subscriber" && (
                  <p style={{ margin: 0 }}>Newsletter signup — no message body.</p>
                )}
              </div>
              <div
                style={{
                  padding: 14,
                  borderTop: "1px dashed var(--rule)",
                  background: "var(--paper-tint)",
                }}
              >
                <textarea
                  className="fld"
                  rows={3}
                  placeholder="Draft a reply in your mail client…"
                  readOnly
                  title="Outbound mail is not wired from the CMS."
                  defaultValue=""
                  style={{
                    resize: "vertical",
                    marginBottom: 10,
                    fontFamily: "var(--mono)",
                    opacity: 0.65,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="btn slash"
                      style={{
                        height: 28,
                        padding: "0 10px",
                        fontSize: 11,
                        opacity: 0.45,
                      }}
                      disabled
                    >
                      + SCHEDULE CALL
                    </button>
                    <button
                      type="button"
                      className="btn slash"
                      style={{
                        height: 28,
                        padding: "0 10px",
                        fontSize: 11,
                        opacity: 0.45,
                      }}
                      disabled
                    >
                      INSERT TEMPLATE
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn primary"
                    style={{ height: 28, padding: "0 14px", fontSize: 11 }}
                    disabled
                  >
                    SEND →
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

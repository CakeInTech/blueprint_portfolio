"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BPFrame, Chip, SectionHead } from "./blueprint";
import type { Experience, Project } from "./data";

/* ===== Work Timeline ===== */
export function WorkTimeline({ items }: { items: Experience[] }) {
  return (
    <section
      id="work"
      style={{ position: "relative", padding: "80px 0", borderBottom: "1px dashed var(--rule)" }}
    >
      <div className="wrap">
        <SectionHead
          code="01"
          label="WORK — TIMELINE"
          title="Things I've shipped, jobs I've held."
          right={<Chip>RANGE 2023 — 2026 · {items.length} ENTRIES</Chip>}
        />
        <div style={{ marginTop: 36, position: "relative" }}>
          {/* Vertical spine */}
          <div
            className="resp-hide-mobile"
            style={{
              position: "absolute", left: 168, top: 6, bottom: 6, width: 1,
              backgroundImage:
                "linear-gradient(to bottom, var(--rule) 0, var(--rule) 4px, transparent 4px, transparent 9px)",
              backgroundSize: "1px 9px",
            }}
          />
          {items.map((it, i) => (
            <WorkEntry key={i} it={it} idx={i} last={i === items.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkEntry({
  it, idx, last,
}: {
  it: Experience;
  idx: number;
  last: boolean;
}) {
  const [open, setOpen] = useState(idx === 0);

  return (
    <div
      className="work-entry-grid"
      style={{ marginBottom: last ? 0 : 24 }}
    >
      {/* Date column */}
      <div style={{ paddingTop: 16, paddingRight: 24, textAlign: "right", color: "var(--ink-3)" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.04em" }}>{it.start}</div>
        <div style={{ fontSize: 11, color: "var(--ink-4)" }}>↓ {it.end}</div>
      </div>

      {/* Node + content */}
      <div style={{ position: "relative", paddingLeft: 36 }}>
        {/* Node */}
        <div style={{
          position: "absolute", left: -8, top: 18,
          width: 18, height: 18, display: "grid", placeItems: "center",
        }}>
          <div style={{
            width: 14, height: 14, background: "var(--bg)",
            border: it.current ? "1.5px solid var(--ink)" : "1px dashed var(--rule)",
            display: "grid", placeItems: "center",
          }}>
            {it.current && (
              <div style={{ width: 6, height: 6, background: "var(--accent)" }} />
            )}
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          style={{
            width: "100%", background: "transparent", border: 0,
            padding: 0, cursor: "pointer",
            fontFamily: "var(--mono)", color: "inherit", textAlign: "left",
          }}
        >
          <BPFrame
            borderStyle="dashed"
            pad={20}
            crosshair={false}
            style={{ background: open ? "var(--paper-tint)" : "transparent" }}
          >
            <div style={{
              display: "flex", alignItems: "baseline",
              justifyContent: "space-between", gap: 16,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
                    {it.co}
                  </span>
                  {it.current && <Chip accent>CURRENT</Chip>}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
                  {it.role}&nbsp;
                  <span style={{ color: "var(--ink-3)" }}>—</span>&nbsp;
                  <span style={{ color: "var(--ink-3)" }}>{it.loc}</span>
                </div>
              </div>
              <div style={{
                fontSize: 18, color: "var(--ink-3)",
                transition: "transform .15s",
                transform: open ? "rotate(45deg)" : "none",
              }}>
                +
              </div>
            </div>

            {open && (
              <ul style={{
                listStyle: "none", margin: "18px 0 0", padding: 0,
                borderTop: "1px dashed var(--rule)", paddingTop: 16,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                {it.bullets.map((b, j) => (
                  <li
                    key={j}
                    style={{
                      fontSize: 13.5, color: "var(--ink-2)",
                      lineHeight: 1.55, paddingLeft: 22, position: "relative",
                    }}
                  >
                    <span style={{
                      position: "absolute", left: 0, top: 0,
                      fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.08em",
                    }}>
                      {String(j + 1).padStart(2, "0")}
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </BPFrame>
        </button>
      </div>
    </div>
  );
}

/* ===== Projects Mosaic ===== */
export function ProjectsMosaic({ projects }: { projects: Project[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleProject = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  const spans: Record<string, { c: number; r: number }> = {
    sm: { c: 1, r: 1 },
    md: { c: 2, r: 1 },
    lg: { c: 2, r: 2 },
  };

  return (
    <section
      id="projects"
      style={{ position: "relative", padding: "80px 0", borderBottom: "1px dashed var(--rule)" }}
    >
      <div className="wrap">
        <SectionHead
          code="02"
          label="PROJECTS — MOSAIC"
          title="Shipped, scoped, in production."
          right={<Chip>SHOWING {projects.length} OF 14</Chip>}
        />
        <div className="projects-grid">
          {projects.map((p) => (
            <ProjectTile
              key={p.id}
              projectId={p.id}
              p={p}
              colSpan={spans[p.size].c}
              rowSpan={spans[p.size].r}
              expanded={expandedId === p.id}
              onActivate={toggleProject}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const ProjectTile = memo(function ProjectTile({
  p,
  projectId,
  colSpan,
  rowSpan,
  expanded,
  onActivate,
}: {
  p: Project;
  projectId: string;
  colSpan: number;
  rowSpan: number;
  expanded: boolean;
  onActivate: (id: string) => void;
}) {
  return (
    <article
      className="project-tile"
      data-expanded={expanded ? "true" : "false"}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      aria-label={`${p.name} project${expanded ? ", expanded" : ""}. Press Enter or Space to toggle details.`}
      onClick={() => onActivate(projectId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(projectId);
        }
      }}
      style={{
        position: "relative", display: "flex", flexDirection: "column",
        gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}`,
      }}
    >
      <BPFrame
        className="project-tile-frame"
        borderStyle="dashed"
        pad={0}
        label={`02.${p.id.slice(0, 3).toUpperCase()}`}
        spec={p.year}
        style={{
          flex: 1, display: "flex", flexDirection: "column",
        }}
      >
        {/* Visual block */}
        <div style={{
          position: "relative",
          flex: p.size === "lg" ? 1.4 : 1,
          minHeight: p.size === "sm" ? 90 : 130,
          borderBottom: "1px dashed var(--rule)",
          overflow: "hidden",
          background: p.color || "transparent",
        }}>
          {!p.color && (
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage:
                "repeating-linear-gradient(-45deg, var(--rule-soft) 0, var(--rule-soft) 1px, transparent 1px, transparent 9px)",
              opacity: 0.55,
            }} />
          )}
          <ProjectVisualLazy p={p} />
          {p.tag && (
            <div style={{
              position: "absolute", top: 10, right: 10,
              padding: "3px 7px", background: "var(--ink)", color: "var(--bg)",
              fontSize: 9.5, letterSpacing: "0.14em",
            }}>
              {p.tag.toUpperCase()}
            </div>
          )}
        </div>

        {/* Text block */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ fontSize: p.size === "sm" ? 15 : 19, letterSpacing: "-0.01em", fontWeight: 600 }}>
              {p.name}
            </h3>
            <span style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em" }}>
              {p.kind.toUpperCase()}
            </span>
          </div>
          {(p.size !== "sm" || expanded) && (
            <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, margin: 0 }}>{p.blurb}</p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
            {p.stack.map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 10.5, letterSpacing: "0.04em", padding: "2px 7px",
                  border: "1px dashed var(--rule)", color: "var(--ink-2)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
          {p.metrics.length > 0 && (p.size !== "sm" || expanded) && (
            <div style={{
              display: "flex", gap: 18, marginTop: 6,
              paddingTop: 10, borderTop: "1px dashed var(--rule-soft)",
            }}>
              {p.metrics.map((m, i) => (
                <div key={i}>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>{m.v}</div>
                  <div style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.16em" }}>
                    {m.k.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </BPFrame>
    </article>
  );
});

/** Defer heavy SVG schematics until the tile is near the viewport. */
function ProjectVisualLazy({ p }: { p: Project }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mountVisual, setMountVisual] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || mountVisual) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setMountVisual(true);
        io.disconnect();
      },
      { root: null, rootMargin: "280px 0px 200px 0px", threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [mountVisual, p.id]);

  return (
    <div ref={hostRef} style={{ position: "absolute", inset: 0 }}>
      {mountVisual ? (
        <ProjectVisual p={p} />
      ) : (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(-45deg, var(--rule-soft) 0, var(--rule-soft) 1px, transparent 1px, transparent 10px)",
            opacity: 0.35,
          }}
        />
      )}
    </div>
  );
}

/* ===== Schematic project visuals ===== */
function ProjectVisual({ p }: { p: Project }) {
  if (p.id === "luul") return <LuulVisual />;
  if (p.id === "meftaha") return <MeftaHaVisual />;
  if (p.id === "daad") return <DaadVisual />;
  if (p.id === "breviswork") return <BrevisVisual />;
  if (p.id === "sufast") return <SufastVisual />;
  if (p.id === "redwan") return <RedwanVisual />;
  if (p.id === "artisan") return <ArtisanVisual />;
  if (p.id === "fayda") return <FaydaVisual />;
  return null;
}

function LuulVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 20 }}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <defs>
          <pattern id="lu-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="200" fill="url(#lu-grid)" />
        <g fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="1.5">
          <rect x="20" y="20" width="100" height="70" />
          <rect x="120" y="20" width="80" height="70" />
          <rect x="200" y="20" width="120" height="70" />
          <rect x="20" y="90" width="180" height="90" />
          <rect x="200" y="90" width="120" height="90" />
          <rect x="320" y="20" width="60" height="160" />
        </g>
        <g fontSize="9" fontFamily="var(--mono)" fill="rgba(0,0,0,0.7)">
          <text x="30" y="40">SUITE 301</text>
          <text x="30" y="52" fill="#0a7d3a">● OCCUPIED</text>
          <text x="130" y="40">302</text>
          <text x="130" y="52" fill="#d4a72c">○ CLEANING</text>
          <text x="210" y="40">DBL 303</text>
          <text x="210" y="52" fill="rgba(0,0,0,0.5)">— VACANT</text>
          <text x="30" y="110">CONFERENCE A</text>
          <text x="210" y="110">DBL 304</text>
          <text x="330" y="40">STAIR</text>
        </g>
        <circle cx="78" cy="35" r="3" fill="#0a7d3a" />
        <circle cx="155" cy="35" r="3" fill="#d4a72c" />
      </svg>
    </div>
  );
}

function MeftaHaVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 16 }}>
      <svg viewBox="0 0 320 140" style={{ width: "100%", height: "100%" }}>
        <g fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.7)">
          {["MON","TUE","WED","THU","FRI","SAT","SUN"].map((d, i) => (
            <text key={d} x={20 + i * 42} y="20">{d}</text>
          ))}
        </g>
        <rect x="20" y="32" width="120" height="14" fill="rgba(0,0,0,0.85)" />
        <text x="26" y="42" fontFamily="var(--mono)" fontSize="9" fill="#f4ecd1">SUITE A · MR. KEDIR</text>
        <rect x="62" y="50" width="160" height="14" fill="rgba(212,255,61,0.85)" />
        <text x="68" y="60" fontFamily="var(--mono)" fontSize="9">DBL 12 · DUFRESNE</text>
        <rect x="104" y="68" width="80" height="14" stroke="rgba(0,0,0,0.6)" strokeDasharray="3 2" fill="none" />
        <text x="110" y="78" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.5)">HOLD</text>
        <rect x="146" y="86" width="120" height="14" fill="rgba(0,0,0,0.4)" />
        <g transform="translate(20,114)">
          <circle r="3" fill="#0a7d3a" />
          <text x="8" y="3" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.7)">SYNCED · 3 DEVICES</text>
        </g>
      </svg>
    </div>
  );
}

function DaadVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 14 }}>
      <svg viewBox="0 0 320 140" style={{ width: "100%", height: "100%" }}>
        <path d="M 20 110 Q 80 30 160 70 T 300 40" fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx="20" cy="110" r="5" fill="rgba(0,0,0,0.9)" />
        <text x="32" y="113" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.8)">HOME</text>
        <circle cx="300" cy="40" r="5" fill="rgba(0,0,0,0.9)" />
        <text x="266" y="32" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.8)">SCHOOL</text>
        <g transform="translate(146,55)">
          <rect x="-12" y="-7" width="24" height="14" fill="#d4ff3d" stroke="rgba(0,0,0,0.85)" strokeWidth="1.2" />
          <text y="3" fontFamily="var(--mono)" fontSize="8" textAnchor="middle">BUS-04</text>
        </g>
        <g transform="translate(20,16)">
          <rect width="36" height="36" fill="rgba(0,0,0,0.92)" />
          {Array.from({ length: 5 }).map((_, i) =>
            Array.from({ length: 5 }).map((_, j) =>
              (i + j) % 2 === 0 && i !== 4 && j !== 4 ? (
                <rect key={`${i}-${j}`} x={4 + i * 5.5} y={4 + j * 5.5} width="4" height="4" fill="#d4ff3d" />
              ) : null
            )
          )}
        </g>
        <text x="62" y="28" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.75)">STUDENT 7891</text>
        <text x="62" y="40" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.55)">SCANNED · 14:32</text>
      </svg>
    </div>
  );
}

function BrevisVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 16 }}>
      <svg viewBox="0 0 320 200" style={{ width: "100%", height: "100%" }}>
        <text x="16" y="20" fontFamily="var(--mono)" fontSize="10" fontWeight="600" fill="rgba(0,0,0,0.85)">CLINIC ↔ PROFESSIONAL</text>
        <line x1="16" y1="28" x2="304" y2="28" stroke="rgba(0,0,0,0.4)" strokeDasharray="3 2" />
        {([
          ["DR. A. MOHAMED", "PERIO · 5y", "TODAY 14:00"],
          ["DR. L. WANJIRU", "ORTHO · 8y", "TODAY 16:30"],
          ["HYG. M. TADESSE", "HYG · 3y",  "TOMORROW"],
        ] as [string, string, string][]).map(([n, r, t], i) => (
          <g key={i} transform={`translate(16,${44 + i * 48})`}>
            <rect width="288" height="38" fill="none" stroke="rgba(0,0,0,0.5)" strokeDasharray="3 2" />
            <circle cx="20" cy="19" r="10" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
            <text x="40" y="16" fontFamily="var(--mono)" fontSize="10" fontWeight="600">{n}</text>
            <text x="40" y="29" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.55)">{r}</text>
            <rect x="200" y="9" width="78" height="20" fill={i === 0 ? "#d4ff3d" : "transparent"} stroke="rgba(0,0,0,0.7)" />
            <text x="239" y="23" textAnchor="middle" fontFamily="var(--mono)" fontSize="9">{t}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function SufastVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 14 }}>
      <svg viewBox="0 0 280 110" style={{ width: "100%", height: "100%" }}>
        <path d="M 20 80 Q 100 20 160 50 T 260 30" fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="1.4" strokeDasharray="2 2" />
        <text x="20" y="20" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.7)">SFE-2104 · DAR → NBO → AMS</text>
        <g transform="translate(160,50) rotate(-22)">
          <path d="M -8 0 L 8 0 M 0 -3 L 4 0 L 0 3 M -3 -1 L -3 1 M -5 -2 L -5 2" stroke="rgba(0,0,0,0.85)" strokeWidth="1.4" fill="none" />
        </g>
        <circle cx="260" cy="30" r="3.5" fill="rgba(0,0,0,0.85)" />
      </svg>
    </div>
  );
}

function RedwanVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 14 }}>
      <svg viewBox="0 0 280 110" style={{ width: "100%", height: "100%" }}>
        {(["TODO", "DOING", "DONE"] as const).map((c, i) => (
          <g key={c} transform={`translate(${16 + i * 88}, 14)`}>
            <text fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.6)" letterSpacing="1.5">{c}</text>
            {[0, 1, 2].slice(0, 3 - i).map((j) => (
              <rect key={j} x="0" y={12 + j * 22} width="76" height="18"
                fill={i === 2 && j === 0 ? "#d4ff3d" : "none"}
                stroke="rgba(0,0,0,0.6)" strokeDasharray="3 2" />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

function ArtisanVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 14 }}>
      <svg viewBox="0 0 280 110" style={{ width: "100%", height: "100%" }}>
        <text x="16" y="20" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.7)">MENU · BREW</text>
        <circle cx="60" cy="60" r="22" fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="1.2" />
        <circle cx="60" cy="60" r="13" fill="rgba(0,0,0,0.85)" />
        <text x="100" y="56" fontFamily="var(--mono)" fontSize="10" fontWeight="600">Yirgacheffe</text>
        <text x="100" y="68" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.55)">Floral · Citrus · 4.40</text>
        <text x="100" y="86" fontFamily="var(--mono)" fontSize="9" fill="rgba(0,0,0,0.7)">[ORDER ON WHATSAPP →]</text>
      </svg>
    </div>
  );
}

function FaydaVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 14 }}>
      <svg viewBox="0 0 280 110" style={{ width: "100%", height: "100%" }}>
        <rect x="16" y="14" width="120" height="76" fill="none" stroke="rgba(0,0,0,0.7)" strokeDasharray="3 2" />
        <rect x="22" y="20" width="30" height="38" fill="rgba(0,0,0,0.12)" stroke="rgba(0,0,0,0.6)" />
        <line x1="58" y1="26" x2="130" y2="26" stroke="rgba(0,0,0,0.6)" />
        <line x1="58" y1="34" x2="118" y2="34" stroke="rgba(0,0,0,0.4)" />
        <line x1="58" y1="42" x2="124" y2="42" stroke="rgba(0,0,0,0.4)" />
        <text x="22" y="76" fontFamily="var(--mono)" fontSize="8" fill="rgba(0,0,0,0.6)">FAYDA · NATIONAL ID</text>
        <g transform="translate(160,28)">
          <path d="M 0 18 L 14 32 L 38 6" fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth="2.5" strokeLinecap="round" />
          <text x="0" y="60" fontFamily="var(--mono)" fontSize="9">VERIFIED · 0.4s</text>
        </g>
      </svg>
    </div>
  );
}

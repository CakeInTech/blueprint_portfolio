"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext,
  CSSProperties,
  ReactNode,
} from "react";

export const BPStyleContext = createContext<string | null>(null);

/* ===== Hand-drawn frame ===== */
function seeded(seed: number) {
  let s = seed | 0;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function roughLine(
  x1: number, y1: number,
  x2: number, y2: number,
  rnd: () => number,
  segs = 12, jitter = 1.4
): string {
  const dx = x2 - x1, dy = y2 - y1;
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const jx = (rnd() - 0.5) * jitter * (i < segs ? 1 : 0);
    const jy = (rnd() - 0.5) * jitter * (i < segs ? 1 : 0);
    d += ` L ${x1 + dx * t + jx} ${y1 + dy * t + jy}`;
  }
  return d;
}

export function HandFrame({
  passes = 2,
  inset = 0,
  jitter = 1.6,
  seed = 7,
  dashed = false,
  style,
}: {
  passes?: number;
  inset?: number;
  jitter?: number;
  seed?: number;
  dashed?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !el.parentElement) return;
    const parent = el.parentElement;
    const measure = () => {
      const w = Math.round(parent.offsetWidth);
      const h = Math.round(parent.offsetHeight);
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    const t = setTimeout(measure, 250);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  const { w, h } = box;
  const paths = useMemo(() => {
    if (w < 4 || h < 4) return [];
    const out: string[] = [];
    for (let p = 0; p < passes; p++) {
      const rnd = seeded(seed + p * 17);
      const off = p === 0 ? 0 : (rnd() - 0.5) * 1.4;
      const x0 = inset + off, y0 = inset + off;
      const x1 = w - inset - off, y1 = h - inset - off;
      const segs = Math.max(8, Math.round(((x1 - x0) + (y1 - y0)) / 28));
      out.push(roughLine(x0, y0, x1, y0, rnd, segs, jitter));
      out.push(roughLine(x1, y0, x1, y1, rnd, segs, jitter));
      out.push(roughLine(x1, y1, x0, y1, rnd, segs, jitter));
      out.push(roughLine(x0, y1, x0, y0, rnd, segs, jitter));
    }
    return out;
  }, [w, h, passes, inset, jitter, seed]);

  return (
    <svg
      ref={ref}
      width={w}
      height={h}
      viewBox={`0 0 ${w || 1} ${h || 1}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", overflow: "visible",
        color: "var(--ink)",
        ...style,
      }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeDasharray={dashed ? "6 4" : undefined}
          opacity={i % paths.length < paths.length / 2 ? 0.85 : 0.55}
        />
      ))}
    </svg>
  );
}

/* ===== Corner crosshairs ===== */
export function Crosshairs({
  size = 20,
  offset,
  color,
  strokeWidth = 1.75,
}: {
  size?: number;
  offset?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const off = offset == null ? -size / 2 : offset;
  const arms = (
    <>
      <line x1={0} y1={size / 2} x2={size} y2={size / 2}
        stroke={color || "var(--ink)"} strokeWidth={strokeWidth} strokeLinecap="square" />
      <line x1={size / 2} y1={0} x2={size / 2} y2={size}
        stroke={color || "var(--ink)"} strokeWidth={strokeWidth} strokeLinecap="square" />
    </>
  );
  const sty = (pos: CSSProperties): CSSProperties => ({
    position: "absolute", width: size, height: size, pointerEvents: "none", ...pos,
  });
  return (
    <>
      <svg style={sty({ top: off, left: off })} viewBox={`0 0 ${size} ${size}`}>{arms}</svg>
      <svg style={sty({ top: off, right: off })} viewBox={`0 0 ${size} ${size}`}>{arms}</svg>
      <svg style={sty({ bottom: off, left: off })} viewBox={`0 0 ${size} ${size}`}>{arms}</svg>
      <svg style={sty({ bottom: off, right: off })} viewBox={`0 0 ${size} ${size}`}>{arms}</svg>
    </>
  );
}

/* ===== BPFrame ===== */
export function BPFrame({
  children,
  borderStyle,
  crosshair = true,
  label,
  spec,
  pad = 20,
  bg,
  slash = false,
  className = "",
  style = {},
}: {
  children?: ReactNode;
  borderStyle?: string;
  crosshair?: boolean;
  label?: string;
  spec?: string;
  pad?: number;
  bg?: string;
  slash?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const override = useContext(BPStyleContext);
  const effective = override || borderStyle || "dashed";
  const isHand = effective === "hand";

  return (
    <div
      className={`bp-block ${className}`}
      style={{
        position: "relative",
        padding: pad,
        background: bg,
        color: "var(--ink)",
        ...style,
      }}
    >
      {!isHand && (
        <div
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            border:
              effective === "double" ? "3px double var(--rule)"
              : effective === "solid" ? "1.25px solid var(--rule)"
              : "1.25px dashed var(--rule)",
          }}
        />
      )}
      {isHand && <HandFrame key={`hf-${effective}`} jitter={1.4} passes={2} />}
      {slash && (
        <div
          style={{
            position: "absolute", inset: 0, opacity: 0.5,
            backgroundImage:
              "repeating-linear-gradient(-45deg, var(--rule-soft) 0, var(--rule-soft) 1px, transparent 1px, transparent var(--slash-density, 7px))",
            pointerEvents: "none",
          }}
        />
      )}
      {crosshair && <Crosshairs />}
      {label && (
        <div
          style={{
            position: "absolute", top: -7, left: 14,
            background: "var(--bg)", padding: "0 8px",
            fontSize: 10, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "var(--ink-3)",
            lineHeight: 1, zIndex: 2,
          }}
        >
          {label}
        </div>
      )}
      {spec && (
        <div
          style={{
            position: "absolute", top: -7, right: 14,
            background: "var(--bg)", padding: "0 8px",
            fontSize: 10, letterSpacing: "0.12em",
            color: "var(--ink-3)", lineHeight: 1, zIndex: 2,
          }}
        >
          {spec}
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ===== Slash fill ===== */
export function Slash({
  angle = -45,
  gap,
  color,
  style,
}: {
  angle?: number;
  gap?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const gapValue = gap != null ? `${gap}px` : "var(--slash-density, 7px)";
  return (
    <div
      style={{
        backgroundImage: `repeating-linear-gradient(${angle}deg, ${color || "var(--rule-soft)"} 0, ${color || "var(--rule-soft)"} 1px, transparent 1px, transparent ${gapValue})`,
        ...style,
      }}
    />
  );
}

/* ===== Dimension line ===== */
export function DimLine({
  length = 200,
  label = "1920mm",
  vertical = false,
  style,
}: {
  length?: number;
  label?: string;
  vertical?: boolean;
  style?: CSSProperties;
}) {
  const stroke = "var(--rule)";
  return vertical ? (
    <svg width={20} height={length} style={style} viewBox={`0 0 20 ${length}`}>
      <line x1={10} y1={4} x2={10} y2={length - 4} stroke={stroke} strokeWidth={1} />
      <line x1={4} y1={4} x2={16} y2={4} stroke={stroke} strokeWidth={1} />
      <line x1={4} y1={length - 4} x2={16} y2={length - 4} stroke={stroke} strokeWidth={1} />
      <text x={10} y={length / 2} fontSize={10} fill="var(--ink-3)"
        textAnchor="middle" transform={`rotate(-90, 10, ${length / 2})`}>
        <tspan dx={0} dy={-4}>{label}</tspan>
      </text>
    </svg>
  ) : (
    <svg width={length} height={20} style={style} viewBox={`0 0 ${length} 20`}>
      <line x1={4} y1={10} x2={length - 4} y2={10} stroke={stroke} strokeWidth={1} />
      <line x1={4} y1={4} x2={4} y2={16} stroke={stroke} strokeWidth={1} />
      <line x1={length - 4} y1={4} x2={length - 4} y2={16} stroke={stroke} strokeWidth={1} />
      <text x={length / 2} y={8} fontSize={10} fill="var(--ink-3)" textAnchor="middle">{label}</text>
    </svg>
  );
}

/* ===== Chip ===== */
export function Chip({
  children,
  accent = false,
  style,
  className,
}: {
  children: ReactNode;
  accent?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", height: 22,
        padding: "0 8px", fontSize: 11, letterSpacing: "0.04em",
        border: "1px var(--border-style, dashed) var(--rule)",
        background: accent ? "var(--accent)" : "transparent",
        color: accent ? "var(--accent-ink)" : "var(--ink-2)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ===== Live status ===== */
export function Live({ label = "AVAILABLE FOR WORK" }: { label?: string }) {
  return (
    <span
      className="live-label"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        fontSize: 10.5, letterSpacing: "0.14em", color: "var(--ink-2)",
      }}
    >
      <span
        style={{
          width: 7, height: 7, borderRadius: 999, background: "#5fbf6a",
          animation: "pulse 1.8s ease-out infinite",
        }}
      />
      {label}
    </span>
  );
}

/* ===== Monogram (CIT logo) ===== */
export function Monogram({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
      <rect x={1.5} y={1.5} width={37} height={37} fill="none"
        stroke="var(--ink)" strokeWidth={1.25} strokeDasharray="3 2" />
      <rect x={1.5} y={1.5} width={37} height={37} fill="none"
        stroke="var(--ink)" strokeWidth={0.6} transform="translate(1.2, 0.7)" opacity={0.6} />
      <text x={20} y={26} textAnchor="middle" fontFamily="var(--mono)"
        fontSize={14} fontWeight={600} fill="var(--ink)" letterSpacing="0.02em">CIT</text>
      <line x1={1.5} y1={32} x2={38.5} y2={32} stroke="var(--ink)" strokeWidth={0.6} opacity={0.5} />
    </svg>
  );
}

/* ===== Section Header ===== */
export function SectionHead({
  code,
  label,
  title,
  right,
}: {
  code: string;
  label: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "flex-end",
        justifyContent: "space-between",
        borderBottom: "1px dashed var(--rule)",
        paddingBottom: 16, gap: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 10.5, letterSpacing: "0.18em", color: "var(--ink-3)", marginBottom: 8 }}>
          <span>{code}</span> · {label}
        </div>
        <h2 style={{ fontSize: "clamp(22px, 4vw, 38px)", letterSpacing: "-0.025em", fontWeight: 500 }}>
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

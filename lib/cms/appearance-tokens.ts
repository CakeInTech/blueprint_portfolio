import { DEFAULT_APPEARANCE } from "@/lib/cms/cms-settings-model";

/** Normalize stored accent to #rrggbb or fall back to default. */
export function normalizeHex6Accent(accent: string): string {
  const t = accent.trim();
  const m = /^#([0-9A-Fa-f]{6})$/.exec(t);
  if (m) return `#${m[1].toLowerCase()}`;
  return DEFAULT_APPEARANCE.accent;
}

function srgbChannelToLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance 0–1 for #rrggbb (sRGB). */
export function relativeLuminance(hex: string): number {
  const n = normalizeHex6Accent(hex).slice(1);
  const r = srgbChannelToLinear(parseInt(n.slice(0, 2), 16));
  const g = srgbChannelToLinear(parseInt(n.slice(2, 4), 16));
  const b = srgbChannelToLinear(parseInt(n.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Text color on top of accent fills (buttons, chips).
 * Picks dark vs light ink from accent luminance (not page theme).
 */
export function accentInkForAccent(accentHex: string): string {
  return relativeLuminance(accentHex) > 0.55 ? "#14110a" : "#ece6d6";
}

/**
 * CSS `border-style` for `.btn` / `.fld` — `hand` uses SVG frames, not this property.
 */
export function cssBorderStyleFromCms(borderStyle: string): string {
  if (borderStyle === "dashed" || borderStyle === "double" || borderStyle === "solid") {
    return borderStyle;
  }
  if (borderStyle === "hand") return "dashed";
  return "dashed";
}

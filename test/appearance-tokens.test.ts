import { describe, expect, it } from "vitest";
import {
  accentInkForAccent,
  cssBorderStyleFromCms,
  normalizeHex6Accent,
  relativeLuminance,
} from "@/lib/cms/appearance-tokens";
import { DEFAULT_APPEARANCE } from "@/lib/cms/cms-settings-model";

describe("appearance-tokens", () => {
  it("normalizeHex6Accent lowercases valid hex", () => {
    expect(normalizeHex6Accent("#D4FF3D")).toBe("#d4ff3d");
  });

  it("normalizeHex6Accent falls back for invalid input", () => {
    expect(normalizeHex6Accent("not-a-color")).toBe(DEFAULT_APPEARANCE.accent);
    expect(normalizeHex6Accent("#fff")).toBe(DEFAULT_APPEARANCE.accent);
  });

  it("relativeLuminance orders light above dark accents", () => {
    expect(relativeLuminance("#ffffff")).toBeGreaterThan(
      relativeLuminance("#14110a"),
    );
  });

  it("accentInkForAccent picks dark ink on light accents", () => {
    expect(accentInkForAccent("#ffffff")).toBe("#14110a");
    expect(accentInkForAccent("#d4ff3d")).toBe("#14110a");
  });

  it("accentInkForAccent picks light ink on dark accents", () => {
    expect(accentInkForAccent("#14110a")).toBe("#ece6d6");
  });

  it("cssBorderStyleFromCms maps hand to dashed and passes through CSS styles", () => {
    expect(cssBorderStyleFromCms("hand")).toBe("dashed");
    expect(cssBorderStyleFromCms("dashed")).toBe("dashed");
    expect(cssBorderStyleFromCms("double")).toBe("double");
    expect(cssBorderStyleFromCms("solid")).toBe("solid");
    expect(cssBorderStyleFromCms("unknown")).toBe("dashed");
  });
});

import sharp from "sharp";

/** 2× the 88px hero slot for crisp display */
export const HERO_PROFILE_PX = 176;

/** Matches `:root` blueprint tokens (`--bg`). */
const HERO_BG = "#ece6d6";

/**
 * Pre-rendered 176×176 transparent PNG of the blueprint dashed frame
 * (#14110a rule, 1.5px, 6/5 dash). Rendered once at authoring time and
 * embedded so the runtime never assembles or rasterizes SVG — Turbopack's
 * production minifier mangled the previous concatenated SVG template
 * literal, which made libvips fail on every hero upload in production.
 */
const HERO_FRAME_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAALAAAACwCAYAAACvt+ReAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB3klEQVR42u3ZwY6CMABF0bdVFoTgB/Fp/rlaEwzUdIslnpOwmelqcjOBvszjsMzT5d56suGss72dTfnBbbo+Wo+zzvZ89nM4AByj/NP9ep0AAcORAa9ffP4knDNgH3EIGAQMAuY/vFe51/ebgDl/yQJGwABY4hAwmJLBPTAIGAGDgCGmZLDEIWAALHEIGEzJ4B4YBIyAQcAQUzJY4hAwAJY4BCxgTMngHhgEjIBBwBBTMljiEDAAljgQMKZkcA8MAkbAAkbAEFMyWOIQMACWOBAwpmRwDwwCBgEjYIgpGSxxCFjAAJY4EDCmZHAPDAIGASNgiCkZLHEgYABLHAgYU7KScQ8MAgYBI2CIKRkscSBgAEscCBgBm5JxDwwCBgEjYIgpGSxxIGAASxwIGEzJuAcGAYOAEbCAiSkZLHEgYABLHAgYTMm4BwYBg4BBwMSUDJY4EDCAJQ4EDKZk3AODgEHAIGBiSgZLHAgYwBIHAgZTMu6BfcQhYBAwCJiYksESBwIGsMSBgMGUjIDdAyNgEDAImJiSwRIHAgawxIGAwZQM7oERMAgYBExMyaZkLHEgYABLHAgYTMngHhgBwxkC3j71K0X9e2ed7eHs7h1495SJLtVs13qcdfZXZ8dheQK9MnoLV8d31wAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Square-crop, flatten to paper background, composite the blueprint dashed
 * frame, emit WebP for the spec-card hero slot.
 */
export async function buildHeroProfileWebp(input: Buffer): Promise<Buffer> {
  const base = await sharp(input)
    .rotate()
    .resize(HERO_PROFILE_PX, HERO_PROFILE_PX, {
      fit: "cover",
      position: "attention",
    })
    .flatten({ background: HERO_BG })
    .toBuffer();

  return sharp(base)
    .composite([{ input: HERO_FRAME_PNG, blend: "over" }])
    .webp({ quality: 86, effort: 5 })
    .toBuffer();
}

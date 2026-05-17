import sharp from "sharp";

/** 2× the 88px hero slot for crisp display */
export const HERO_PROFILE_PX = 176;

/** Matches `:root` blueprint tokens (`--bg`, `--rule`, dashed cadence). */
const HERO_BG = "#ece6d6";
const HERO_RULE = "#14110a";
const DASH_PATTERN = "6 5";

/**
 * Square-crop, flatten to paper background, composite blueprint-style dashed rule
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

  const borderSvg = Buffer.from(
    `<svg width="${HERO_PROFILE_PX}" height="${HERO_PROFILE_PX}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="1.25" y="1.25" width="${HERO_PROFILE_PX - 2.5}" height="${
        HERO_PROFILE_PX - 2.5
      }" fill="none" stroke="${HERO_RULE}" stroke-width="1.5" ` +
      `stroke-dasharray="${DASH_PATTERN}" stroke-linecap="square"/>` +
      `</svg>`,
  );

  return sharp(base)
    .composite([{ input: borderSvg, blend: "over" }])
    .webp({ quality: 86, effort: 5 })
    .toBuffer();
}

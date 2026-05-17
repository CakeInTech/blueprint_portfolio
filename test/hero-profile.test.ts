import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { buildHeroProfileWebp, HERO_PROFILE_PX } from "@/lib/images/hero-profile";

describe("buildHeroProfileWebp", () => {
  it("outputs webp at the hero pixel size with non-trivial bytes", async () => {
    const input = await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 3,
        background: { r: 200, g: 40, b: 90 },
      },
    })
      .png()
      .toBuffer();

    const out = await buildHeroProfileWebp(input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(HERO_PROFILE_PX);
    expect(meta.height).toBe(HERO_PROFILE_PX);
    expect(out.length).toBeGreaterThan(200);
  });
});

import { buildHeroProfileWebp } from "@/lib/images/hero-profile";
import { getHeroS3Config, putHeroProfileWebp } from "@/lib/storage/hero-s3";

const MAX_INPUT_BYTES = 12 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type HeroUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Resize + blueprint frame (see `buildHeroProfileWebp`), upload to MinIO/S3.
 */
export async function uploadHeroProfileFromFile(file: File): Promise<HeroUploadResult> {
  if (!getHeroS3Config()) {
    return {
      ok: false,
      message:
        "Object storage is not configured. Add S3_* variables (see compose.env.example), run `docker compose up -d`, then try again.",
    };
  }

  if (!ALLOWED.has(file.type)) {
    return {
      ok: false,
      message: "Use a JPEG, PNG, WebP, or GIF for the hero photo.",
    };
  }

  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      message: `Image must be under ${Math.round(MAX_INPUT_BYTES / (1024 * 1024))} MB before processing.`,
    };
  }

  let input: Buffer;
  try {
    input = Buffer.from(await file.arrayBuffer());
  } catch {
    return { ok: false, message: "Could not read the uploaded file." };
  }

  if (!input.length) {
    return { ok: false, message: "The uploaded file was empty." };
  }

  let webp: Buffer;
  try {
    webp = await buildHeroProfileWebp(input);
  } catch (e) {
    console.error("buildHeroProfileWebp", e);
    return {
      ok: false,
      message: "Could not process that image. Try a different file or format.",
    };
  }

  try {
    const url = await putHeroProfileWebp(webp);
    return { ok: true, url };
  } catch (e) {
    console.error("putHeroProfileWebp", e);
    return {
      ok: false,
      message: "Upload to storage failed. Check MinIO is running and credentials match.",
    };
  }
}

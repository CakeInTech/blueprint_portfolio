import { buildHeroProfileWebp } from "@/lib/images/hero-profile";
import { getHeroS3Config, putHeroProfileWebp } from "@/lib/storage/hero-s3";

const MAX_INPUT_BYTES = 12 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Sniffs the actual bytes — browsers derive MIME from the file extension, so
 * e.g. an SVG saved as .png sails past the type check and then crashes Sharp
 * with an XML parse error.
 */
function sniffImageContent(buf: Buffer): "raster" | "svg" | "unknown" {
  if (buf.length < 12) return "unknown";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "raster"; // JPEG
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "raster"; // PNG
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "raster"; // WebP
  if (["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("latin1"))) return "raster"; // GIF
  const head = buf.subarray(0, 256).toString("latin1").trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml") || head.startsWith("<!doctype")) return "svg";
  return "unknown";
}

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

  const sniffed = sniffImageContent(input);
  if (sniffed === "svg") {
    return {
      ok: false,
      message:
        "That file is actually an SVG/vector file (despite its extension). Export it as PNG or JPEG and upload again.",
    };
  }
  if (sniffed === "unknown") {
    return {
      ok: false,
      message:
        "That file does not look like a JPEG, PNG, WebP, or GIF. Re-export the image and try again.",
    };
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

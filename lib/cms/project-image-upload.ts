import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { sniffImageContent } from "@/lib/cms/hero-upload";
import { getHeroS3Config } from "@/lib/storage/hero-s3";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Showcase width — 2× the widest tile slot for crisp retina display. */
const PROJECT_IMAGE_MAX_WIDTH = 1600;

export type ProjectImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Processes a project showcase image/mockup (resize to max width, WebP) and
 * uploads it under a timestamped key so replacements bust long-lived caches.
 */
export async function uploadProjectImageFromFile(
  projectId: string,
  file: File,
): Promise<ProjectImageUploadResult> {
  const cfg = getHeroS3Config();
  if (!cfg) {
    return {
      ok: false,
      message:
        "Object storage is not configured. Add S3_* variables, then try again.",
    };
  }

  if (!ALLOWED.has(file.type)) {
    return { ok: false, message: "Use a JPEG, PNG, WebP, or GIF for project images." };
  }

  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      message: `Image must be under ${Math.round(MAX_INPUT_BYTES / (1024 * 1024))} MB.`,
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
    webp = await sharp(input)
      .rotate()
      .resize(PROJECT_IMAGE_MAX_WIDTH, PROJECT_IMAGE_MAX_WIDTH * 2, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84, effort: 5 })
      .toBuffer();
  } catch (e) {
    console.error("uploadProjectImage sharp", e);
    return {
      ok: false,
      message: "Could not process that image. Try a different file or format.",
    };
  }

  const safeId = projectId.replace(/[^a-z0-9-]/gi, "").slice(0, 48) || "project";
  const key = `projects/${safeId}-${Date.now()}.webp`;

  try {
    await cfg.client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: webp,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (e) {
    console.error("uploadProjectImage put", e);
    return {
      ok: false,
      message: "Upload to storage failed. Check storage credentials.",
    };
  }

  return { ok: true, url: `${cfg.publicBaseUrl}/${key}` };
}

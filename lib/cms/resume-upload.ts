import { getHeroS3Config } from "@/lib/storage/hero-s3";
import { putResumePdf } from "@/lib/storage/resume-s3";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;

export type ResumeUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function uploadResumeFromFile(file: File): Promise<ResumeUploadResult> {
  if (!getHeroS3Config()) {
    return {
      ok: false,
      message:
        "Object storage is not configured. Add S3_* variables (see compose.env.example), then try again.",
    };
  }

  if (file.type !== "application/pdf") {
    return { ok: false, message: "Resume must be a PDF file." };
  }

  if (file.size > MAX_RESUME_BYTES) {
    return {
      ok: false,
      message: `Resume must be under ${Math.round(MAX_RESUME_BYTES / (1024 * 1024))} MB.`,
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

  // PDF magic bytes — cheap server-side sanity check beyond the MIME type.
  if (!input.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
    return { ok: false, message: "That file does not look like a valid PDF." };
  }

  try {
    const url = await putResumePdf(input);
    return { ok: true, url };
  } catch (e) {
    console.error("putResumePdf", e);
    return {
      ok: false,
      message: "Upload to storage failed. Check MinIO is running and credentials match.",
    };
  }
}

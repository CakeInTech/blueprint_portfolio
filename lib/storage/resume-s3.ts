import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getHeroS3Config } from "@/lib/storage/hero-s3";

/**
 * Uploads the resume PDF under a timestamped key so the public URL changes on
 * every replace (long-lived caches never serve a stale resume).
 */
export async function putResumePdf(body: Buffer): Promise<string> {
  const cfg = getHeroS3Config();
  if (!cfg) {
    throw new Error("S3 / MinIO is not configured for resume uploads.");
  }

  const key = `resume/cakeintech-${Date.now()}.pdf`;

  await cfg.client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: "application/pdf",
      ContentDisposition: 'attachment; filename="cakeintech-resume.pdf"',
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${cfg.publicBaseUrl}/${key}`;
}

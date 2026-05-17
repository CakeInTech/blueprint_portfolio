import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const HERO_S3_OBJECT_KEY = "hero/profile.webp";

export type HeroS3Config = {
  client: S3Client;
  bucket: string;
  /** e.g. `http://127.0.0.1:19000/portfolio-media` — no trailing slash */
  publicBaseUrl: string;
};

/**
 * Returns null when MinIO/S3 env is incomplete (file uploads disabled).
 */
export function getHeroS3Config(): HeroS3Config | null {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.S3_SECRET_KEY?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }

  const client = new S3Client({
    region: process.env.S3_REGION?.trim() || "us-east-1",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return { client, bucket, publicBaseUrl };
}

export async function putHeroProfileWebp(body: Buffer): Promise<string> {
  const cfg = getHeroS3Config();
  if (!cfg) {
    throw new Error("S3 / MinIO is not configured for hero uploads.");
  }

  await cfg.client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: HERO_S3_OBJECT_KEY,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${cfg.publicBaseUrl}/${HERO_S3_OBJECT_KEY}`;
}

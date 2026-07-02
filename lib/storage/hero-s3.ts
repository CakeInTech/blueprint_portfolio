import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const HERO_S3_OBJECT_KEY = "hero/profile.webp";

export type HeroS3Config = {
  client: S3Client;
  bucket: string;
  /** Base URL the browser loads media from — no trailing slash. */
  publicBaseUrl: string;
};

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

/**
 * Object-storage config. Reads S3_* first, then falls back to the AWS_*
 * variables Railway injects when a bucket is connected to the service.
 *
 * Railway buckets are private (no anonymous reads), so when
 * S3_PUBLIC_BASE_URL is not set the public base defaults to this app's
 * /api/media proxy, which streams objects using these credentials.
 * Returns null when config is incomplete (uploads disabled).
 */
export function getHeroS3Config(): HeroS3Config | null {
  const endpoint = env("S3_ENDPOINT") ?? env("AWS_ENDPOINT_URL");
  const accessKeyId = env("S3_ACCESS_KEY") ?? env("AWS_ACCESS_KEY_ID");
  const secretAccessKey = env("S3_SECRET_KEY") ?? env("AWS_SECRET_ACCESS_KEY");
  const bucket = env("S3_BUCKET") ?? env("AWS_S3_BUCKET_NAME");

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const site = env("NEXT_PUBLIC_SITE_URL")?.replace(/\/+$/, "");
  const publicBaseUrl =
    env("S3_PUBLIC_BASE_URL")?.replace(/\/+$/, "") ??
    (site ? `${site}/api/media` : null);

  if (!publicBaseUrl) return null;

  const client = new S3Client({
    region: env("S3_REGION") ?? env("AWS_DEFAULT_REGION") ?? "us-east-1",
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

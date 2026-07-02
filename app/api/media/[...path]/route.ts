import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getHeroS3Config } from "@/lib/storage/hero-s3";

/**
 * Streams CMS-managed media (hero photo, resume PDF) from private object
 * storage. Railway buckets reject anonymous reads, so public URLs point
 * here and this route fetches with server credentials.
 */

// Only CMS-managed prefixes are reachable — never arbitrary bucket keys.
const ALLOWED_PREFIXES = ["hero/", "resume/"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = (path ?? []).join("/");

  if (
    !key ||
    key.includes("..") ||
    !ALLOWED_PREFIXES.some((p) => key.startsWith(p))
  ) {
    return new Response("Not found", { status: 404 });
  }

  const cfg = getHeroS3Config();
  if (!cfg) {
    return new Response("Object storage is not configured", { status: 503 });
  }

  try {
    const obj = await cfg.client.send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    );

    if (!obj.Body) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", obj.ContentType ?? "application/octet-stream");
    headers.set(
      "Cache-Control",
      obj.CacheControl ?? "public, max-age=3600",
    );
    if (obj.ContentDisposition) {
      headers.set("Content-Disposition", obj.ContentDisposition);
    }
    if (obj.ContentLength != null) {
      headers.set("Content-Length", String(obj.ContentLength));
    }
    if (obj.ETag) {
      headers.set("ETag", obj.ETag);
    }

    return new Response(obj.Body.transformToWebStream(), { headers });
  } catch (error) {
    const status =
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: string }).name === "NoSuchKey"
        ? 404
        : 502;
    if (status !== 404) {
      console.error("media proxy", key, error);
    }
    return new Response("Not found", { status });
  }
}

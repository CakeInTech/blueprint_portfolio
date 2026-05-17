/**
 * Same-origin relative paths only, for safe post-login redirects.
 */
export function sanitizeCallbackUrl(raw: string | undefined | null): string {
  if (raw == null || typeof raw !== "string") return "/cms";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/cms";
  if (t.includes("\\") || t.includes(":")) return "/cms";
  return t;
}

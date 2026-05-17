import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, providerMap } from "@/auth";
import { isAllowedAdminEmail } from "@/lib/auth/allowlist";
import { sanitizeCallbackUrl } from "@/lib/auth/sanitize-callback-url";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "cakeintech — Sign in",
  description: "Owner sign-in for the cakeintech portfolio CMS.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(sp.callbackUrl);
  // Auth.js may append a path segment, e.g. AccessDenied/signin
  const rawError = sp.error;
  const error = rawError?.split("/")[0];

  const session = await auth();
  if (isAllowedAdminEmail(session?.user?.email)) {
    redirect(callbackUrl);
  }

  return (
    <LoginClient
      providers={providerMap}
      callbackUrl={callbackUrl}
      error={error}
    />
  );
}

"use server";

import { redirect } from "next/navigation";
import { signIn, providerMap } from "@/auth";
import { sanitizeCallbackUrl } from "@/lib/auth/sanitize-callback-url";

const allowedProviderIds = new Set(providerMap.map((p) => p.id));

export async function signInWithOAuth(formData: FormData) {
  const providerId = String(formData.get("provider") ?? "");
  const redirectTo = sanitizeCallbackUrl(
    String(formData.get("callbackUrl") ?? ""),
  );

  if (!allowedProviderIds.has(providerId)) {
    redirect(
      `/login?error=Configuration&callbackUrl=${encodeURIComponent(redirectTo)}`,
    );
  }

  await signIn(providerId, { redirectTo });
}

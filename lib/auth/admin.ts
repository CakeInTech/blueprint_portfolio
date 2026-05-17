import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowedAdminEmail } from "@/lib/auth/allowlist";

export type AdminGuardContext = {
  session: Session | null;
  email: string;
};

export async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email;

  if (!isAllowedAdminEmail(email)) {
    redirect("/login?callbackUrl=/cms");
  }

  return {
    session: session as Session | null,
    email: email!.toLowerCase(),
  } satisfies AdminGuardContext;
}

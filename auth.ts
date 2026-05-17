import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db/client";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { isAllowedAdminEmail } from "@/lib/auth/allowlist";

const providers: Provider[] = [
  ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
    ? [GitHub]
    : []),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google]
    : []),
];

function providerEntry(provider: Provider): { id: string; name: string } {
  if (typeof provider === "function") {
    const data = provider();
    return { id: data.id as string, name: data.name as string };
  }
  return { id: provider.id as string, name: provider.name as string };
}

/** OAuth providers enabled in this deployment (for /login UI). */
export const providerMap = providers.map(providerEntry);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: db ? "database" : "jwt",
    /**
     * Sliding session: each renewal sets expiry to now + maxAge.
     * updateAge caps how often we write a new expiry (avoids thrashing the DB).
     * With 15 / 2, an active CMS user gets a fresh 15-minute window at least every 2 minutes.
     */
    maxAge: 15 * 60,
    updateAge: 2 * 60,
  },
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      return isAllowedAdminEmail(user.email);
    },
    authorized({ auth: session, request }) {
      if (request.nextUrl.pathname.startsWith("/cms")) {
        return isAllowedAdminEmail(session?.user?.email);
      }

      return true;
    },
    session({ session }) {
      if (session.user?.email && isAllowedAdminEmail(session.user.email)) {
        session.user.role = "owner";
      }

      return session;
    },
  },
});

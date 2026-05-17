import "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "owner";
  }

  interface Session {
    user?: {
      role?: "owner";
    } & DefaultSession["user"];
  }
}

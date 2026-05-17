"use server";

import { signOut } from "@/auth";

export async function cmsSignOut() {
  await signOut({ redirectTo: "/" });
}

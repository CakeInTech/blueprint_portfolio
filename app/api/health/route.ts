import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET() {
  const checks = {
    app: true,
    databaseConfigured: Boolean(db),
    authSecretConfigured: Boolean(process.env.AUTH_SECRET),
    adminAllowlistConfigured: Boolean(process.env.ADMIN_EMAILS),
  };

  const healthy =
    checks.app &&
    checks.databaseConfigured &&
    checks.authSecretConfigured &&
    checks.adminAllowlistConfigured;

  return NextResponse.json(checks, { status: healthy ? 200 : 503 });
}

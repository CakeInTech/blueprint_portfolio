"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BPStyleContext,
  BPFrame,
  Chip,
  Monogram,
} from "@/app/components/blueprint";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { signInWithOAuth } from "./actions";

export type LoginProvider = { id: string; name: string };

function errorCopy(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "AccessDenied") {
    return "That account is not on the owner allowlist. If this is your site, add this email in configuration and try again.";
  }
  if (code === "Configuration") {
    return "Sign-in is misconfigured or that provider is not enabled on this deployment.";
  }
  if (code === "OAuthAccountNotLinked") {
    return "This email is already linked to another sign-in method. Use the original provider.";
  }
  return `Sign-in could not complete (${code}). If you just set up GitHub OAuth, add your GitHub account email to ADMIN_EMAILS in .env and restart the dev server.`;
}

export function LoginClient({
  providers,
  callbackUrl,
  error,
}: {
  providers: LoginProvider[];
  callbackUrl: string;
  error: string | undefined;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem("cit-theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        return;
      }
      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
      );
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.background = "var(--bg)";
    try {
      localStorage.setItem("cit-theme", theme);
    } catch {
      /* ignore quota / private mode */
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  const err = errorCopy(error);

  return (
    <BPStyleContext.Provider value="dashed">
      <div
        className="login-page-with-ripple relative isolate min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]"
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BackgroundRippleEffect rows={18} cols={40} cellSize={48} />
        <div
          className="relative z-10 flex min-h-screen flex-col"
          style={{ flex: 1 }}
        >
        <div
          className="wrap"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 20,
            paddingBottom: 16,
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Monogram size={32} />
            <span style={{ fontSize: 13, letterSpacing: "0.06em" }}>
              CAKE<span style={{ color: "var(--ink-3)" }}>·</span>INTECH
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Chip>OWNER ACCESS</Chip>
            <button
              type="button"
              onClick={toggleTheme}
              title="Toggle theme"
              style={{
                width: 36,
                height: 36,
                border: "1px dashed var(--rule)",
                background: "transparent",
                color: "var(--ink)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--mono)",
                fontSize: 16,
              }}
            >
              {theme === "dark" ? "☼" : "☾"}
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            padding: "24px 20px 48px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 420 }}>
            <BPFrame
              label="AUTH"
              spec="01.A"
              slash
              pad={28}
              style={{ background: "var(--bg-2)" }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.18em",
                  color: "var(--ink-3)",
                  marginBottom: 10,
                }}
              >
                01 · CMS
              </div>
              <h1
                style={{
                  fontSize: "clamp(24px, 5vw, 34px)",
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  marginBottom: 12,
                }}
              >
                Sign in
              </h1>
              <p
                style={{
                  margin: "0 0 22px",
                  color: "var(--ink-2)",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                Continue with a configured OAuth provider. Only allowlisted
                owner emails can access the CMS.
              </p>

              {err && (
                <div
                  role="alert"
                  style={{
                    marginBottom: 20,
                    padding: "12px 14px",
                    border: "1.25px dashed var(--danger)",
                    background: "var(--paper-tint)",
                    color: "var(--ink)",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {err}
                </div>
              )}

              {providers.length === 0 ? (
                <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 12 }}>
                  No OAuth providers are enabled. Set{" "}
                  <code style={{ color: "var(--ink-2)" }}>
                    AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
                  </code>{" "}
                  or Google equivalents in the environment, then restart the app.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {providers.map((p, i) => (
                    <form key={p.id} action={signInWithOAuth}>
                      <input type="hidden" name="provider" value={p.id} />
                      <input
                        type="hidden"
                        name="callbackUrl"
                        value={callbackUrl}
                      />
                      <button
                        type="submit"
                        className={`btn ${i === 0 ? "primary" : "accent"}`}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        Continue with {p.name}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </BPFrame>

            <p
              style={{
                marginTop: 20,
                textAlign: "center",
                fontSize: 11,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
              }}
            >
              <Link href="/" style={{ borderBottom: "1px dashed var(--rule-soft)" }}>
                ← Back to portfolio
              </Link>
            </p>
          </div>
        </div>
        </div>
      </div>
    </BPStyleContext.Provider>
  );
}

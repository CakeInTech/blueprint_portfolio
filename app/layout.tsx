import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getCmsSystemSettings } from "@/lib/cms/actions/settings";
import {
  accentInkForAccent,
  cssBorderStyleFromCms,
  normalizeHex6Accent,
} from "@/lib/cms/appearance-tokens";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "cakeintech — Mohamed Abdulhakim · Fullstack Engineer",
  description:
    "Fullstack Software Engineer building offline-first SaaS across hotels, schools, and clinics.",
  icons: {
    icon: [
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/favicons/apple-touch-icon.png" }],
    shortcut: "/favicons/favicon.ico",
  },
  manifest: "/favicons/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { appearance } = await getCmsSystemSettings();
  const accent = normalizeHex6Accent(appearance.accent);

  // CMS appearance tokens on first paint — no flash of default theme.
  const appearanceVars = {
    "--accent": accent,
    "--accent-ink": accentInkForAccent(accent),
    "--grid-density": `${appearance.gridDensity}px`,
    "--slash-density": `${appearance.slashDensity}px`,
    "--border-style": cssBorderStyleFromCms(appearance.borderStyle),
  } as React.CSSProperties;

  const serverTheme =
    appearance.theme === "dark" || appearance.theme === "light"
      ? appearance.theme
      : undefined;

  // Resolve local override / auto (prefers-color-scheme) before first paint.
  const themeInit = `(function(){try{var o=localStorage.getItem("cit-theme");var t=(o==="light"||o==="dark")?o:${
    serverTheme
      ? JSON.stringify(serverTheme)
      : `(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")`
  };document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

  return (
    <html
      lang="en"
      className={jetbrainsMono.variable}
      data-theme={serverTheme}
      style={appearanceVars}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BPStyleContext } from "./blueprint";
import { Nav } from "./Nav";
import { Hero, StatsStrip, About } from "./HeroSection";
import { WorkTimeline, ProjectsMosaic } from "./WorkSection";
import { StackGrid, Devlog, ContactCTA, ResumeBand, Footer } from "./TailSection";
import { CIT_DATA } from "./data";
import type { PortfolioContent } from "@/lib/content/loaders";
import type { AppearanceDto } from "@/lib/cms/cms-settings-model";
import { DEFAULT_APPEARANCE } from "@/lib/cms/cms-settings-model";
import {
  accentInkForAccent,
  cssBorderStyleFromCms,
  normalizeHex6Accent,
} from "@/lib/cms/appearance-tokens";

const THEME_STORAGE_KEY = "cit-theme";

type ResolvedTheme = "light" | "dark";

function resolveDataTheme(
  appearance: AppearanceDto,
  prefersDark: boolean,
  localOverride: ResolvedTheme | null,
): ResolvedTheme {
  if (localOverride) return localOverride;
  if (appearance.theme === "auto") return prefersDark ? "dark" : "light";
  if (appearance.theme === "dark") return "dark";
  return "light";
}

export function Portfolio({
  data = CIT_DATA,
  appearance = DEFAULT_APPEARANCE,
}: {
  data?: PortfolioContent;
  appearance?: AppearanceDto;
}) {
  const [prefersDark, setPrefersDark] = useState(false);
  const [localOverride, setLocalOverride] = useState<ResolvedTheme | null>(null);
  const themeHydrated = useRef(false);
  const appearanceThemeRef = useRef(appearance.theme);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mql.matches);
    const onChange = () => setPrefersDark(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
          setLocalOverride(stored);
        }
      } catch {
        /* ignore private mode / quota */
      } finally {
        themeHydrated.current = true;
      }
    });
  }, []);

  const resolvedTheme = useMemo(
    () => resolveDataTheme(appearance, prefersDark, localOverride),
    [appearance, prefersDark, localOverride],
  );

  useEffect(() => {
    if (appearanceThemeRef.current === appearance.theme) return;
    appearanceThemeRef.current = appearance.theme;
    setLocalOverride(null);
  }, [appearance.theme]);

  useEffect(() => {
    if (!themeHydrated.current) return;
    try {
      if (localOverride === null) {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, localOverride);
      }
    } catch {
      /* ignore */
    }
  }, [localOverride]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    root.style.background = "var(--bg)";

    const accent = normalizeHex6Accent(appearance.accent);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-ink", accentInkForAccent(accent));
    root.style.setProperty("--grid-density", `${appearance.gridDensity}px`);
    root.style.setProperty("--slash-density", `${appearance.slashDensity}px`);
    root.style.setProperty(
      "--border-style",
      cssBorderStyleFromCms(appearance.borderStyle),
    );

    return () => {
      root.removeAttribute("data-theme");
      root.style.removeProperty("background");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-ink");
      root.style.removeProperty("--grid-density");
      root.style.removeProperty("--slash-density");
      root.style.removeProperty("--border-style");
    };
  }, [appearance, resolvedTheme]);

  const toggleTheme = useCallback(() => {
    setLocalOverride((prev) => {
      const r = resolveDataTheme(appearance, prefersDark, prev);
      return r === "dark" ? "light" : "dark";
    });
  }, [appearance, prefersDark]);

  return (
    <BPStyleContext.Provider value={appearance.borderStyle}>
      <Nav theme={resolvedTheme} onToggleTheme={toggleTheme} />
      <Hero profile={data.profile} />
      <StatsStrip stats={data.stats} />
      <About about={data.about} />
      <WorkTimeline items={data.experience} />
      <ProjectsMosaic projects={data.projects} />
      <StackGrid stack={data.stack} />
      <Devlog posts={data.devlog} />
      <ContactCTA profile={data.profile} />
      <ResumeBand profile={data.profile} />
      <Footer profile={data.profile} />
    </BPStyleContext.Provider>
  );
}

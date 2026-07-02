"use client";

import React, { useState } from "react";
import type { AboutContent, Profile, Stat } from "@/app/components/data";
import { CMSShell } from "./shell";
import { Overview } from "./views/overview";
import { Inbox } from "./views/inbox";
import { MeetingsCalendar, Analytics } from "./views/workspace";
import type {
  AppearanceDto,
  IntegrationRowDto,
  SiteSettingsDto,
} from "@/lib/cms/cms-settings-model";
import {
  ProfileEditor,
  WorkEditor,
  ProjectsEditor,
  SkillsEditor,
  BlogEditor,
  Media,
} from "./views/content";
import { AboutEditor } from "./views/about";
import { Appearance, Settings } from "./views/system";

type ViewId =
  | "overview"
  | "inbox"
  | "calendar"
  | "analytics"
  | "profile"
  | "about"
  | "work"
  | "projects"
  | "skills"
  | "blog"
  | "media"
  | "appearance"
  | "settings";

export type CMSAppProps = {
  adminEmail: string;
  initialProfile: Profile;
  initialStats: Stat[];
  initialAbout: AboutContent;
  initialAppearance: AppearanceDto;
  initialIntegrations: IntegrationRowDto[];
  initialSite: SiteSettingsDto;
};

export function CMSApp({
  adminEmail,
  initialProfile,
  initialStats,
  initialAbout,
  initialAppearance,
  initialIntegrations,
  initialSite,
}: CMSAppProps) {
  const [current, setCurrent] = useState<ViewId>("overview");

  const views: Record<ViewId, React.ReactNode> = {
    overview: (
      <Overview
        profile={initialProfile}
        stats={initialStats}
        onNavigate={(id) => setCurrent(id as ViewId)}
      />
    ),
    inbox: <Inbox />,
    calendar: <MeetingsCalendar initialAvailability={initialSite.availability} />,
    analytics: (
      <Analytics
        plausible={initialIntegrations.find((i) => i.key === "plausible")}
        primaryDomain={initialSite.primaryDomain}
      />
    ),
    profile: (
      <ProfileEditor profile={initialProfile} stats={initialStats} />
    ),
    about: <AboutEditor initialAbout={initialAbout} />,
    work: <WorkEditor />,
    projects: <ProjectsEditor />,
    skills: <SkillsEditor />,
    blog: <BlogEditor />,
    media: <Media />,
    appearance: <Appearance initial={initialAppearance} />,
    settings: (
      <Settings integrations={initialIntegrations} site={initialSite} />
    ),
  };

  return (
    <CMSShell
      current={current}
      setCurrent={(id) => setCurrent(id as ViewId)}
      adminEmail={adminEmail}
    >
      {views[current]}
    </CMSShell>
  );
}

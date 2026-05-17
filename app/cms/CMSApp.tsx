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
  initialProfile: Profile;
  initialStats: Stat[];
  initialAbout: AboutContent;
  initialAppearance: AppearanceDto;
  initialIntegrations: IntegrationRowDto[];
};

export function CMSApp({
  initialProfile,
  initialStats,
  initialAbout,
  initialAppearance,
  initialIntegrations,
}: CMSAppProps) {
  const [current, setCurrent] = useState<ViewId>("overview");

  const views: Record<ViewId, React.ReactNode> = {
    overview: <Overview profile={initialProfile} stats={initialStats} />,
    inbox: <Inbox />,
    calendar: <MeetingsCalendar />,
    analytics: <Analytics />,
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
    settings: <Settings integrations={initialIntegrations} />,
  };

  return (
    <CMSShell
      current={current}
      setCurrent={(id) => setCurrent(id as ViewId)}
    >
      {views[current]}
    </CMSShell>
  );
}

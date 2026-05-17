import { asc, eq } from "drizzle-orm";
import { CIT_DATA } from "@/app/components/data";
import type {
  AboutContent,
  DevlogPost,
  Experience,
  Profile,
  Project,
  Stat,
} from "@/app/components/data";
import { db } from "@/lib/db/client";
import {
  aboutCurrentlyItems,
  devlogPosts,
  experienceBullets,
  experiences,
  portfolioAbout,
  portfolioProfiles,
  portfolioStats,
  projectMetrics,
  projects,
  projectStackItems,
  stackGroups,
  stackItems,
} from "@/lib/db/schema";

export type PortfolioContent = {
  profile: Profile;
  stats: Stat[];
  about: AboutContent;
  experience: Experience[];
  projects: Project[];
  stack: Record<string, string[]>;
  devlog: DevlogPost[];
};

const PROJECT_SIZES = new Set(["sm", "md", "lg"]);

function asProjectSize(size: string): Project["size"] {
  return PROJECT_SIZES.has(size) ? (size as Project["size"]) : "sm";
}

export async function getPortfolioContent(): Promise<PortfolioContent> {
  if (!db) return CIT_DATA;

  try {
    const [profile] = await db
      .select()
      .from(portfolioProfiles)
      .where(eq(portfolioProfiles.id, "main"))
      .limit(1);

    if (!profile) return CIT_DATA;

    const statsRows = await db
      .select()
      .from(portfolioStats)
      .orderBy(asc(portfolioStats.sortOrder));

    const experienceRows = await db
      .select()
      .from(experiences)
      .orderBy(asc(experiences.sortOrder));

    const allExperienceBullets = await db
      .select()
      .from(experienceBullets)
      .orderBy(asc(experienceBullets.sortOrder));

    const projectRows = await db
      .select()
      .from(projects)
      .orderBy(asc(projects.sortOrder));

    const allProjectStack = await db
      .select()
      .from(projectStackItems)
      .orderBy(asc(projectStackItems.sortOrder));

    const allProjectMetrics = await db
      .select()
      .from(projectMetrics)
      .orderBy(asc(projectMetrics.sortOrder));

    const groupRows = await db
      .select()
      .from(stackGroups)
      .orderBy(asc(stackGroups.sortOrder));

    const allStackItems = await db
      .select()
      .from(stackItems)
      .orderBy(asc(stackItems.sortOrder));

    const postRows = await db
      .select()
      .from(devlogPosts)
      .where(eq(devlogPosts.published, true))
      .orderBy(asc(devlogPosts.sortOrder));

    const [aboutRow] = await db
      .select()
      .from(portfolioAbout)
      .where(eq(portfolioAbout.id, "main"))
      .limit(1);

    const aboutCurrentlyRows = aboutRow
      ? await db
          .select()
          .from(aboutCurrentlyItems)
          .where(eq(aboutCurrentlyItems.aboutId, "main"))
          .orderBy(asc(aboutCurrentlyItems.sortOrder))
      : [];

    const about: AboutContent = aboutRow
      ? {
          headCode: aboutRow.headCode,
          headLabel: aboutRow.headLabel,
          headTitle: aboutRow.headTitle,
          paragraph1: aboutRow.paragraph1,
          paragraph2Prefix: aboutRow.paragraph2Prefix,
          paragraph2Highlight: aboutRow.paragraph2Highlight,
          paragraph2Mid: aboutRow.paragraph2Mid,
          paragraph2Emphasis: aboutRow.paragraph2Emphasis,
          paragraph2Suffix: aboutRow.paragraph2Suffix,
          paragraph3: aboutRow.paragraph3,
          frameLabel: aboutRow.frameLabel,
          frameSpec: aboutRow.frameSpec,
          currently: aboutCurrentlyRows.map((row) => ({
            title: row.title,
            description: row.description,
          })),
        }
      : CIT_DATA.about;

    return {
      profile: {
        handle: profile.handle,
        name: profile.name,
        role: profile.role,
        tagline: profile.tagline,
        location: profile.location,
        timezone: profile.timezone,
        email: profile.email,
        phone: profile.phone ?? "",
        linkedin: profile.linkedin ?? "",
        github: profile.github ?? "",
        heroImageUrl: profile.heroImageUrl ?? null,
        available: profile.available,
        yearsExp: profile.yearsExp,
      },
      stats: statsRows.map((stat) => ({ v: stat.value, k: stat.label })),
      about,
      experience: experienceRows.map((item) => ({
        co: item.company,
        loc: item.location,
        role: item.role,
        start: item.start,
        end: item.end,
        current: item.current,
        bullets: allExperienceBullets
          .filter((bullet) => bullet.experienceId === item.id)
          .map((bullet) => bullet.body),
      })),
      projects: projectRows.map((project) => ({
        id: project.id,
        name: project.name,
        kind: project.kind,
        size: asProjectSize(project.size),
        year: project.year,
        tag: project.tag ?? undefined,
        color: project.color ?? undefined,
        blurb: project.blurb,
        stack: allProjectStack
          .filter((stackItem) => stackItem.projectId === project.id)
          .map((stackItem) => stackItem.label),
        metrics: allProjectMetrics
          .filter((metric) => metric.projectId === project.id)
          .map((metric) => ({ v: metric.value, k: metric.label })),
      })),
      stack: Object.fromEntries(
        groupRows.map((group) => [
          group.name,
          allStackItems
            .filter((item) => item.groupId === group.id)
            .map((item) => item.label),
        ]),
      ),
      devlog: postRows.map((post) => ({
        date: post.date,
        title: post.title,
        kind: post.kind,
        read: post.read,
        excerpt: post.excerpt,
      })),
    };
  } catch (error) {
    console.error("Falling back to static portfolio content", error);
    return CIT_DATA;
  }
}

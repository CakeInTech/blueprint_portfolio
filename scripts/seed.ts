import "dotenv/config";
import { CIT_DATA } from "../app/components/data";
import { getDb, sql } from "../lib/db/client";
import {
  aboutCurrentlyItems,
  appearanceSettings,
  devlogPosts,
  experienceBullets,
  experiences,
  integrationSettings,
  portfolioAbout,
  portfolioProfiles,
  portfolioStats,
  projectMetrics,
  projects,
  projectStackItems,
  stackGroups,
  stackItems,
} from "../lib/db/schema";

async function main() {
  const db = getDb();

  await db.delete(appearanceSettings);
  await db.delete(integrationSettings);
  await db.delete(stackItems);
  await db.delete(stackGroups);
  await db.delete(projectMetrics);
  await db.delete(projectStackItems);
  await db.delete(projects);
  await db.delete(experienceBullets);
  await db.delete(experiences);
  await db.delete(portfolioStats);
  await db.delete(devlogPosts);
  await db.delete(aboutCurrentlyItems);
  await db.delete(portfolioAbout);
  await db.delete(portfolioProfiles);

  await db.insert(portfolioProfiles).values({
    id: "main",
    ...CIT_DATA.profile,
  });

  await db.insert(portfolioStats).values(
    CIT_DATA.stats.map((stat, index) => ({
      value: stat.v,
      label: stat.k,
      sortOrder: index,
    })),
  );

  const { about } = CIT_DATA;
  await db.insert(portfolioAbout).values({
    id: "main",
    headCode: about.headCode,
    headLabel: about.headLabel,
    headTitle: about.headTitle,
    paragraph1: about.paragraph1,
    paragraph2Prefix: about.paragraph2Prefix,
    paragraph2Highlight: about.paragraph2Highlight,
    paragraph2Mid: about.paragraph2Mid,
    paragraph2Emphasis: about.paragraph2Emphasis,
    paragraph2Suffix: about.paragraph2Suffix,
    paragraph3: about.paragraph3,
    frameLabel: about.frameLabel,
    frameSpec: about.frameSpec,
  });

  await db.insert(aboutCurrentlyItems).values(
    about.currently.map((row, index) => ({
      aboutId: "main",
      title: row.title,
      description: row.description,
      sortOrder: index,
    })),
  );

  for (const [index, item] of CIT_DATA.experience.entries()) {
    const [created] = await db
      .insert(experiences)
      .values({
        company: item.co,
        location: item.loc,
        role: item.role,
        start: item.start,
        end: item.end,
        current: item.current,
        sortOrder: index,
      })
      .returning({ id: experiences.id });

    if (item.bullets.length > 0) {
      await db.insert(experienceBullets).values(
        item.bullets.map((body, bulletIndex) => ({
          experienceId: created.id,
          body,
          sortOrder: bulletIndex,
        })),
      );
    }
  }

  for (const [index, project] of CIT_DATA.projects.entries()) {
    await db.insert(projects).values({
      id: project.id,
      name: project.name,
      kind: project.kind,
      size: project.size,
      year: project.year,
      tag: project.tag,
      color: project.color,
      blurb: project.blurb,
      sortOrder: index,
    });

    if (project.stack.length > 0) {
      await db.insert(projectStackItems).values(
        project.stack.map((label, stackIndex) => ({
          projectId: project.id,
          label,
          sortOrder: stackIndex,
        })),
      );
    }

    if (project.metrics.length > 0) {
      await db.insert(projectMetrics).values(
        project.metrics.map((metric, metricIndex) => ({
          projectId: project.id,
          value: metric.v,
          label: metric.k,
          sortOrder: metricIndex,
        })),
      );
    }
  }

  for (const [index, [name, items]] of Object.entries(CIT_DATA.stack).entries()) {
    const [created] = await db
      .insert(stackGroups)
      .values({ name, sortOrder: index })
      .returning({ id: stackGroups.id });

    await db.insert(stackItems).values(
      items.map((label, itemIndex) => ({
        groupId: created.id,
        label,
        sortOrder: itemIndex,
      })),
    );
  }

  await db.insert(devlogPosts).values(
    CIT_DATA.devlog.map((post, index) => ({
      ...post,
      published: true,
      sortOrder: index,
    })),
  );

  await db.insert(appearanceSettings).values({
    id: "main",
    theme: "light",
    accent: "#d4ff3d",
    borderStyle: "dashed",
    gridDensity: 32,
    slashDensity: 7,
  });

  await db.insert(integrationSettings).values([
    { key: "google_calendar", enabled: true },
    { key: "gmail_smtp", enabled: true },
    { key: "vercel", enabled: true },
    { key: "plausible", enabled: true },
    { key: "zapier", enabled: false },
  ]);

  await sql?.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

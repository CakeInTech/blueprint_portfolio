import { CMSApp } from "./CMSApp";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsSystemSettings } from "@/lib/cms/actions/settings";
import { getPortfolioContent } from "@/lib/content/loaders";

export const metadata = {
  title: "cakeintech / CMS — Admin",
};

export default async function CMSPage() {
  await requireAdmin();
  const [{ profile, stats, about }, system] = await Promise.all([
    getPortfolioContent(),
    getCmsSystemSettings(),
  ]);

  return (
    <CMSApp
      initialProfile={profile}
      initialStats={stats}
      initialAbout={about}
      initialAppearance={system.appearance}
      initialIntegrations={system.integrations}
    />
  );
}

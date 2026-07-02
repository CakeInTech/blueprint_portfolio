import { CMSApp } from "./CMSApp";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsSystemSettings } from "@/lib/cms/actions/settings";
import {
  EMPTY_ABOUT,
  EMPTY_PROFILE,
  getPortfolioContent,
} from "@/lib/content/loaders";

export const metadata = {
  title: "cakeintech / CMS — Admin",
};

export default async function CMSPage() {
  const { email } = await requireAdmin();
  const [content, system] = await Promise.all([
    getPortfolioContent(),
    getCmsSystemSettings(),
  ]);

  return (
    <CMSApp
      adminEmail={email}
      initialProfile={content?.profile ?? EMPTY_PROFILE}
      initialStats={content?.stats ?? []}
      initialAbout={content?.about ?? EMPTY_ABOUT}
      initialAppearance={system.appearance}
      initialIntegrations={system.integrations}
      initialSite={system.site}
    />
  );
}

import { Portfolio } from "./components/Portfolio";
import { getCmsSystemSettings } from "@/lib/cms/actions/settings";
import { getPortfolioContent } from "@/lib/content/loaders";

export default async function Home() {
  const [data, system] = await Promise.all([
    getPortfolioContent(),
    getCmsSystemSettings(),
  ]);

  return <Portfolio data={data} appearance={system.appearance} />;
}

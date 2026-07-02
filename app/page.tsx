import Link from "next/link";
import { Portfolio } from "./components/Portfolio";
import { getCmsSystemSettings } from "@/lib/cms/actions/settings";
import { getPortfolioContent } from "@/lib/content/loaders";

function UnpublishedNotice() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      <div
        style={{
          border: "1px dashed var(--rule)",
          padding: "40px 32px",
          maxWidth: 460,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: "0.18em",
            color: "var(--ink-3)",
            marginBottom: 12,
          }}
        >
          00 · CAKEINTECH
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 10 }}>
          Nothing published yet.
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
          This site renders only content published from the CMS. Connect the
          database and publish a profile to go live.
        </p>
        <Link
          href="/cms"
          className="btn primary"
          style={{ marginTop: 18, display: "inline-flex" }}
        >
          OPEN CMS →
        </Link>
      </div>
    </main>
  );
}

export default async function Home() {
  const [data, system] = await Promise.all([
    getPortfolioContent(),
    getCmsSystemSettings(),
  ]);

  if (!data) return <UnpublishedNotice />;

  return (
    <Portfolio
      data={data}
      appearance={system.appearance}
      availability={system.site.availability}
    />
  );
}

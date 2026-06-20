import "dotenv/config";
import { fetchApiFootballFixtureEvidence } from "@/lib/domain/source-adapters/api-football";
import { buildApiFootballFixtureDraft } from "@/lib/operator-console/default-payloads";

async function main() {
  const apiKey = process.env.API_FOOTBALL_API_KEY ?? process.env.SPORTS_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("Set API_FOOTBALL_API_KEY before running this demo.");
  }

  const result = await fetchApiFootballFixtureEvidence({
    ...buildApiFootballFixtureDraft({
      id: "demo",
      slug: "thailand-u19-vs-australia-u19-asean-2026",
      titleEn: "Thailand U19 vs Australia U19 — ASEAN Championship",
      outcomes: [
        { slug: "home-win", name: "Thailand U19 win" },
        { slug: "draw", name: "Draw" },
        { slug: "away-win", name: "Australia U19 win" },
      ],
    }),
    apiKey,
    apiBaseUrl: process.env.API_FOOTBALL_BASE_URL,
  });

  console.log(
    JSON.stringify(
      {
        fixture: result.fixture,
        canProposeOutcome: result.canProposeOutcome,
        suggestedResolution: result.suggestedResolution,
        warnings: result.warnings,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

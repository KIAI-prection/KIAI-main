import { getLiveMarkets } from "@/lib/adapters/markets";
import { LivePageClient } from "./live-page-client";

export default async function LivePage() {
  const markets = await getLiveMarkets();
  return <LivePageClient initialMarkets={markets} />;
}

import { getTranslations } from "next-intl/server";
import { MarketCard } from "@/components/market-card";
import { mockMarkets } from "@/lib/mock-data";

export default async function MarketsPage() {
  const t = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("markets")}</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option>All Categories</option>
          <option>Politics</option>
          <option>Sports</option>
          <option>Tech</option>
        </select>
        <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option>All Status</option>
          <option>Live</option>
          <option>Upcoming</option>
          <option>Closed</option>
        </select>
        <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option>Sort by Volume</option>
          <option>Sort by Newest</option>
          <option>Sort by Ending Soon</option>
        </select>
      </div>

      {/* Markets Grid */}
      {mockMarkets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground-muted">{tCommon("noResults")}</p>
        </div>
      )}
    </div>
  );
}

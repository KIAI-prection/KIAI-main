import { getTranslations } from "next-intl/server";
import { MarketCard } from "@/components/market-card";
import { TrendingHero } from "@/components/trending-hero";
import { getTrendingMarkets, getMarketsByCategory } from "@/lib/mock-data";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const tCategories = await getTranslations("categories");
  const tCommon = await getTranslations("common");
  const trendingMarkets = getTrendingMarkets();
  const sportsMarkets = getMarketsByCategory("sports");
  const politicsMarkets = getMarketsByCategory("politics");

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      {/* Trending Hero Section */}
      <TrendingHero />

      {/* Trending Markets */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">{t("trending")}</h2>
          <Link
            href="/markets"
            className="text-sm font-medium text-brand hover:underline"
          >
            {tCommon("seeAll")}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trendingMarkets.slice(0, 6).map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>

      {/* By Category - Sports */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {tCategories("sports")}
          </h2>
          <Link
            href="/markets?category=sports"
            className="text-sm font-medium text-brand hover:underline"
          >
            {tCommon("seeAll")}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sportsMarkets.slice(0, 3).map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>

      {/* By Category - Politics */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {tCategories("politics")}
          </h2>
          <Link
            href="/markets?category=politics"
            className="text-sm font-medium text-brand hover:underline"
          >
            {tCommon("seeAll")}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {politicsMarkets.slice(0, 3).map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>
    </div>
  );
}

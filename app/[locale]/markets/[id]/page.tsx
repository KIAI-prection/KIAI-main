import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMarketByIdOrSlug } from "@/lib/adapters/markets";
import { MarketDetailClient } from "./market-detail-client";

interface MarketDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function MarketDetailPage({ params }: MarketDetailPageProps) {
  const { id, locale } = await params;
  const market = await getMarketByIdOrSlug(id);

  if (!market) {
    notFound();
  }

  await getTranslations("market");

  return <MarketDetailClient market={market} locale={locale} />;
}

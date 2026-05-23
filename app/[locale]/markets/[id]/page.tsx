import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMarketById } from "@/lib/mock-data";
import { MarketDetailClient } from "./market-detail-client";

interface MarketDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function MarketDetailPage({ params }: MarketDetailPageProps) {
  const { id, locale } = await params;
  const market = getMarketById(id);

  if (!market) {
    notFound();
  }

  const t = await getTranslations("market");

  return <MarketDetailClient market={market} locale={locale} />;
}

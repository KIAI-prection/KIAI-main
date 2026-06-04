"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CategorySidebar } from "@/components/category-sidebar";
import { MarketCard } from "@/components/market-card";
import { LiveBadge } from "@/components/live-badge";
import type { UIMarket } from "@/lib/domain/market-service";

interface LivePageClientProps {
  initialMarkets: UIMarket[];
}

export function LivePageClient({ initialMarkets }: LivePageClientProps) {
  const t = useTranslations("nav");
  const tMarket = useTranslations("market");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const liveMarkets = selectedCategory
    ? initialMarkets.filter((m) => m.category === selectedCategory)
    : initialMarkets;

  return (
    <div className="flex min-h-[calc(100vh-112px)]">
      {/* Sidebar - Desktop Only */}
      <div className="hidden lg:block">
        <CategorySidebar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-[1120px]">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{t("live")}</h1>
            <LiveBadge />
            <span className="rounded-full bg-muted px-2 py-0.5 text-sm tabular-nums text-foreground-secondary">
              {liveMarkets.length}
            </span>
          </div>

          {/* Markets Grid */}
          {liveMarkets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {liveMarkets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-foreground-muted">
                {tMarket("live")} markets will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

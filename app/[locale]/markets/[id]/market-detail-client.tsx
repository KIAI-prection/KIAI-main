"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Share2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarketChart } from "@/components/market-chart";
import { ContestantRow } from "@/components/contestant-row";
import { TradePanel } from "@/components/trade-panel";
import { LiveBadge } from "@/components/live-badge";
import type { Market, Contestant } from "@/lib/mock-data";

interface MarketDetailClientProps {
  market: Market;
  locale: string;
}

export function MarketDetailClient({ market, locale }: MarketDetailClientProps) {
  const t = useTranslations("market");
  const tTrade = useTranslations("trade");
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(
    market.contestants[0] || null
  );

  const topChance = Math.max(...market.contestants.map((c) => c.chance));

  const formatVolume = (volume: number) => {
    if (locale === "ja") {
      if (volume >= 100000000) {
        return `¥${(volume / 100000000).toFixed(0)}億`;
      }
      if (volume >= 10000) {
        return `¥${(volume / 10000).toFixed(0)}万`;
      }
      return `¥${volume.toLocaleString()}`;
    }
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`;
    }
    return `$${volume.toLocaleString()}`;
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-foreground-muted" />
              <span className="text-sm font-medium uppercase tracking-wider text-foreground-muted">
                {market.categoryLabel[locale as "ja" | "en"]}
              </span>
              <span className="text-sm text-foreground-muted">
                {market.subtitle[locale as "ja" | "en"]}
              </span>
            </div>

            <h1 className="mb-3 text-2xl font-bold text-foreground lg:text-3xl">
              {market.title[locale as "ja" | "en"]}
            </h1>

            <div className="flex flex-wrap items-center gap-4">
              {market.status === "live" ? (
                <LiveBadge info={market.statusInfo?.[locale as "ja" | "en"]} />
              ) : (
                <span className="text-sm text-foreground-muted">
                  {market.statusInfo?.[locale as "ja" | "en"]}
                </span>
              )}
              <span className="text-sm tabular-nums text-foreground-muted">
                {formatVolume(market.volume)} {t("volume")}
              </span>
              <span className="text-sm tabular-nums text-foreground-muted">
                {market.marketCount} {t("markets")}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="mb-6">
            <MarketChart data={market.chartData} />
          </div>

          {/* Contestants Table */}
          <Card className="overflow-hidden border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  {locale === "ja" ? "候補" : "Contestants"}
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="px-4">
              {/* Table Header */}
              <div className="flex items-center gap-4 border-b border-border py-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                <div className="flex-1">
                  {locale === "ja" ? "候補名" : "Contestant"}
                </div>
                <div className="w-24 text-right">{t("chance")}</div>
                <div className="hidden w-20 text-center sm:block">
                  {locale === "ja" ? "スコア" : "Score"}
                </div>
                <div className="w-[156px] text-center">{t("price")}</div>
              </div>

              {/* Contestants */}
              {market.contestants.map((contestant) => (
                <ContestantRow
                  key={contestant.id}
                  contestant={contestant}
                  isTopChance={contestant.chance === topChance}
                  onSelect={() => setSelectedContestant(contestant)}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Trade Panel - Desktop */}
        <div className="hidden w-[320px] shrink-0 lg:block">
          <div className="sticky top-20">
            <TradePanel
              market={market}
              selectedContestant={selectedContestant}
              locale={locale}
            />
          </div>
        </div>
      </div>

      {/* Trade Panel - Mobile (Bottom Sheet) */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {selectedContestant?.name || market.contestants[0]?.name}
            </p>
            <p className="text-xs text-foreground-muted">
              {selectedContestant?.chance || market.contestants[0]?.chance}%
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-yes text-white hover:bg-yes/90"
            >
              {t("yes")} {selectedContestant?.priceYes || market.contestants[0]?.priceYes}¢
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-no text-no hover:bg-no hover:text-white"
            >
              {t("no")} {selectedContestant?.priceNo || market.contestants[0]?.priceNo}¢
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

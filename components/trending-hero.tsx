"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Trophy, Vote, Tv } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LiveBadge } from "./live-badge";
import { MarketChart } from "./market-chart";
import { mockMarkets, mockChartData } from "@/lib/mock-data";

const featuredCollections = [
  {
    id: "nba-playoffs",
    icon: Trophy,
    titleKey: "nbaPlayoffs",
    count: 68,
    color: "bg-orange-500",
  },
  {
    id: "nhl-playoffs",
    icon: Trophy,
    titleKey: "nhlPlayoffs",
    count: 22,
    color: "bg-blue-500",
  },
  {
    id: "elections",
    icon: Vote,
    titleKey: "elections2026",
    count: 155,
    color: "bg-brand",
  },
];

export function TrendingHero() {
  const t = useTranslations("home");
  const locale = useLocale() as "en" | "ja";
  const featuredMarket = mockMarkets[0];
  const featuredSeries = featuredMarket.contestants.slice(0, 3).map((contestant, index) => ({
    name: contestant.name,
    color: ["var(--chart-1)", "var(--chart-2)", "var(--chart-5)"][index],
    data: featuredMarket.chartData.map((point, pointIndex) => ({
      time: point.time,
      value: Math.max(
        1,
        Math.min(
          99,
          contestant.chance +
            (pointIndex - featuredMarket.chartData.length + 1) *
              (index === 0 ? 0.7 : index === 1 ? -0.35 : 0.2)
        )
      ),
    })),
  }));

  return (
    <section className="py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured Market - Large Card */}
        <Card className="lg:col-span-2 p-6 hover:border-brand transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="uppercase text-xs font-medium">
                {featuredMarket.categoryLabel[locale]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {featuredMarket.subtitle[locale]}
              </span>
            </div>
            {featuredMarket.status === "live" && (
              <LiveBadge info={featuredMarket.statusInfo?.[locale]} />
            )}
          </div>

          <Link href={`/markets/${featuredMarket.id}`}>
            <h2 className="text-2xl font-semibold text-foreground mb-4 hover:text-brand transition-colors">
              {featuredMarket.title[locale]}
            </h2>
          </Link>

          <div className="mb-4">
            <MarketChart
              data={mockChartData}
              contestants={featuredSeries}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {featuredMarket.contestants.slice(0, 3).map((contestant, idx) => (
              <div
                key={contestant.name}
                className={`p-3 rounded-lg ${
                  idx === 0 ? "bg-yes-bg border border-yes/20" : "bg-muted border border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {contestant.flag && (
                    <span className="text-lg">{contestant.flag}</span>
                  )}
                  <span className="font-medium text-sm truncate">
                    {contestant.name}
                  </span>
                </div>
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    idx === 0 ? "text-yes" : "text-foreground"
                  }`}
                >
                  {contestant.chance}%
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Featured Collections */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand" />
            {t("featuredCollections")}
          </h3>

          {featuredCollections.map((collection) => (
            <Link key={collection.id} href={`/markets?collection=${collection.id}`}>
              <Card className="p-4 hover:border-brand transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${collection.color} flex items-center justify-center`}
                  >
                    <collection.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground group-hover:text-brand transition-colors">
                      {t(`collections.${collection.titleKey}`)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {collection.count} {t("markets")}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {/* Mode Switcher */}
          <Card className="p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              {t("customize")}
            </h4>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                Prediction
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Trophy className="h-4 w-4 mr-1" />
                Sports
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Tv className="h-4 w-4 mr-1" />
                Trader
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

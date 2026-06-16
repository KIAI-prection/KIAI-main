"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LiveBadge } from "./live-badge";
import { cn } from "@/lib/utils";
import type { UIMarket } from "@/lib/domain/market-service";

interface MarketCardProps {
  market: UIMarket;
}

export function MarketCard({ market }: MarketCardProps) {
  const t = useTranslations("market");

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`;
    }
    return `$${volume.toLocaleString()}`;
  };

  const topContestants = market.contestants.slice(0, 4);

  return (
    <Link href={`/markets/${market.id}`}>
      <Card className="group relative h-full overflow-hidden border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-foreground-muted" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
              {market.categoryLabel.en}
            </span>
          </div>
          <span className="text-xs text-foreground-muted">
            {market.subtitle.en}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-base font-semibold leading-tight text-foreground min-h-[3rem]">
          {market.title.en}
        </h3>

        {/* Status */}
        {market.status === "live" ? (
          <LiveBadge info={market.statusInfo?.en} />
        ) : (
          <p className="mb-3 text-xs text-foreground-muted">
            {market.statusInfo?.en}
          </p>
        )}

        {/* Contestants */}
        <div className="mt-3 space-y-2">
          {topContestants.map((contestant) => (
            <div
              key={contestant.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {contestant.flag && (
                  <span className="shrink-0 text-base">{contestant.flag}</span>
                )}
                <span className="truncate font-medium text-foreground">
                  {contestant.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {contestant.odds && (
                  <div className="flex items-center gap-1 text-xs text-foreground-muted">
                    <span className="rounded bg-muted px-1.5 py-0.5 tabular-nums">
                      {contestant.odds}
                    </span>
                    {contestant.secondary && (
                      <span className="rounded bg-muted px-1.5 py-0.5 tabular-nums">
                        {contestant.secondary}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    "flex h-7 min-w-[60px] items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums",
                    contestant.chance ===
                      Math.max(...topContestants.map((c) => c.chance))
                      ? "bg-yes-bg text-yes"
                      : "bg-muted text-foreground-secondary"
                  )}
                >
                  {contestant.chance}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 flex min-h-[1.5rem] items-center justify-between border-t border-border pt-3 text-xs text-foreground-muted">
          <span className="tabular-nums">{formatVolume(market.volume)} vol</span>
          <span className="tabular-nums">
            {market.marketCount} {t("markets")}
          </span>
        </div>
      </Card>
    </Link>
  );
}

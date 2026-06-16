"use client";

import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Contestant } from "@/lib/mock-data";

interface ContestantRowProps {
  contestant: Contestant;
  isTopChance?: boolean;
  onSelect?: () => void;
}

export function ContestantRow({
  contestant,
  isTopChance,
  onSelect,
}: ContestantRowProps) {
  const t = useTranslations("market");

  const formatPrice = (price: number) => {
    return `${price}¢`;
  };

  return (
    <div
      className="group flex items-center gap-4 border-b border-border py-3 last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onSelect}
    >
      {/* Contestant Info */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {contestant.flag && (
          <span className="text-lg">{contestant.flag}</span>
        )}
        <span
          className={cn(
            "truncate font-medium",
            isTopChance ? "text-foreground" : "text-foreground-secondary"
          )}
        >
          {contestant.name}
        </span>
      </div>

      {/* Chance */}
      <div className="flex w-24 items-center justify-end gap-2">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            isTopChance ? "text-foreground" : "text-foreground-secondary"
          )}
        >
          {contestant.chance}%
        </span>
        {contestant.change !== undefined && contestant.change !== 0 && (
          <span
            className={cn(
              "flex items-center text-xs tabular-nums",
              contestant.change > 0 ? "text-up" : "text-down"
            )}
          >
            {contestant.change > 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(contestant.change)}
          </span>
        )}
      </div>

      {/* Odds Info */}
      {contestant.odds && (
        <div className="hidden w-20 items-center justify-center gap-1 text-xs text-foreground-muted sm:flex">
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

      {/* Yes/No Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 min-w-[70px] border-yes bg-yes-bg text-yes hover:bg-yes hover:text-white"
        >
          {t("yes")} {formatPrice(contestant.priceYes)}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 min-w-[70px] border-border bg-no-bg text-no hover:bg-no hover:text-white"
        >
          {t("no")} {formatPrice(contestant.priceNo)}
        </Button>
      </div>
    </div>
  );
}

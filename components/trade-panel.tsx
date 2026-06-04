"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useKIAIWallet } from "@/lib/hooks/use-kiai-wallet";
import type { UIMarket, UIContestant } from "@/lib/domain/market-service";

interface TradePanelProps {
  market: UIMarket;
  selectedContestant: UIContestant | null;
  locale: string;
}

interface QuoteResult {
  id: string;
  pricePerShare: number;
  sharesOut: number;
  totalCostUsd: number;
  yesProbAfter: number;
  noProbAfter: number;
  expiresAt: string;
}

export function TradePanel({ market, selectedContestant, locale }: TradePanelProps) {
  const t = useTranslations("trade");
  const tMarket = useTranslations("market");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [position, setPosition] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"jpy" | "usd">(
    locale === "ja" ? "jpy" : "usd"
  );
  // API-backed quote state
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Wallet state
  const { chain, walletAddress, isConnected } = useKIAIWallet("BASE");

  const contestant = selectedContestant || market.contestants[0];
  const numAmount = parseFloat(amount) || 0;

  // LMSR quote from API (replaces static price math)
  const fetchQuote = useCallback(async () => {
    if (!contestant?.id || numAmount <= 0 || !chain) return;

    setQuoteLoading(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: market.id,
          outcomeId: contestant.id,
          chain,
          side: position,
          amountUsd: numAmount,
          walletAddress: walletAddress ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.quote) setQuote(data.quote);
    } catch {
      // Quote failure is non-fatal — fall back to static price display
    } finally {
      setQuoteLoading(false);
    }
  }, [market.id, contestant?.id, chain, position, numAmount, walletAddress]);

  // Debounce quote fetch 600ms after amount/position changes
  useEffect(() => {
    if (numAmount <= 0) { setQuote(null); return; }
    const timer = setTimeout(fetchQuote, 600);
    return () => clearTimeout(timer);
  }, [fetchQuote, numAmount, position]);

  // Use LMSR quote if available, fallback to static contestant price
  const price = position === "yes" ? contestant?.priceYes : contestant?.priceNo;
  const sharesOut = quote?.sharesOut ?? (price ? Math.floor((numAmount / price) * 100) : 0);
  const estimatedReturn = sharesOut * 1;
  const profit = estimatedReturn - numAmount;

  const formatCurrency = (value: number) => {
    if (currency === "jpy") {
      return `¥${value.toLocaleString()}`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <Card className="overflow-hidden border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <BarChart3 className="h-4 w-4 text-foreground-muted" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {market.title[locale as "ja" | "en"]}
          </p>
        </div>
      </div>

      {/* Selected Contestant */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs text-foreground-muted">
          {tradeType === "buy" ? t("buy") : t("sell")} {position === "yes" ? tMarket("yes") : tMarket("no")}
        </p>
        <p className="font-medium text-foreground">{contestant?.name}</p>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-lg border border-border p-1">
            <button
              onClick={() => setTradeType("buy")}
              className={cn(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                tradeType === "buy"
                  ? "bg-foreground text-background"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              {t("buy")}
            </button>
            <button
              onClick={() => setTradeType("sell")}
              className={cn(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                tradeType === "sell"
                  ? "bg-foreground text-background"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              {t("sell")}
            </button>
          </div>

          {/* Currency Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {currency === "jpy" ? "¥" : "$"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCurrency("jpy")}>
                ¥ JPY
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrency("usd")}>
                $ USD
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Yes/No Selection */}
      <div className="border-b border-border p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPosition("yes")}
            className={cn(
              "flex flex-col items-center rounded-xl border-2 py-3 transition-all",
              position === "yes"
                ? "border-yes bg-yes-bg"
                : "border-border bg-background hover:border-border-strong"
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold",
                position === "yes" ? "text-yes" : "text-foreground-secondary"
              )}
            >
              {tMarket("yes")}
            </span>
            <span
              className={cn(
                "text-lg font-bold tabular-nums",
                position === "yes" ? "text-yes" : "text-foreground"
              )}
            >
              {contestant?.priceYes}¢
            </span>
          </button>

          <button
            onClick={() => setPosition("no")}
            className={cn(
              "flex flex-col items-center rounded-xl border-2 py-3 transition-all",
              position === "no"
                ? "border-no bg-no-bg"
                : "border-border bg-background hover:border-border-strong"
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold",
                position === "no" ? "text-no" : "text-foreground-secondary"
              )}
            >
              {tMarket("no")}
            </span>
            <span
              className={cn(
                "text-lg font-bold tabular-nums",
                position === "no" ? "text-no" : "text-foreground"
              )}
            >
              {contestant?.priceNo}¢
            </span>
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="border-b border-border p-4">
        <label className="mb-2 block text-xs font-medium text-foreground-muted">
          {t("amount")}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
            {currency === "jpy" ? "¥" : "$"}
          </span>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="pl-7 text-right tabular-nums"
          />
        </div>

        {/* Quick Amount Buttons */}
        <div className="mt-2 flex gap-2">
          {[10, 50, 100, 500].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(String(val))}
              className="flex-1 rounded-lg border border-border py-1 text-xs font-medium text-foreground-secondary hover:bg-muted"
            >
              {currency === "jpy" ? `¥${val}` : `$${val}`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">{t("annualReturn")}</span>
          <span className="font-medium tabular-nums text-foreground">3.25%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">{t("estimatedReturn")}</span>
          <span className="font-medium tabular-nums text-up">
            {formatCurrency(Math.max(0, profit))}
          </span>
        </div>
      </div>

      {/* Order status message */}
      {orderError && (
        <div className="mx-4 mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {orderError}
        </div>
      )}
      {/* Submit Button */}
      <div className="p-4 pt-0">
        <Button
          className={cn(
            "w-full font-semibold",
            position === "yes"
              ? "bg-yes text-white hover:bg-yes/90"
              : "bg-no text-white hover:bg-no/90"
          )}
          disabled={
            !amount ||
            numAmount <= 0 ||
            quoteLoading
          }
          onClick={async () => {
            if (!isConnected || !walletAddress) {
              setOrderError("Connect your wallet to trade.");
              return;
            }
            if (!quote) {
              setOrderError("Request a quote first by entering an amount.");
              return;
            }

            setOrderError(null);
            setOrderError(
              "Real wallet transaction signing is not wired yet, so no order was submitted."
            );
          }}
        >
          {quoteLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pricing...
            </span>
          ) : !isConnected ? (
            "Connect Wallet to Trade"
          ) : (
            t("submit")
          )}
        </Button>
      </div>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { TrendingUp, TrendingDown, Wallet, PieChart, History, Loader2 } from "lucide-react";
import { useKIAIWallet } from "@/lib/hooks/use-kiai-wallet";
import type { Position } from "@/lib/mock-data";

export function PortfolioPageClient() {
  const t = useTranslations("portfolio");
  const locale = useLocale();
  const { walletAddress, isConnected } = useKIAIWallet("BASE");

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    fetch(`/api/portfolio?walletAddress=${walletAddress}`)
      .then((r) => r.json())
      .then((data) => {
        // Map API positions to UI Position shape
        setPositions(
          (data.positions ?? []).map(
            (p: {
              id: string;
              marketId: string;
              outcomeSlug: string;
              side: string;
              shares: number;
              avgEntry: number;
              currentPrice: number;
              unrealizedPnlUsd: number;
            }) => ({
              id: p.id,
              marketId: p.marketId,
              marketTitle: { en: p.outcomeSlug, ja: p.outcomeSlug },
              type: p.side as "yes" | "no",
              candidate: p.outcomeSlug,
              shares: p.shares,
              avgPrice: p.avgEntry,
              currentPrice: p.currentPrice,
              pnl: p.unrealizedPnlUsd,
              pnlPercent:
                p.avgEntry > 0 ? (p.unrealizedPnlUsd / (p.shares * p.avgEntry)) * 100 : 0,
            })
          )
        );
        setPendingOrders((data.pendingOrders ?? []).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const totalValue = positions.reduce(
    (sum, pos) => sum + pos.shares * pos.currentPrice,
    0
  );
  const totalPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPnlPercent = totalValue > totalPnl && totalValue > 0
    ? (totalPnl / (totalValue - totalPnl)) * 100
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency: locale === "ja" ? "JPY" : "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-brand" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t("totalValue")}</div>
              <div className="text-xl font-bold tabular-nums">
                {formatCurrency(totalValue)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                totalPnl >= 0 ? "bg-up/10" : "bg-down/10"
              }`}
            >
              {totalPnl >= 0 ? (
                <TrendingUp className="h-5 w-5 text-up" />
              ) : (
                <TrendingDown className="h-5 w-5 text-down" />
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t("totalPnl")}</div>
              <div
                className={`text-xl font-bold tabular-nums ${
                  totalPnl >= 0 ? "text-up" : "text-down"
                }`}
              >
                {totalPnl >= 0 ? "+" : ""}
                {formatCurrency(totalPnl)} ({totalPnlPercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <PieChart className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t("positions")}</div>
              <div className="text-xl font-bold tabular-nums">
                {positions.length}
                {pendingOrders > 0 && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    (+{pendingOrders} pending)
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="positions" className="mb-6">
        <TabsList>
          <TabsTrigger value="positions" className="gap-1.5">
            <PieChart className="h-4 w-4" />
            {t("tabs.positions")}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            {t("tabs.history")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-4">
          {!isConnected && (
            <Card className="p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Connect your wallet to see positions</p>
            </Card>
          )}
          {isConnected && loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {isConnected && !loading && positions.length === 0 && (
            <Card className="p-8 text-center">
              <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reconciled positions yet</p>
            </Card>
          )}
          <div className="space-y-3">
            {positions.map((position) => (
              <Card key={position.id} className="p-4 hover:border-brand transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Link href={`/markets/${position.marketId}`}>
                      <h3 className="font-medium text-foreground hover:text-brand transition-colors">
                        {locale === "ja"
                          ? position.marketTitle.ja
                          : position.marketTitle.en}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={
                          position.type === "yes"
                            ? "bg-yes-bg text-yes border-yes/20"
                            : "bg-no-bg text-no border-no/20"
                        }
                      >
                        {position.type === "yes" ? "Yes" : "No"} · {position.candidate}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {position.shares} {t("shares")} @ {position.avgPrice}¢
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium tabular-nums">
                      {formatCurrency(position.shares * position.currentPrice)}
                    </div>
                    <div
                      className={`text-sm tabular-nums ${
                        position.pnl >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {position.pnl >= 0 ? "+" : ""}
                      {formatCurrency(position.pnl)} ({position.pnlPercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="p-8 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("noHistory")}</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

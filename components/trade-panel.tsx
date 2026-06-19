"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Loader2 } from "lucide-react";
import { baseSepolia } from "wagmi/chains";
import { useAccount, useConfig, useConnect, useSwitchChain } from "wagmi";
import {
  readContract,
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useKIAIWallet } from "@/lib/hooks/use-kiai-wallet";
import type { UIMarket, UIContestant } from "@/lib/domain/market-service";
import { sharesToBaseUnits, usdToUsdcUnits } from "@/lib/domain/trade-units";
import {
  ERC20_TRADE_ABI,
  KIAI_VAULT_TRADE_ABI,
  marketIdToBytes32,
  outcomeSlugToBytes32,
} from "@/lib/contracts/trading-abis";

interface TradePanelProps {
  market: UIMarket;
  selectedContestant: UIContestant | null;
}

interface QuoteResult {
  id: string;
  chain: "BASE" | "SUI";
  pricePerShare: number;
  sharesOut: number;
  totalCostUsd: number;
  yesProbAfter: number;
  noProbAfter: number;
  expiresAt: string;
}

type SuiDepositTransactionPayload = {
  kind: "sui_deposit";
  packageId: string;
  usdcType: string;
  marketObjectId: string;
  outcomeSlug: string;
  outcomeIdBytes: number[];
  outcomeSlugBytes: number[];
  usdcAmount: string;
  shares: string;
  sender: string;
};

function buildSuiDepositTransaction(payload: SuiDepositTransactionPayload) {
  const tx = new Transaction();
  tx.setSender(payload.sender);

  const usdcCoin = tx.coin({
    type: payload.usdcType,
    balance: BigInt(payload.usdcAmount),
    useGasCoin: false,
  });

  tx.moveCall({
    target: payload.packageId + "::kiai_vault::deposit",
    typeArguments: [payload.usdcType],
    arguments: [
      tx.object(payload.marketObjectId),
      tx.pure(bcs.vector(bcs.u8()).serialize(payload.outcomeIdBytes)),
      tx.pure(bcs.vector(bcs.u8()).serialize(payload.outcomeSlugBytes)),
      usdcCoin,
      tx.pure.u64(BigInt(payload.shares)),
    ],
  });

  return tx;
}

interface OrderResult {
  id: string;
  status: string;
}

type Chain = "BASE" | "SUI";
type StatusTone = "error" | "info" | "success";

const BASE_USDC_FALLBACK = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Request failed.";
    throw new Error(message);
  }
  return data as T;
}

async function getBaseUsdcAddress(): Promise<Address> {
  const response = await fetch("/api/chains");
  const data = await parseApiResponse<{
    chains: Array<{
      chain: Chain;
      collateral: { address: string };
    }>;
  }>(response);
  const base = data.chains.find((chain) => chain.chain === "BASE");
  return (base?.collateral.address ?? BASE_USDC_FALLBACK) as Address;
}

export function TradePanel({ market, selectedContestant }: TradePanelProps) {
  const t = useTranslations("trade");
  const tMarket = useTranslations("market");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [position, setPosition] = useState<"yes" | "no">("yes");
  const [activeChain, setActiveChain] = useState<Chain>("BASE");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>("info");

  const config = useConfig();
  const dAppKit = useDAppKit();
  const { address: baseAddress, chainId } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { baseAddress: baseWalletAddress, suiAddress } = useKIAIWallet(activeChain);

  const contestant = selectedContestant || market.contestants[0];
  const numAmount = parseFloat(amount) || 0;
  const activeDeployment = market.chainDeployments.find(
    (deployment) => deployment.chain === activeChain
  );
  const railIsDeployed = activeDeployment?.deployStatus === "deployed";
  const activeWalletAddress =
    activeChain === "BASE" ? baseWalletAddress : suiAddress;
  const activeWalletConnected = !!activeWalletAddress;
  const baseConnector =
    connectors.find((connector) => connector.id === "baseAccount") ??
    connectors.find((connector) => connector.id === "injected") ??
    connectors[0];

  function setPanelStatus(message: string, tone: StatusTone = "info") {
    setStatusMessage(message);
    setStatusTone(tone);
  }

  async function patchOrder(
    orderId: string,
    body: {
      status: "WALLET_PENDING" | "WALLET_REJECTED" | "SUBMITTED_TO_CHAIN" | "CHAIN_FAILED";
      txHash?: string;
      failureReason?: string;
    }
  ) {
    await parseApiResponse(
      await fetch("/api/orders/" + orderId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  }

  async function createOrder(): Promise<OrderResult> {
    if (!quote || !activeWalletAddress) {
      throw new Error("Quote and wallet are required before order creation.");
    }

    const data = await parseApiResponse<{ order: OrderResult }>(
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          walletAddress: activeWalletAddress,
        }),
      })
    );
    return data.order;
  }

  const fetchQuote = useCallback(async () => {
    if (!contestant?.id || numAmount <= 0 || !railIsDeployed) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    try {
      const data = await parseApiResponse<{ quote: QuoteResult }>(
        await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketId: market.id,
            outcomeId: contestant.id,
            chain: activeChain,
            side: position,
            amountUsd: numAmount,
            walletAddress: activeWalletAddress ?? undefined,
          }),
        })
      );
      setQuote(data.quote);
      setStatusMessage(null);
    } catch (error) {
      setQuote(null);
      setPanelStatus(
        error instanceof Error ? error.message : "Unable to create quote.",
        "error"
      );
    } finally {
      setQuoteLoading(false);
    }
  }, [
    activeChain,
    activeWalletAddress,
    contestant?.id,
    market.id,
    numAmount,
    position,
    railIsDeployed,
  ]);

  useEffect(() => {
    if (numAmount <= 0) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(fetchQuote, 600);
    return () => clearTimeout(timer);
  }, [fetchQuote, numAmount, position]);

  async function executeBaseTrade() {
    if (!quote || !contestant || !baseAddress || !activeDeployment) return;

    const vaultAddress = (activeDeployment.contractAddress ??
      activeDeployment.poolAddress) as Address | null;
    if (!vaultAddress) {
      throw new Error("Base vault address is missing for this market.");
    }

    if (chainId !== baseSepolia.id) {
      setPanelStatus("Switching wallet to Base Sepolia...");
      await switchChainAsync({ chainId: baseSepolia.id });
    }

    const order = await createOrder();
    try {
      await patchOrder(order.id, { status: "WALLET_PENDING" });
      const usdcAddress = await getBaseUsdcAddress();
      const usdcAmount = usdToUsdcUnits(quote.totalCostUsd);
      const shares = sharesToBaseUnits(quote.sharesOut);

      setPanelStatus("Checking USDC allowance...");
      const allowance = await readContract(config, {
        chainId: baseSepolia.id,
        address: usdcAddress,
        abi: ERC20_TRADE_ABI,
        functionName: "allowance",
        args: [baseAddress as Address, vaultAddress],
      });

      if ((allowance as bigint) < usdcAmount) {
        setPanelStatus("Approve USDC in your wallet...");
        const approveSimulation = await simulateContract(config, {
          chainId: baseSepolia.id,
          account: baseAddress as Address,
          address: usdcAddress,
          abi: ERC20_TRADE_ABI,
          functionName: "approve",
          args: [vaultAddress, usdcAmount],
        });
        const approveHash = await writeContract(config, approveSimulation.request);
        await waitForTransactionReceipt(config, {
          chainId: baseSepolia.id,
          hash: approveHash,
        });
      }

      setPanelStatus("Confirm the trade in your wallet...");
      const depositSimulation = await simulateContract(config, {
        chainId: baseSepolia.id,
        account: baseAddress as Address,
        address: vaultAddress,
        abi: KIAI_VAULT_TRADE_ABI,
        functionName: "deposit",
        args: [
          marketIdToBytes32(market.id),
          outcomeSlugToBytes32(contestant.slug),
          contestant.slug,
          usdcAmount,
          shares,
        ],
      });
      const txHash = await writeContract(config, depositSimulation.request);
      setPanelStatus("Transaction submitted. Waiting for Base receipt...");
      const receipt = await waitForTransactionReceipt(config, {
        chainId: baseSepolia.id,
        hash: txHash,
      });

      if (receipt.status !== "success") {
        await patchOrder(order.id, {
          status: "CHAIN_FAILED",
          txHash,
          failureReason: "Base transaction receipt was not successful.",
        });
        setPanelStatus("Base transaction failed. No portfolio position was finalized.", "error");
        return;
      }

      await patchOrder(order.id, {
        status: "SUBMITTED_TO_CHAIN",
        txHash,
      });
      setPanelStatus(
        "Base transaction confirmed. Portfolio will finalize after indexer reconciliation.",
        "success"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Base trade failed.";
      await patchOrder(order.id, {
        status: message.toLowerCase().includes("reject") ? "WALLET_REJECTED" : "CHAIN_FAILED",
        failureReason: message,
      }).catch(() => {});
      throw error;
    }
  }

  async function executeSuiTrade() {
    if (!quote || !activeWalletAddress) return;
    const order = await createOrder();

    try {
      setPanelStatus("Preparing Sui transaction...");
      const prep = await parseApiResponse<{
        transactionPayload: SuiDepositTransactionPayload;
        order: { id: string; status: string };
      }>(
        await fetch("/api/orders/" + order.id + "/sui-deposit-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: activeWalletAddress }),
        })
      );

      setPanelStatus("Confirm the Sui transaction in your wallet...");
      const result = await dAppKit.signAndExecuteTransaction({
        transaction: buildSuiDepositTransaction(prep.transactionPayload),
      });

      if (result.$kind === "FailedTransaction") {
        const digest = result.FailedTransaction.digest;
        const failedStatus = result.FailedTransaction.status as { error?: unknown };
        const failureReason =
          typeof failedStatus.error === "string"
            ? failedStatus.error
            : JSON.stringify(failedStatus.error ?? "Sui transaction failed.");
        await patchOrder(order.id, {
          status: "CHAIN_FAILED",
          txHash: digest,
          failureReason,
        });
        setPanelStatus("Sui transaction failed. No portfolio position was finalized.", "error");
        return;
      }

      const digest = result.Transaction.digest;
      setPanelStatus("Transaction submitted. Waiting for Sui indexing...");
      await dAppKit.getClient().core.waitForTransaction({ digest });
      await patchOrder(order.id, {
        status: "SUBMITTED_TO_CHAIN",
        txHash: digest,
      });
      setPanelStatus(
        "Sui transaction confirmed. Portfolio will finalize after indexer reconciliation.",
        "success"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sui trade failed.";
      await patchOrder(order.id, {
        status: message.toLowerCase().includes("reject") ? "WALLET_REJECTED" : "CHAIN_FAILED",
        failureReason: message,
      }).catch(() => {});
      throw error;
    }
  }

  async function submitTrade() {
    if (!activeWalletConnected) {
      if (activeChain === "BASE" && baseConnector) {
        await connectAsync({ connector: baseConnector });
        return;
      }
      setPanelStatus("Open Deposit and connect a Sui wallet before trading.", "error");
      return;
    }

    if (!railIsDeployed) {
      setPanelStatus(activeChain + " is not deployed for this market yet.", "error");
      return;
    }

    if (tradeType !== "buy" || position !== "yes") {
      setPanelStatus(
        "Real wallet execution currently supports buying YES positions only.",
        "error"
      );
      return;
    }

    if (!quote) {
      setPanelStatus("Enter an amount and wait for a fresh quote first.", "error");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      if (activeChain === "BASE") {
        await executeBaseTrade();
      } else {
        await executeSuiTrade();
      }
    } catch (error) {
      setPanelStatus(
        error instanceof Error ? error.message : "Trade execution failed.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const price = position === "yes" ? contestant?.priceYes : contestant?.priceNo;
  const sharesOut = quote?.sharesOut ?? (price ? Math.floor((numAmount / price) * 100) : 0);
  const estimatedReturn = sharesOut * 1;
  const profit = estimatedReturn - numAmount;

  const formatCurrency = (value: number) => {
    return "$" + value.toFixed(2);
  };

  const statusClassName =
    statusTone === "error"
      ? "bg-destructive/10 text-destructive"
      : statusTone === "success"
        ? "bg-up/10 text-up"
        : "bg-muted text-foreground-secondary";

  return (
    <Card className="overflow-hidden border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <BarChart3 className="h-4 w-4 text-foreground-muted" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {market.title.en}
          </p>
        </div>
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="text-xs text-foreground-muted">
          {tradeType === "buy" ? t("buy") : t("sell")} {position === "yes" ? tMarket("yes") : tMarket("no")}
        </p>
        <p className="font-medium text-foreground">{contestant?.name}</p>
      </div>

      <div className="border-b border-border p-4">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["BASE", "SUI"] as const).map((chain) => {
            const deployment = market.chainDeployments.find((item) => item.chain === chain);
            const deployed = deployment?.deployStatus === "deployed";
            return (
              <button
                key={chain}
                type="button"
                disabled={!deployed}
                onClick={() => {
                  setActiveChain(chain);
                  setQuote(null);
                  setStatusMessage(null);
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                  activeChain === chain
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground-secondary hover:border-border-strong",
                  !deployed && "cursor-not-allowed opacity-50"
                )}
              >
                {chain === "BASE" ? "Base" : "Sui"}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-lg border border-border p-1">
            <button
              type="button"
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
              type="button"
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

          <Button variant="outline" size="sm" disabled>
            $ USD
          </Button>
        </div>
      </div>

      <div className="border-b border-border p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
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
            type="button"
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

      <div className="border-b border-border p-4">
        <label className="mb-2 block text-xs font-medium text-foreground-muted">
          {t("amount")}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
            $
          </span>
          <Input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            className="pl-7 text-right tabular-nums"
          />
        </div>

        <div className="mt-2 flex gap-2">
          {[10, 50, 100, 500].map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setAmount(String(value))}
              className="flex-1 rounded-lg border border-border py-1 text-xs font-medium text-foreground-secondary hover:bg-muted"
            >
              {"$" + value}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Rail</span>
          <span className="font-medium text-foreground">
            {activeChain === "BASE" ? "Base Sepolia" : "Sui Testnet"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Shares</span>
          <span className="font-medium tabular-nums text-foreground">
            {quote ? quote.sharesOut.toFixed(4) : sharesOut.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">{t("estimatedReturn")}</span>
          <span className="font-medium tabular-nums text-up">
            {formatCurrency(Math.max(0, profit))}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className={cn("mx-4 mb-2 rounded-lg px-3 py-2 text-xs", statusClassName)}>
          {statusMessage}
        </div>
      )}

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
            quoteLoading ||
            isSubmitting ||
            !railIsDeployed
          }
          onClick={submitTrade}
        >
          {quoteLoading || isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {quoteLoading ? "Pricing..." : "Submitting..."}
            </span>
          ) : !activeWalletConnected ? (
            activeChain === "BASE" ? "Connect Base Wallet" : "Connect Sui Wallet"
          ) : !railIsDeployed ? (
            "Rail unavailable"
          ) : (
            t("submit")
          )}
        </Button>
      </div>
    </Card>
  );
}

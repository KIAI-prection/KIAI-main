import { sharesToSuiUnits, usdToUsdcUnits } from "@/lib/domain/trade-units";

type PrepOutcome = {
  id: string;
  slug: string;
};

type PrepDeployment = {
  deployStatus: string;
  poolAddress: string | null;
};

type PrepQuote = {
  expiresAt: Date;
  status: string;
  totalCostUsd: unknown;
  sharesOut: unknown;
};

export type SuiDepositPrepOrder = {
  id: string;
  chain: string;
  walletAddress: string | null;
  outcomeId: string | null;
  quote: PrepQuote | null;
  market: {
    lifecycle: string;
    outcomes: PrepOutcome[];
    chainDeployments: PrepDeployment[];
  };
};

export type SuiDepositPrepResult =
  | {
      ok: true;
      status: 200;
      body: {
        transaction: string;
        order: { id: string; status: string };
        units: { usdcAmount: string; shares: string };
      };
    }
  | {
      ok: false;
      status: number;
      body: { error: string; message: string };
    };

export async function prepareSuiDepositTransaction(
  input: {
    id: string;
    walletAddress?: string;
    now?: Date;
  },
  deps: {
    findOrder: (id: string) => Promise<SuiDepositPrepOrder | null>;
    markWalletPending: (id: string) => Promise<{ id: string; status: string }>;
    buildTransaction: (
      marketObjectId: string,
      outcomeSlug: string,
      usdcAmount: bigint,
      shares: bigint,
      sender: string
    ) => Promise<string>;
  }
): Promise<SuiDepositPrepResult> {
  const rawWalletAddress = input.walletAddress?.trim();
  if (!rawWalletAddress) {
    return {
      ok: false,
      status: 400,
      body: { error: "validation_error", message: "Wallet address is required." },
    };
  }

  const walletAddress = rawWalletAddress.toLowerCase();
  const order = await deps.findOrder(input.id);

  if (!order) {
    return {
      ok: false,
      status: 404,
      body: { error: "not_found", message: "Order not found." },
    };
  }

  if (order.chain !== "SUI") {
    return {
      ok: false,
      status: 422,
      body: { error: "wrong_chain", message: "Order is not a Sui order." },
    };
  }

  if (order.walletAddress?.toLowerCase() !== walletAddress) {
    return {
      ok: false,
      status: 422,
      body: { error: "wallet_mismatch", message: "Wallet does not match this order." },
    };
  }

  const now = input.now ?? new Date();
  if (!order.quote || order.quote.expiresAt < now) {
    return {
      ok: false,
      status: 422,
      body: { error: "quote_expired", message: "Quote has expired. Request a new quote." },
    };
  }

  if (!["ready", "consumed"].includes(order.quote.status)) {
    return {
      ok: false,
      status: 422,
      body: {
        error: "quote_not_ready",
        message: `Quote is ${order.quote.status}. Request a new quote.`,
      },
    };
  }

  if (order.market.lifecycle !== "LIVE") {
    return {
      ok: false,
      status: 422,
      body: { error: "market_not_live", message: "Market is no longer live." },
    };
  }

  const deployment = order.market.chainDeployments[0];
  if (!deployment || deployment.deployStatus !== "deployed" || !deployment.poolAddress) {
    return {
      ok: false,
      status: 422,
      body: { error: "chain_unavailable", message: "Sui rail is not deployed for this market." },
    };
  }

  if (!order.outcomeId) {
    return {
      ok: false,
      status: 404,
      body: { error: "outcome_not_found", message: "Order outcome was not found." },
    };
  }

  const outcome = order.market.outcomes.find((o) => o.id === order.outcomeId);
  if (!outcome) {
    return {
      ok: false,
      status: 404,
      body: { error: "outcome_not_found", message: "Order outcome was not found." },
    };
  }

  const usdcAmount = usdToUsdcUnits(Number(order.quote.totalCostUsd));
  const shares = sharesToSuiUnits(Number(order.quote.sharesOut));
  const transaction = await deps.buildTransaction(
    deployment.poolAddress,
    outcome.slug,
    usdcAmount,
    shares,
    walletAddress
  );
  const updated = await deps.markWalletPending(order.id);

  return {
    ok: true,
    status: 200,
    body: {
      transaction,
      order: { id: updated.id, status: updated.status },
      units: { usdcAmount: usdcAmount.toString(), shares: shares.toString() },
    },
  };
}

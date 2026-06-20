/**
 * KIAI Market Service — LMSR (Logarithmic Market Scoring Rule) pricing engine.
 *
 * Architecture: one pool, two payment rails.
 * Base and Sui are custody/settlement rails only. All pricing lives here.
 *
 * LMSR Reference:
 *   Hanson, R. (2003). Combinatorial Information Market Design.
 *   Information Systems Frontiers, 5(1), 107–119.
 *
 * Formulas (binary market, outcomes: yes/no):
 *   cost(q) = b * ln(exp(q_yes/b) + exp(q_no/b))
 *   price_yes = exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
 *   price_no  = 1 - price_yes
 *   shares_for_yes(c) = solve: cost(q_yes + s, q_no) - cost(q_yes, q_no) = c
 *                     = b * ln(exp(c/b) + exp((q_no - q_yes)/b)) - q_no + q_yes
 *
 * All monetary values are in USD. Prices are probabilities (0–1 range internally,
 * 0–100 integer when exposed to the UI).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LmsrState {
  /** Liquidity parameter. Higher b = more liquidity, more house risk. */
  b: number;
  /** Cumulative YES shares quantity bought. */
  qYes: number;
  /** Cumulative NO shares quantity bought. */
  qNo: number;
}

export interface LmsrQuote {
  /** Price per share (0–1) for the requested side. */
  pricePerShare: number;
  /** Shares returned for the given USD cost. */
  sharesOut: number;
  /** Total USD cost for sharesOut shares. */
  totalCostUsd: number;
  /** YES probability (0–1) after this trade. */
  yesProbAfter: number;
  /** NO probability (0–1) after this trade. */
  noProbAfter: number;
}

export interface LmsrPrices {
  /** YES price (0–1). */
  priceYes: number;
  /** NO price (0–1). */
  priceNo: number;
  /** YES probability as 0–100 integer for UI. */
  chanceYes: number;
  /** NO probability as 0–100 integer for UI. */
  chanceNo: number;
}

// ---------------------------------------------------------------------------
// Core LMSR math
// ---------------------------------------------------------------------------

/**
 * LMSR cost function: b * ln(sum(exp(q_i / b)))
 * Numerically stable via the log-sum-exp trick.
 */
function lmsrCost(b: number, qYes: number, qNo: number): number {
  const a = Math.max(qYes / b, qNo / b);
  return b * (a + Math.log(Math.exp(qYes / b - a) + Math.exp(qNo / b - a)));
}

/**
 * Current YES and NO prices from LMSR state.
 */
export function lmsrPrices(state: LmsrState): LmsrPrices {
  const { b, qYes, qNo } = state;
  const a = Math.max(qYes / b, qNo / b);
  const eY = Math.exp(qYes / b - a);
  const eN = Math.exp(qNo / b - a);
  const sum = eY + eN;
  const priceYes = eY / sum;
  const priceNo = eN / sum;
  return {
    priceYes,
    priceNo,
    chanceYes: Math.round(priceYes * 100),
    chanceNo: Math.round(priceNo * 100),
  };
}

/**
 * Compute a quote for buying YES or NO shares with a given USD amount.
 *
 * For buying YES shares with cost c:
 *   new_qYes such that cost(new_qYes, qNo) - cost(qYes, qNo) = c
 *   Closed-form: new_qYes = b * ln(exp(c/b) + exp((qNo - qYes)/b)) + qYes - qNo + qNo
 *             = qYes + b * ln(exp(c/b) + exp((qNo - qYes)/b))
 *
 * Wait — let me derive carefully:
 *   cost(q_yes + s, q_no) - cost(q_yes, q_no) = c
 *   s = shares for YES
 *   We need to find s given c.
 *
 * For the LMSR closed-form solution for buying s shares of YES at cost c:
 *   The cost of buying s YES shares from state (qY, qN) is:
 *   c(s) = b * ln(exp((qY+s)/b) + exp(qN/b)) - b * ln(exp(qY/b) + exp(qN/b))
 *
 *   Solving for s:
 *   exp((qY+s)/b) = exp(c/b) * (exp(qY/b) + exp(qN/b)) - exp(qN/b)
 *   (qY+s)/b = ln(exp(c/b) * (exp(qY/b) + exp(qN/b)) - exp(qN/b))
 *   s = b * ln(exp(c/b) * (exp(qY/b) + exp(qN/b)) - exp(qN/b)) - qY
 *
 * This uses the log-sum-exp trick for numerical stability.
 */
export function lmsrQuote(
  state: LmsrState,
  side: "yes" | "no",
  costUsd: number
): LmsrQuote {
  const { b, qYes, qNo } = state;

  const [qBuy, qOther] = side === "yes" ? [qYes, qNo] : [qNo, qYes];

  // Numerically stable version of the closed-form shares formula
  // s = b * ln(exp(c/b) * (exp(qBuy/b) + exp(qOther/b)) - exp(qOther/b)) - qBuy
  // Using log-sum-exp:
  const maxQ = Math.max(qBuy / b, qOther / b);
  const sumExp = Math.exp(qBuy / b - maxQ) + Math.exp(qOther / b - maxQ);

  // exp(c/b) * sumExp * exp(maxQ) - exp(qOther/b)
  // = exp(c/b + maxQ) * sumExp - exp(qOther/b)
  const term = Math.exp(costUsd / b + maxQ) * sumExp - Math.exp(qOther / b);

  if (term <= 0) {
    throw new Error("LMSR: invalid cost/state — term is non-positive");
  }

  const sharesOut = b * Math.log(term) - qBuy;

  if (sharesOut <= 0) {
    throw new Error("LMSR: shares out is non-positive for given cost");
  }

  // New state after trade
  const newQBuy = qBuy + sharesOut;
  const [newQYes, newQNo] =
    side === "yes" ? [newQBuy, qOther] : [qOther, newQBuy];

  const pricePerShare = costUsd / sharesOut;
  const newPrices = lmsrPrices({ b, qYes: newQYes, qNo: newQNo });

  return {
    pricePerShare,
    sharesOut,
    totalCostUsd: costUsd,
    yesProbAfter: newPrices.priceYes,
    noProbAfter: newPrices.priceNo,
  };
}

/**
 * Compute how much USD is needed to buy a specific number of YES/NO shares.
 * Used for the reverse direction (user specifies shares, we compute cost).
 */
export function lmsrCostForShares(
  state: LmsrState,
  side: "yes" | "no",
  shares: number
): number {
  const { b, qYes, qNo } = state;
  const [qBuy, qOther] = side === "yes" ? [qYes, qNo] : [qNo, qYes];
  const costAfter = lmsrCost(b, qBuy + shares, qOther);
  const costBefore = lmsrCost(b, qBuy, qOther);
  return costAfter - costBefore;
}

/**
 * Maximum loss for the market maker given current LMSR state.
 * This is the worst-case payout if all shares in the winning outcome are claimed.
 * Used by the operator to understand house exposure.
 */
export function lmsrMaxLoss(state: LmsrState): number {
  const { b, qYes, qNo } = state;
  const worstCase = lmsrCost(b, Math.max(qYes, qNo), Math.min(qYes, qNo));
  const baseline = lmsrCost(b, 0, 0);
  return worstCase - baseline;
}

// ---------------------------------------------------------------------------
// UI shape adapter
// Maps database Market + Outcome rows to the shape lib/mock-data.ts expects.
// ---------------------------------------------------------------------------

import type {
  ChainDeployment as PrismaChainDeployment,
  Market as PrismaMarket,
  Outcome as PrismaOutcome,
  MarketChartPoint as PrismaChartPoint,
} from "@prisma/client";

/** Wire shape the frozen UI expects for a market list card. */
export interface UIMarket {
  id: string;
  title: { en: string };
  subtitle: { en: string };
  category: string;
  categoryLabel: { en: string };
  status: "live" | "upcoming" | "closed";
  statusInfo?: { en: string };
  volume: number;
  marketCount: number;
  contestants: UIContestant[];
  chartData: { time: string; value: number }[];
  chainDeployments: UIChainDeployment[];
}

export interface UIContestant {
  id: string;
  slug: string;
  name: string;
  flag?: string;
  chance: number;
  priceYes: number;
  priceNo: number;
  change?: number;
  odds?: string;
  secondary?: string;
}

export interface UIChainDeployment {
  chain: "BASE" | "SUI";
  collateral: string;
  deployStatus: string;
  contractAddress: string | null;
  poolAddress: string | null;
}

export function marketToUI(
  market: PrismaMarket & {
    outcomes: PrismaOutcome[];
    chartPoints: PrismaChartPoint[];
    chainDeployments?: PrismaChainDeployment[];
  }
): UIMarket {
  const lifecycleToStatus = (
    lc: string
  ): "live" | "upcoming" | "closed" => {
    if (lc === "LIVE") return "live";
    if (lc === "DRAFT" || lc === "REVIEWED" || lc === "DEPLOY_PENDING")
      return "upcoming";
    return "closed";
  };

  return {
    id: market.id,
    title: { en: market.titleEn },
    subtitle: { en: market.subtitleEn },
    category: market.category,
    categoryLabel: { en: market.categoryLabelEn },
    status: lifecycleToStatus(market.lifecycle),
    statusInfo:
      market.statusInfoEn
        ? { en: market.statusInfoEn }
        : undefined,
    volume: Number(market.volumeUsd),
    marketCount: market.marketCount,
    contestants: market.outcomes
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({
        id: o.id,
        slug: o.slug,
        name: o.name,
        flag: o.flag ?? undefined,
        chance: o.chance,
        priceYes: o.priceYes,
        priceNo: o.priceNo,
        change: o.change ?? undefined,
        odds: o.odds ?? undefined,
        secondary: o.secondary ?? undefined,
      })),
    chartData: market.chartPoints
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({ time: p.time, value: p.value })),
    chainDeployments: (market.chainDeployments ?? []).map((deployment) => ({
      chain: deployment.chain,
      collateral: deployment.collateral,
      deployStatus: deployment.deployStatus,
      contractAddress: deployment.contractAddress,
      poolAddress: deployment.poolAddress,
    })),
  };
}

import {
  OrderIntentStatus,
  SettlementJobStatus,
  type CollateralAsset,
  type PrismaClient,
} from "@prisma/client";

type EnvMap = Record<string, string | undefined>;

type EnvRequirement = {
  name: string;
  category: "core" | "chain" | "operator" | "optional";
  severity: OpsIssueSeverity;
  minLength?: number;
  recommendedMinLength?: number;
};

export type OpsIssueSeverity = "blocker" | "warning" | "info";

export type OpsIssue = {
  severity: OpsIssueSeverity;
  area: string;
  code: string;
  message: string;
  evidence?: Record<string, unknown>;
};

export type OpsReadiness = "blocked" | "needs_review" | "ready_for_founder_qa";

const REQUIRED_ENV: EnvRequirement[] = [
  { name: "DATABASE_URL", category: "core", severity: "blocker", minLength: 20 },
  {
    name: "OPERATOR_SECRET",
    category: "operator",
    severity: "blocker",
    minLength: 1,
    recommendedMinLength: 32,
  },
  { name: "BASE_SEPOLIA_RPC_URL", category: "chain", severity: "blocker", minLength: 10 },
  { name: "SUI_TESTNET_RPC_URL", category: "chain", severity: "blocker", minLength: 10 },
  { name: "SUI_TESTNET_GRAPHQL_URL", category: "chain", severity: "blocker", minLength: 10 },
  { name: "BASE_SEPOLIA_USDC_ADDRESS", category: "chain", severity: "blocker", minLength: 42 },
  { name: "SUI_TESTNET_USDC_TYPE", category: "chain", severity: "blocker", minLength: 20 },
  { name: "BASE_SEPOLIA_KIAI_VAULT_ADDRESS", category: "chain", severity: "blocker", minLength: 42 },
  { name: "SUI_TESTNET_KIAI_VAULT_PACKAGE_ID", category: "chain", severity: "blocker", minLength: 42 },
  { name: "SUI_TESTNET_KIAI_VAULT_REGISTRY_ID", category: "chain", severity: "blocker", minLength: 42 },
  { name: "SUI_TESTNET_KIAI_OPERATOR_CAP_ID", category: "chain", severity: "blocker", minLength: 42 },
  { name: "DEPLOYER_PRIVATE_KEY", category: "chain", severity: "warning", minLength: 32 },
  { name: "SUI_OPERATOR_PRIVATE_KEY", category: "chain", severity: "warning", minLength: 32 },
];

const PUBLIC_PLACEHOLDER_PATTERNS = [
  "postgresql://user:password@",
  "changeme",
  "example",
  "placeholder",
  "<",
  ">",
];

const ALLOWED_COLLATERAL = new Set<CollateralAsset>([
  "USDC_BASE_SEPOLIA",
  "USDC_SUI_TESTNET",
]);

const PENDING_ORDER_STATUSES: OrderIntentStatus[] = [
  "SUBMITTED_TO_CHAIN",
  "CHAIN_CONFIRMED",
  "INDEXING_PENDING",
  "INDEXING_LAGGED",
];

const FAILED_OR_BLOCKED_ORDER_STATUSES: OrderIntentStatus[] = [
  "QUOTE_REJECTED",
  "BLOCKED",
  "WALLET_REJECTED",
  "CHAIN_FAILED",
  "INDEXING_LAGGED",
];

const PROBLEM_SETTLEMENT_STATUSES: SettlementJobStatus[] = [
  "FAILED",
  "BLOCKED",
  "RETRYING",
];

export function isConfiguredEnvValue(value: string | undefined, minLength = 1) {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < minLength) return false;
  const lower = trimmed.toLowerCase();
  return !PUBLIC_PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function evaluateEnvReadiness(env: EnvMap = process.env) {
  const variables = REQUIRED_ENV.map((requirement) => ({
    name: requirement.name,
    category: requirement.category,
    configured: isConfiguredEnvValue(env[requirement.name], requirement.minLength),
    severityIfMissing: requirement.severity,
  }));

  const issues: OpsIssue[] = variables
    .filter((variable) => !variable.configured)
    .map((variable) => ({
      severity: variable.severityIfMissing,
      area: "env",
      code: "missing_env_" + variable.name.toLowerCase(),
      message: variable.name + " is not configured for the controlled beta runtime.",
      evidence: {
        variable: variable.name,
        category: variable.category,
      },
    }));

  for (const requirement of REQUIRED_ENV) {
    const value = env[requirement.name]?.trim() ?? "";
    if (
      requirement.recommendedMinLength &&
      isConfiguredEnvValue(value, requirement.minLength) &&
      value.length < requirement.recommendedMinLength
    ) {
      issues.push({
        severity: "warning",
        area: "env",
        code: "weak_env_" + requirement.name.toLowerCase(),
        message:
          requirement.name +
          " is configured but shorter than the controlled-beta recommendation.",
        evidence: {
          variable: requirement.name,
          category: requirement.category,
          recommendedMinLength: requirement.recommendedMinLength,
        },
      });
    }
  }

  return { variables, issues };
}

export function evaluateSourceRefresh(env: EnvMap = process.env, now = new Date()) {
  const raw = env.KIAI_SOURCE_REFRESHED_AT;
  if (!raw) {
    return {
      refreshedAt: null,
      ageDays: null,
      issues: [
        {
          severity: "warning" as const,
          area: "source_refresh",
          code: "source_refresh_not_recorded",
          message:
            "KIAI_SOURCE_REFRESHED_AT is not set; refresh Base/Sui/Circle/Tether/indexer sources before beta changes.",
        },
      ],
    };
  }

  const refreshedAt = new Date(raw);
  if (Number.isNaN(refreshedAt.getTime())) {
    return {
      refreshedAt: raw,
      ageDays: null,
      issues: [
        {
          severity: "warning" as const,
          area: "source_refresh",
          code: "source_refresh_invalid_date",
          message: "KIAI_SOURCE_REFRESHED_AT must be an ISO date string.",
          evidence: { value: raw },
        },
      ],
    };
  }

  const ageDays = Math.floor(
    (now.getTime() - refreshedAt.getTime()) / (24 * 60 * 60 * 1000)
  );
  const issues: OpsIssue[] =
    ageDays > 7
      ? [
          {
            severity: "warning",
            area: "source_refresh",
            code: "source_refresh_stale",
            message:
              "Source-pack refresh is older than 7 days; refresh before beta changes.",
            evidence: { refreshedAt: refreshedAt.toISOString(), ageDays },
          },
        ]
      : [];

  return {
    refreshedAt: refreshedAt.toISOString(),
    ageDays,
    issues,
  };
}

export function classifyOpsReadiness(issues: OpsIssue[]): OpsReadiness {
  if (issues.some((issue) => issue.severity === "blocker")) return "blocked";
  if (issues.some((issue) => issue.severity === "warning")) return "needs_review";
  return "ready_for_founder_qa";
}

export async function getOpsStatus(client: Pick<
  PrismaClient,
  | "market"
  | "chainDeployment"
  | "chainEvent"
  | "orderIntent"
  | "settlementJob"
  | "operatorAction"
  | "resolutionDispute"
  | "oracleAssertion"
> | null = null) {
  const prisma = client ?? (await import("@/lib/server/db")).db;
  const now = new Date();
  const env = evaluateEnvReadiness(process.env);
  const sourceRefresh = evaluateSourceRefresh(process.env, now);

  const [
    marketsByLifecycle,
    deployments,
    totalChainEvents,
    unprocessedChainEvents,
    oldestUnprocessedEvent,
    ordersByStatus,
    latestProblemOrders,
    settlementJobsByStatus,
    latestProblemSettlementJobs,
    recentOperatorActions,
    openDisputes,
    oracleAssertionsByStatus,
  ] = await Promise.all([
    prisma.market.groupBy({ by: ["lifecycle"], _count: { id: true } }),
    prisma.chainDeployment.findMany({
      select: {
        id: true,
        marketId: true,
        chain: true,
        collateral: true,
        deployStatus: true,
        contractAddress: true,
        poolAddress: true,
        lastIndexedBlock: true,
        updatedAt: true,
      },
      orderBy: [{ chain: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.chainEvent.count(),
    prisma.chainEvent.count({ where: { processedAt: null } }),
    prisma.chainEvent.findFirst({
      where: { processedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, chain: true, eventType: true, createdAt: true },
    }),
    prisma.orderIntent.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.orderIntent.findMany({
      where: { status: { in: FAILED_OR_BLOCKED_ORDER_STATUSES } },
      select: {
        id: true,
        marketId: true,
        chain: true,
        status: true,
        failureReason: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.settlementJob.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.settlementJob.findMany({
      where: { status: { in: PROBLEM_SETTLEMENT_STATUSES } },
      select: {
        id: true,
        marketId: true,
        chain: true,
        action: true,
        status: true,
        attempts: true,
        lastError: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.operatorAction.findMany({
      select: {
        id: true,
        operatorId: true,
        action: true,
        marketId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.resolutionDispute.count({
      where: { status: { in: ["OPEN", "ADJUDICATING"] } },
    }),
    prisma.oracleAssertion.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const issues: OpsIssue[] = [...env.issues, ...sourceRefresh.issues];

  for (const deployment of deployments) {
    if (!ALLOWED_COLLATERAL.has(deployment.collateral)) {
      issues.push({
        severity: "blocker",
        area: "collateral",
        code: "unsupported_collateral",
        message: "A chain deployment uses unsupported collateral.",
        evidence: {
          marketId: deployment.marketId,
          chain: deployment.chain,
          collateral: deployment.collateral,
        },
      });
    }

    if (deployment.deployStatus === "deployed") {
      const missingAddress =
        deployment.chain === "BASE"
          ? !deployment.contractAddress
          : !deployment.contractAddress || !deployment.poolAddress;
      if (missingAddress) {
        issues.push({
          severity: "blocker",
          area: "deployment",
          code: "deployed_rail_missing_address",
          message: "A deployed rail is missing its contract/package or pool address.",
          evidence: {
            marketId: deployment.marketId,
            chain: deployment.chain,
          },
        });
      }

      if (deployment.lastIndexedBlock === null) {
        issues.push({
          severity: "warning",
          area: "indexer",
          code: "deployed_rail_missing_index_cursor",
          message: "A deployed rail has no indexed block/checkpoint cursor yet.",
          evidence: {
            marketId: deployment.marketId,
            chain: deployment.chain,
          },
        });
      }
    }
  }

  const pendingOrders = countStatuses(ordersByStatus, PENDING_ORDER_STATUSES);
  const failedOrBlockedOrders = countStatuses(
    ordersByStatus,
    FAILED_OR_BLOCKED_ORDER_STATUSES
  );
  if (pendingOrders > 0) {
    issues.push({
      severity: "warning",
      area: "orders",
      code: "orders_waiting_for_reconciliation",
      message: "Some orders are waiting on chain/indexer/reconciliation state.",
      evidence: { count: pendingOrders },
    });
  }
  if (failedOrBlockedOrders > 0) {
    issues.push({
      severity: "warning",
      area: "orders",
      code: "failed_or_blocked_orders_present",
      message: "Failed or blocked orders are present and visible for operator review.",
      evidence: { count: failedOrBlockedOrders },
    });
  }

  const problemSettlementJobs = countStatuses(
    settlementJobsByStatus,
    PROBLEM_SETTLEMENT_STATUSES
  );
  if (problemSettlementJobs > 0) {
    issues.push({
      severity: "blocker",
      area: "settlement",
      code: "settlement_jobs_need_operator_action",
      message: "Settlement jobs are failed, blocked, or retrying.",
      evidence: { count: problemSettlementJobs },
    });
  }

  if (unprocessedChainEvents > 0 && oldestUnprocessedEvent) {
    const oldestAgeMinutes = Math.floor(
      (now.getTime() - oldestUnprocessedEvent.createdAt.getTime()) / 60000
    );
    issues.push({
      severity: oldestAgeMinutes >= 15 ? "blocker" : "warning",
      area: "indexer",
      code: "unprocessed_chain_events",
      message: "Chain events are waiting for reconciliation.",
      evidence: {
        count: unprocessedChainEvents,
        oldestAgeMinutes,
        oldestEventId: oldestUnprocessedEvent.id,
        chain: oldestUnprocessedEvent.chain,
        eventType: oldestUnprocessedEvent.eventType,
      },
    });
  }

  if (openDisputes > 0) {
    issues.push({
      severity: "warning",
      area: "resolution",
      code: "open_resolution_disputes",
      message: "Open or adjudicating resolution disputes require operator review.",
      evidence: { count: openDisputes },
    });
  }

  const readiness = classifyOpsReadiness(issues);

  return {
    generatedAt: now.toISOString(),
    readiness,
    issues,
    env: {
      variables: env.variables,
      sourceRefresh,
    },
    markets: {
      byLifecycle: groupRows(marketsByLifecycle, "lifecycle"),
    },
    deployments: {
      total: deployments.length,
      byChain: countBy(deployments, "chain"),
      byStatus: countBy(deployments, "deployStatus"),
      rails: deployments.map((deployment) => ({
        id: deployment.id,
        marketId: deployment.marketId,
        chain: deployment.chain,
        collateral: deployment.collateral,
        deployStatus: deployment.deployStatus,
        hasContractAddress: Boolean(deployment.contractAddress),
        hasPoolAddress: Boolean(deployment.poolAddress),
        lastIndexedBlock: deployment.lastIndexedBlock?.toString() ?? null,
        updatedAt: deployment.updatedAt.toISOString(),
      })),
    },
    indexer: {
      totalChainEvents,
      unprocessedChainEvents,
      oldestUnprocessedEvent: oldestUnprocessedEvent
        ? {
            id: oldestUnprocessedEvent.id,
            chain: oldestUnprocessedEvent.chain,
            eventType: oldestUnprocessedEvent.eventType,
            createdAt: oldestUnprocessedEvent.createdAt.toISOString(),
          }
        : null,
    },
    orders: {
      byStatus: groupRows(ordersByStatus, "status"),
      pendingReconciliation: pendingOrders,
      failedOrBlocked: failedOrBlockedOrders,
      latestProblems: latestProblemOrders.map((order) => ({
        ...order,
        updatedAt: order.updatedAt.toISOString(),
      })),
    },
    settlement: {
      byStatus: groupRows(settlementJobsByStatus, "status"),
      latestProblems: latestProblemSettlementJobs.map((job) => ({
        ...job,
        updatedAt: job.updatedAt.toISOString(),
      })),
    },
    governance: {
      openDisputes,
      oracleAssertionsByStatus: groupRows(oracleAssertionsByStatus, "status"),
      recentOperatorActions: recentOperatorActions.map((action) => ({
        ...action,
        createdAt: action.createdAt.toISOString(),
      })),
    },
  };
}

function groupRows<T extends Record<string, unknown>>(
  rows: Array<T & { _count: { id: number } }>,
  field: keyof T
) {
  return Object.fromEntries(
    rows.map((row) => [String(row[field]), row._count.id])
  );
}

function countStatuses<TStatus extends string>(
  rows: Array<{ status: TStatus; _count: { id: number } }>,
  statuses: TStatus[]
) {
  const allowed = new Set(statuses);
  return rows.reduce(
    (total, row) => total + (allowed.has(row.status) ? row._count.id : 0),
    0
  );
}

function countBy<T extends Record<string, unknown>>(rows: T[], field: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row[field]);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

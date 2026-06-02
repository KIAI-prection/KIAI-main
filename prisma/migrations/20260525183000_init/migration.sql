-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('SUI', 'BASE');

-- CreateEnum
CREATE TYPE "MarketLifecycle" AS ENUM ('DRAFT', 'REVIEWED', 'DEPLOY_PENDING', 'DEPLOY_FAILED', 'LIVE', 'PAUSED', 'CLOSED', 'RESOLVING', 'DISPUTED', 'RESOLVED', 'SETTLING', 'SETTLEMENT_FAILED', 'SETTLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderIntentStatus" AS ENUM ('INTENT_CREATED', 'QUOTE_REQUESTED', 'QUOTE_REJECTED', 'QUOTE_READY', 'COMPLIANCE_CHECKED', 'BLOCKED', 'WALLET_PENDING', 'WALLET_REJECTED', 'SUBMITTED_TO_CHAIN', 'CHAIN_FAILED', 'CHAIN_CONFIRMED', 'INDEXING_PENDING', 'INDEXING_LAGGED', 'RECONCILED', 'PORTFOLIO_FINAL');

-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('PENDING', 'PROPOSED', 'DISPUTE_WINDOW', 'DISPUTED', 'ADJUDICATING', 'FINALIZING', 'FINAL', 'FAILED');

-- CreateEnum
CREATE TYPE "CollateralAsset" AS ENUM ('USDC_BASE_SEPOLIA', 'USDC_SUI_TESTNET');

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleJa" TEXT NOT NULL DEFAULT '',
    "subtitleEn" TEXT NOT NULL DEFAULT '',
    "subtitleJa" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "categoryLabelEn" TEXT NOT NULL,
    "categoryLabelJa" TEXT NOT NULL DEFAULT '',
    "lifecycle" "MarketLifecycle" NOT NULL DEFAULT 'DRAFT',
    "statusInfoEn" TEXT,
    "statusInfoJa" TEXT,
    "volumeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "marketCount" INTEGER NOT NULL DEFAULT 0,
    "openAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flag" TEXT,
    "chance" INTEGER NOT NULL DEFAULT 0,
    "priceYes" INTEGER NOT NULL DEFAULT 50,
    "priceNo" INTEGER NOT NULL DEFAULT 50,
    "change" INTEGER,
    "odds" TEXT,
    "secondary" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketChartPoint" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MarketChartPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChainDeployment" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "collateral" "CollateralAsset" NOT NULL,
    "contractAddress" TEXT,
    "poolAddress" TEXT,
    "deployStatus" TEXT NOT NULL DEFAULT 'not_deployed',
    "liquidityUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "ChainDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompliancePolicy" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "allowedRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockedRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kycTierRequired" INTEGER NOT NULL DEFAULT 0,
    "maxPositionUsd" DECIMAL(65,30),
    "maxDailyUsd" DECIMAL(65,30),
    "legalNotesEn" TEXT,
    "legalNotesJa" TEXT,

    CONSTRAINT "CompliancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "status" "ResolutionStatus" NOT NULL DEFAULT 'PENDING',
    "proposedOutcome" TEXT,
    "finalOutcome" TEXT,
    "sourceSnapshot" JSONB,
    "proposer" TEXT,
    "disputeDeadline" TIMESTAMP(3),
    "finalizationTx" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderIntent" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcomeId" TEXT,
    "chain" "Chain" NOT NULL,
    "side" TEXT NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "status" "OrderIntentStatus" NOT NULL DEFAULT 'INTENT_CREATED',
    "walletAddress" TEXT,
    "txHash" TEXT,
    "quoteId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcomeSlug" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "side" TEXT NOT NULL,
    "shares" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgEntry" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "realizedPnlUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unrealizedPnlUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "claimableUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reconciledAt" TIMESTAMP(3),
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_slug_key" ON "Market"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Outcome_marketId_slug_key" ON "Outcome"("marketId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ChainDeployment_marketId_chain_key" ON "ChainDeployment"("marketId", "chain");

-- CreateIndex
CREATE UNIQUE INDEX "CompliancePolicy_marketId_key" ON "CompliancePolicy"("marketId");

-- CreateIndex
CREATE INDEX "UserPosition_userId_idx" ON "UserPosition"("userId");

-- CreateIndex
CREATE INDEX "UserPosition_marketId_idx" ON "UserPosition"("marketId");

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketChartPoint" ADD CONSTRAINT "MarketChartPoint_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChainDeployment" ADD CONSTRAINT "ChainDeployment_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompliancePolicy" ADD CONSTRAINT "CompliancePolicy_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

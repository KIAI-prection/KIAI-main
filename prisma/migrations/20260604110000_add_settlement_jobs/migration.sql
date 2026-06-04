-- CreateEnum
CREATE TYPE "SettlementJobStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'BLOCKED', 'RETRYING');

-- CreateEnum
CREATE TYPE "SettlementAction" AS ENUM ('RESOLVE', 'CANCEL', 'UNSUPPORTED');

-- CreateTable
CREATE TABLE "SettlementJob" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "resolutionId" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "action" "SettlementAction" NOT NULL,
    "status" "SettlementJobStatus" NOT NULL DEFAULT 'PENDING',
    "settlementInstruction" JSONB NOT NULL,
    "payoutMode" TEXT NOT NULL,
    "finalOutcome" TEXT,
    "txHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettlementJob_resolutionId_chain_key" ON "SettlementJob"("resolutionId", "chain");

-- CreateIndex
CREATE INDEX "SettlementJob_marketId_idx" ON "SettlementJob"("marketId");

-- CreateIndex
CREATE INDEX "SettlementJob_status_idx" ON "SettlementJob"("status");

-- AddForeignKey
ALTER TABLE "SettlementJob" ADD CONSTRAINT "SettlementJob_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementJob" ADD CONSTRAINT "SettlementJob_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

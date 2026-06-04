-- CreateEnum
CREATE TYPE "EvidenceSnapshotKind" AS ENUM ('OFFICIAL_SOURCE', 'API_PAYLOAD', 'SCREENSHOT', 'ARCHIVE', 'OPERATOR_NOTE');

-- CreateEnum
CREATE TYPE "EvidenceSnapshotStatus" AS ENUM ('CAPTURED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResolutionDisputeStatus" AS ENUM ('OPEN', 'ADJUDICATING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResolutionDisputeReason" AS ENUM ('SOURCE_DISAGREEMENT', 'ORACLE_CHALLENGE', 'EVIDENCE_TAMPERING', 'MANUAL_SAFETY', 'TOO_EARLY', 'OTHER');

-- CreateEnum
CREATE TYPE "OracleAssertionStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'PROPOSED', 'DISPUTED', 'SETTLED', 'FAILED');

-- CreateTable
CREATE TABLE "EvidenceSnapshot" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "resolutionId" TEXT,
    "kind" "EvidenceSnapshotKind" NOT NULL,
    "status" "EvidenceSnapshotStatus" NOT NULL DEFAULT 'CAPTURED',
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "archiveUrl" TEXT,
    "screenshotUrl" TEXT,
    "payloadHash" TEXT NOT NULL,
    "rawPayload" JSONB,
    "observedOutcome" TEXT,
    "providerEventStatus" TEXT,
    "sourceCertainty" TEXT,
    "capturedBy" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolutionDispute" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "resolutionId" TEXT NOT NULL,
    "reason" "ResolutionDisputeReason" NOT NULL,
    "status" "ResolutionDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "openedBy" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "evidence" JSONB,
    "resolutionNote" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResolutionDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracleAssertion" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "resolutionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "OracleAssertionStatus" NOT NULL DEFAULT 'REQUESTED',
    "assertionId" TEXT,
    "requestId" TEXT,
    "bond" TEXT,
    "livenessSeconds" INTEGER,
    "assertedOutcome" TEXT,
    "payload" JSONB,
    "createdBy" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OracleAssertion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceSnapshot_marketId_idx" ON "EvidenceSnapshot"("marketId");

-- CreateIndex
CREATE INDEX "EvidenceSnapshot_resolutionId_idx" ON "EvidenceSnapshot"("resolutionId");

-- CreateIndex
CREATE INDEX "EvidenceSnapshot_payloadHash_idx" ON "EvidenceSnapshot"("payloadHash");

-- CreateIndex
CREATE INDEX "ResolutionDispute_marketId_idx" ON "ResolutionDispute"("marketId");

-- CreateIndex
CREATE INDEX "ResolutionDispute_resolutionId_idx" ON "ResolutionDispute"("resolutionId");

-- CreateIndex
CREATE INDEX "ResolutionDispute_status_idx" ON "ResolutionDispute"("status");

-- CreateIndex
CREATE INDEX "OracleAssertion_marketId_idx" ON "OracleAssertion"("marketId");

-- CreateIndex
CREATE INDEX "OracleAssertion_resolutionId_idx" ON "OracleAssertion"("resolutionId");

-- CreateIndex
CREATE INDEX "OracleAssertion_provider_idx" ON "OracleAssertion"("provider");

-- CreateIndex
CREATE INDEX "OracleAssertion_status_idx" ON "OracleAssertion"("status");

-- AddForeignKey
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionDispute" ADD CONSTRAINT "ResolutionDispute_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionDispute" ADD CONSTRAINT "ResolutionDispute_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracleAssertion" ADD CONSTRAINT "OracleAssertion_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracleAssertion" ADD CONSTRAINT "OracleAssertion_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: ChainDeployment — add audit columns (updatedAt backfilled to now)
ALTER TABLE "ChainDeployment" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "lastIndexedBlock" BIGINT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Market — LMSR pool state columns
ALTER TABLE "Market" ADD COLUMN "lmsrB" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN "qNo" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "qYes" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalLiquidityUsd" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable: Outcome — fix chance default
ALTER TABLE "Outcome" ALTER COLUMN "chance" SET DEFAULT 50;

-- CreateTable: Quote
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "side" TEXT NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "pricePerShare" DECIMAL(65,30) NOT NULL,
    "sharesOut" DECIMAL(65,30) NOT NULL,
    "totalCostUsd" DECIMAL(65,30) NOT NULL,
    "feesUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "yesProb" INTEGER NOT NULL,
    "noProb" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Trade
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "orderIntentId" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "txHash" TEXT,
    "sharesAmt" DECIMAL(65,30) NOT NULL,
    "avgPrice" DECIMAL(65,30) NOT NULL,
    "feesUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'reconciled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ChainEvent
CREATE TABLE "ChainEvent" (
    "id" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "blockOrCheckpoint" BIGINT NOT NULL,
    "txHash" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "marketId" TEXT,
    "walletAddress" TEXT,
    "raw" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OperatorAction
CREATE TABLE "OperatorAction" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "marketId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ChainEvent
CREATE INDEX "ChainEvent_chain_blockOrCheckpoint_idx" ON "ChainEvent"("chain", "blockOrCheckpoint");
CREATE INDEX "ChainEvent_marketId_idx" ON "ChainEvent"("marketId");
CREATE UNIQUE INDEX "ChainEvent_chain_txHash_eventType_key" ON "ChainEvent"("chain", "txHash", "eventType");

-- CreateIndex: OperatorAction
CREATE INDEX "OperatorAction_operatorId_idx" ON "OperatorAction"("operatorId");
CREATE INDEX "OperatorAction_marketId_idx" ON "OperatorAction"("marketId");

-- CreateIndex: Resolution unique marketId
CREATE UNIQUE INDEX "Resolution_marketId_key" ON "Resolution"("marketId");

-- CreateIndex: UserPosition composite unique
CREATE UNIQUE INDEX "UserPosition_userId_marketId_outcomeSlug_chain_side_key" ON "UserPosition"("userId", "marketId", "outcomeSlug", "chain", "side");

-- AddForeignKey: OrderIntent -> Quote
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Trade -> OrderIntent
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_orderIntentId_fkey" FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

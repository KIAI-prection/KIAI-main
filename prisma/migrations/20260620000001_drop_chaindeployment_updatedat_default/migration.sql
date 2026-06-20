-- AlterTable: remove backfill default, Prisma @updatedAt manages this value
ALTER TABLE "ChainDeployment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Add mainnet collateral enum values before moving deployment records.
ALTER TYPE "CollateralAsset" ADD VALUE IF NOT EXISTS 'USDC_BASE_MAINNET';
ALTER TYPE "CollateralAsset" ADD VALUE IF NOT EXISTS 'USDC_SUI_MAINNET';

UPDATE "ChainDeployment"
SET "collateral" = 'USDC_BASE_MAINNET'
WHERE "collateral" = 'USDC_BASE_SEPOLIA';

UPDATE "ChainDeployment"
SET "collateral" = 'USDC_SUI_MAINNET'
WHERE "collateral" = 'USDC_SUI_TESTNET';

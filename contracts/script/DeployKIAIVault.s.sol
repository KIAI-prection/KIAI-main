// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/KIAIVault.sol";

/**
 * @title DeployKIAIVault
 * @notice Foundry deployment script for KIAIVault on Base Mainnet.
 *
 * Usage (from contracts/ directory):
 *
 *   # Dry run (no broadcast):
 *   forge script script/DeployKIAIVault.s.sol \
 *     --rpc-url base \
 *     --sig "run(address)" \
 *     0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 *
 *   # Deploy (broadcast):
 *   forge script script/DeployKIAIVault.s.sol \
 *     --rpc-url base \
 *     --broadcast \
 *     --verify \
 *     --sig "run(address)" \
 *     0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY   — deployer wallet private key (never commit)
 *   BASE_MAINNET_RPC_URL   — Base Mainnet RPC endpoint
 *   BASESCAN_API_KEY       — for contract verification (optional)
 *
 * After deployment, call POST /api/admin/markets/<marketId>/deploy/result
 * with { chain: "BASE", success: true, contractAddress: "<deployed address>" }
 * to record the deployment in the KIAI backend.
 *
 * Note: USDC address on Base Mainnet (Circle official):
 *   0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 */
contract DeployKIAIVault is Script {
    function run(address usdcAddress) external returns (KIAIVault vault) {
        require(usdcAddress != address(0), "DeployKIAIVault: zero USDC address");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=== KIAIVault Deployment ===");
        console.log("Network: Base Mainnet");
        console.log("Deployer:", deployer);
        console.log("USDC:", usdcAddress);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);
        vault = new KIAIVault(usdcAddress);
        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("KIAIVault deployed at:", address(vault));
        console.log("Owner:", vault.owner());
        console.log("USDC:", address(vault.usdc()));
        console.log("");
        console.log("Next steps:");
        console.log("1. Verify contract on Basescan:");
        console.log("   forge verify-contract <addr> src/KIAIVault.sol:KIAIVault --chain-id 8453");
        console.log("2. Call KIAI admin API to record deployment:");
        console.log("   POST /api/admin/markets/<marketId>/deploy/result");
        console.log("   { chain: BASE, success: true, contractAddress: <addr> }");
    }
}

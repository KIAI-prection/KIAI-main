// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/KIAIVault.sol";

/**
 * @title DeployKIAIVault
 * @notice Foundry deployment script for KIAIVault on Base Sepolia.
 *
 * Usage (from contracts/ directory):
 *
 *   # Dry run (no broadcast):
 *   forge script script/DeployKIAIVault.s.sol \
 *     --rpc-url base_sepolia \
 *     --sig "run(address)" \
 *     0x036CbD53842c5426634e7929541eC2318f3dCF7e
 *
 *   # Deploy (broadcast):
 *   forge script script/DeployKIAIVault.s.sol \
 *     --rpc-url base_sepolia \
 *     --broadcast \
 *     --verify \
 *     --sig "run(address)" \
 *     0x036CbD53842c5426634e7929541eC2318f3dCF7e
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY   — deployer wallet private key (never commit)
 *   BASE_SEPOLIA_RPC_URL   — Base Sepolia RPC endpoint
 *   BASESCAN_API_KEY       — for contract verification (optional)
 *
 * After deployment, call POST /api/admin/markets/<marketId>/deploy/result
 * with { chain: "BASE", success: true, contractAddress: "<deployed address>" }
 * to record the deployment in the KIAI backend.
 *
 * Note: USDC address on Base Sepolia (Circle official, verified 2026-06-02):
 *   0x036CbD53842c5426634e7929541eC2318f3dCF7e
 */
contract DeployKIAIVault is Script {
    function run(address usdcAddress) external returns (KIAIVault vault) {
        require(usdcAddress != address(0), "DeployKIAIVault: zero USDC address");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=== KIAIVault Deployment ===");
        console.log("Network: Base Sepolia");
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
        console.log("   forge verify-contract <addr> src/KIAIVault.sol:KIAIVault --chain-id 84532");
        console.log("2. Call KIAI admin API to record deployment:");
        console.log("   POST /api/admin/markets/<marketId>/deploy/result");
        console.log("   { chain: BASE, success: true, contractAddress: <addr> }");
    }
}

"use client";

import { createDAppKit } from "@mysten/dapp-kit-core";
import { SuiGrpcClient } from "@mysten/sui/grpc";

export const suiDAppKit = createDAppKit({
  networks: ["testnet"],
  defaultNetwork: "testnet",
  autoConnect: false,
  slushWalletConfig: {
    appName: "KIAI",
  },
  createClient: () =>
    new SuiGrpcClient({
      network: "testnet",
      baseUrl: "https://fullnode.testnet.sui.io:443",
    }),
});

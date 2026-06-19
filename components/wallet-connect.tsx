"use client";

import { useDAppKit, useWalletConnection, useWallets } from "@mysten/dapp-kit-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, CheckCircle2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";

function shortAddress(address: string | undefined | null) {
  if (!address) return "Not connected";
  return address.length <= 12
    ? address
    : address.slice(0, 6) + "..." + address.slice(-4);
}

export function WalletConnect() {
  const { address: baseAddress, isConnected: isBaseConnected } = useAccount();
  const { connectors, connectAsync, isPending: baseConnectPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const dAppKit = useDAppKit();
  const suiConnection = useWalletConnection();
  const suiWallets = useWallets();

  const baseConnector =
    connectors.find((connector) => connector.id === "baseAccount") ??
    connectors.find((connector) => connector.id === "injected") ??
    connectors[0];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Base Mainnet</p>
              <p className="text-xs text-foreground-muted">
                {shortAddress(baseAddress)}
              </p>
            </div>
          </div>
          {isBaseConnected && (
            <CheckCircle2 className="h-4 w-4 text-up" />
          )}
        </div>
        {isBaseConnected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => disconnectAsync()}
          >
            <Unplug className="h-4 w-4" />
            Disconnect Base
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!baseConnector || baseConnectPending}
            onClick={() => baseConnector && connectAsync({ connector: baseConnector })}
          >
            {baseConnectPending ? "Connecting..." : "Connect Base Wallet"}
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sui Mainnet</p>
              <p className="text-xs text-foreground-muted">
                {shortAddress(suiConnection.account?.address)}
              </p>
            </div>
          </div>
          {suiConnection.isConnected && (
            <CheckCircle2 className="h-4 w-4 text-up" />
          )}
        </div>
        {suiConnection.isConnected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => dAppKit.disconnectWallet()}
          >
            <Unplug className="h-4 w-4" />
            Disconnect Sui
          </Button>
        ) : suiWallets.length > 0 ? (
          <div className="space-y-2">
            {suiWallets.map((wallet) => (
              <Button
                key={wallet.name}
                type="button"
                size="sm"
                className="w-full"
                disabled={suiConnection.isConnecting}
                onClick={() => dAppKit.connectWallet({ wallet })}
              >
                {suiConnection.isConnecting ? "Connecting..." : "Connect " + wallet.name}
              </Button>
            ))}
          </div>
        ) : (
          <Button type="button" size="sm" className="w-full" disabled>
            No Sui wallet found
          </Button>
        )}
      </div>
    </div>
  );
}

import type { SettlementInstruction } from "@/lib/domain/resolution-policy";

export type SettlementChainAction = "RESOLVE" | "CANCEL" | "UNSUPPORTED";

export type SettlementActionPlan =
  | {
      supported: true;
      action: Exclude<SettlementChainAction, "UNSUPPORTED">;
    }
  | {
      supported: false;
      action: "UNSUPPORTED";
      reason: string;
    };

export function planSettlementAction(
  instruction: Pick<
    SettlementInstruction,
    "payoutMode" | "refundPolicy" | "finalOutcome"
  >
): SettlementActionPlan {
  if (instruction.payoutMode === "winner_take_all") {
    if (!instruction.finalOutcome) {
      return {
        supported: false,
        action: "UNSUPPORTED",
        reason: "Winner-take-all settlement requires a final outcome.",
      };
    }

    return { supported: true, action: "RESOLVE" };
  }

  if (
    instruction.payoutMode === "void_refund" &&
    instruction.refundPolicy === "full_refund"
  ) {
    return { supported: true, action: "CANCEL" };
  }

  return {
    supported: false,
    action: "UNSUPPORTED",
    reason:
      "Current Base and Sui vaults only support winner-take-all resolve or full-refund cancellation.",
  };
}

export function decimalToScaledBigInt(value: { toString(): string }, scale = 18) {
  const raw = value.toString().trim();
  if (!raw || raw.startsWith("-")) {
    throw new Error("Settlement share amount must be a non-negative decimal.");
  }

  const [wholePart, fractionalPart = ""] = raw.split(".");
  if (!/^\d+$/.test(wholePart || "0") || !/^\d*$/.test(fractionalPart)) {
    throw new Error(`Invalid decimal share amount: ${raw}`);
  }

  const whole = BigInt(wholePart || "0");
  const fraction = (fractionalPart + "0".repeat(scale)).slice(0, scale);
  return whole * 10n ** BigInt(scale) + BigInt(fraction || "0");
}

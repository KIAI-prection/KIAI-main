/**
 * GET   /api/admin/markets/[id]   — full market detail for operator
 * PATCH /api/admin/markets/[id]   — update editable fields or trigger lifecycle transition
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MarketLifecycle } from "@prisma/client";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import {
  transitionLifecycle,
  canTransition,
} from "@/lib/domain/operator-service";
import { db } from "@/lib/server/db";

const PatchMarketSchema = z.object({
  lifecycle: z
    .enum([
      "DRAFT",
      "REVIEWED",
      "DEPLOY_PENDING",
      "DEPLOY_FAILED",
      "LIVE",
      "PAUSED",
      "CLOSED",
      "RESOLVING",
      "DISPUTED",
      "RESOLVED",
      "SETTLING",
      "SETTLEMENT_FAILED",
      "SETTLED",
      "ARCHIVED",
    ] as const)
    .optional(),
  titleEn: z.string().min(4).max(300).optional(),
  titleJa: z.string().max(300).optional(),
  subtitleEn: z.string().max(500).optional(),
  subtitleJa: z.string().max(500).optional(),
  openAt: z.string().datetime().optional(),
  closeAt: z.string().datetime().optional(),
  statusInfoEn: z.string().max(500).optional(),
  lmsrB: z.number().positive().max(10_000).optional(),
  reason: z.string().max(500).optional(), // for lifecycle change audit
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id } = await params;

    const market = await db.market.findUnique({
      where: { id },
      include: {
        outcomes: { orderBy: { sortOrder: "asc" } },
        chartPoints: { orderBy: { sortOrder: "asc" } },
        chainDeployments: true,
        compliancePolicy: true,
        resolution: true,
        orderIntents: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            status: true,
            chain: true,
            side: true,
            amountUsd: true,
            walletAddress: true,
            txHash: true,
            createdAt: true,
          },
        },
      },
    });

    if (!market) {
      return NextResponse.json(
        { error: "not_found", message: "Market not found." },
        { status: 404 }
      );
    }

    // Allowed next transitions for the UI to display
    const allowedTransitions = Object.keys(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as Record<MarketLifecycle, any>
    ).filter((lc) =>
      canTransition(market.lifecycle, lc as MarketLifecycle)
    );

    return NextResponse.json({
      market: {
        ...market,
        volumeUsd: Number(market.volumeUsd),
        totalLiquidityUsd: Number(market.totalLiquidityUsd),
        compliancePolicy: market.compliancePolicy
          ? {
              ...market.compliancePolicy,
              maxPositionUsd:
                market.compliancePolicy.maxPositionUsd === null
                  ? null
                  : Number(market.compliancePolicy.maxPositionUsd),
              maxDailyUsd:
                market.compliancePolicy.maxDailyUsd === null
                  ? null
                  : Number(market.compliancePolicy.maxDailyUsd),
            }
          : null,
        chainDeployments: market.chainDeployments.map((deployment) => ({
          ...deployment,
          liquidityUsd: Number(deployment.liquidityUsd),
          lastIndexedBlock:
            deployment.lastIndexedBlock === null
              ? null
              : deployment.lastIndexedBlock.toString(),
        })),
        allowedTransitions,
        orderIntents: market.orderIntents.map((o) => ({
          ...o,
          amountUsd: Number(o.amountUsd),
        })),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/markets/[id]]", err);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch market." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = PatchMarketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation_error",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { lifecycle, reason, ...fields } = parsed.data;
    const opId = operatorId(request);

    // Handle lifecycle transition separately
    if (lifecycle) {
      const updated = await transitionLifecycle(id, lifecycle, opId, reason);
      return NextResponse.json({ market: updated });
    }

    // Handle field updates (only editable on DRAFT/REVIEWED markets)
    const market = await db.market.findUnique({
      where: { id },
      select: { lifecycle: true },
    });

    if (!market) {
      return NextResponse.json(
        { error: "not_found", message: "Market not found." },
        { status: 404 }
      );
    }

    if (!["DRAFT", "REVIEWED"].includes(market.lifecycle)) {
      return NextResponse.json(
        {
          error: "invalid_state",
          message: `Cannot edit fields on a ${market.lifecycle} market. Only DRAFT or REVIEWED markets can be edited.`,
        },
        { status: 422 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (fields.titleEn !== undefined) updateData.titleEn = fields.titleEn;
    if (fields.titleJa !== undefined) updateData.titleJa = fields.titleJa;
    if (fields.subtitleEn !== undefined) updateData.subtitleEn = fields.subtitleEn;
    if (fields.subtitleJa !== undefined) updateData.subtitleJa = fields.subtitleJa;
    if (fields.openAt !== undefined) updateData.openAt = new Date(fields.openAt);
    if (fields.closeAt !== undefined) updateData.closeAt = new Date(fields.closeAt);
    if (fields.statusInfoEn !== undefined) updateData.statusInfoEn = fields.statusInfoEn;
    if (fields.lmsrB !== undefined) updateData.lmsrB = fields.lmsrB;

    const updated = await db.market.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ market: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[PATCH /api/admin/markets/[id]]", err);

    if (message.includes("Cannot transition")) {
      return NextResponse.json(
        { error: "invalid_transition", message },
        { status: 422 }
      );
    }

    if (message.includes("valid resolution policy")) {
      return NextResponse.json(
        { error: "invalid_state", message },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}

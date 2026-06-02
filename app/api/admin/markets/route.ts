/**
 * POST /api/admin/markets   — create a new market (operator only)
 * GET  /api/admin/markets   — list all markets including draft (operator only)
 *
 * This surface is internal operator only and must not disturb the public UI.
 * Public /api/markets only returns LIVE/REVIEWED markets.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOperator, operatorId } from "@/lib/server/operator-auth";
import { createMarket } from "@/lib/domain/operator-service";
import { db } from "@/lib/server/db";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const OutcomeSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  flag: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const CreateMarketSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  titleEn: z.string().min(4).max(300),
  titleJa: z.string().max(300).optional(),
  subtitleEn: z.string().max(500).optional(),
  subtitleJa: z.string().max(500).optional(),
  category: z.enum([
    "sports",
    "politics",
    "culture",
    "esports",
    "specials",
    "finance",
  ]),
  categoryLabelEn: z.string().min(1).max(80),
  categoryLabelJa: z.string().max(80).optional(),
  openAt: z.string().datetime().optional(),
  closeAt: z.string().datetime().optional(),
  outcomes: z
    .array(OutcomeSchema)
    .min(2, "Must have at least 2 outcomes")
    .max(20),
  lmsrB: z.number().positive().max(10_000).optional(),
  blockedRegions: z.array(z.string().length(2)).optional(),
  sourcePolicyEn: z.string().max(1000).optional(),
  createChainDeployments: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// POST — create market
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const parsed = CreateMarketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Invalid market data.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const opId = operatorId(request);
    const market = await createMarket(
      {
        ...parsed.data,
        openAt: parsed.data.openAt ? new Date(parsed.data.openAt) : undefined,
        closeAt: parsed.data.closeAt
          ? new Date(parsed.data.closeAt)
          : undefined,
      },
      opId
    );

    return NextResponse.json({ market }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/admin/markets]", err);

    if (message.includes("already taken")) {
      return NextResponse.json(
        { error: "conflict", message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET — list all markets (operator view includes drafts)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = requireOperator(request);
  if (auth) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const lifecycle = searchParams.get("lifecycle");
    const category = searchParams.get("category");

    const markets = await db.market.findMany({
      where: {
        ...(lifecycle ? { lifecycle: lifecycle as never } : {}),
        ...(category ? { category } : {}),
      },
      include: {
        outcomes: { orderBy: { sortOrder: "asc" } },
        chainDeployments: true,
        compliancePolicy: true,
        resolution: true,
        _count: { select: { orderIntents: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      markets: markets.map((m) => ({
        id: m.id,
        slug: m.slug,
        titleEn: m.titleEn,
        category: m.category,
        lifecycle: m.lifecycle,
        openAt: m.openAt,
        closeAt: m.closeAt,
        volumeUsd: Number(m.volumeUsd),
        lmsrB: m.lmsrB,
        qYes: m.qYes,
        qNo: m.qNo,
        outcomes: m.outcomes,
        chainDeployments: m.chainDeployments.map((d) => ({
          chain: d.chain,
          collateral: d.collateral,
          deployStatus: d.deployStatus,
          contractAddress: d.contractAddress,
        })),
        compliancePolicy: m.compliancePolicy,
        resolution: m.resolution
          ? {
              status: m.resolution.status,
              proposedOutcome: m.resolution.proposedOutcome,
              finalOutcome: m.resolution.finalOutcome,
            }
          : null,
        orderCount: m._count.orderIntents,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      total: markets.length,
    });
  } catch (err) {
    console.error("[GET /api/admin/markets]", err);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to list markets." },
      { status: 500 }
    );
  }
}

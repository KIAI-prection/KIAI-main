/**
 * Prisma client singleton — Neon serverless PostgreSQL, Prisma 7.
 *
 * Prisma 7 requires a driver adapter for database connections.
 * We use @prisma/adapter-neon with @neondatabase/serverless which:
 * - works in serverless/edge environments (Next.js API routes, Vercel)
 * - uses HTTP-over-WebSocket for low-latency connections from Neon
 * - handles connection pooling automatically
 *
 * The globalThis trick prevents creating multiple PrismaClient instances
 * during Next.js hot-reloads in development.
 *
 * Production: each serverless invocation shares the cached client per
 * function instance; Neon handles connection pooling.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Copy .env.example to .env and add your Neon connection string."
    );
  }

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

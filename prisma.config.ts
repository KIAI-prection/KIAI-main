/**
 * Prisma 7 configuration file.
 * The database URL moved here from prisma/schema.prisma (Prisma 7 breaking change).
 * Reference: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
 *
 * Neon serverless PostgreSQL is used as the database host.
 * DATABASE_URL must be set in .env (see .env.example for format).
 */

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

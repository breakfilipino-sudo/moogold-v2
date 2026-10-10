import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },

  // Keep database connections warm instead of allowing the
  // pg driver to close them after its 10-second default idle period.
  idleTimeoutMillis: 300_000,

  // Allow a reasonable number of reused connections for
  // concurrent MooGold requests.
  max: 10,

  // Fail clearly if a brand-new database connection cannot
  // be established within 10 seconds.
  connectionTimeoutMillis: 10_000,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
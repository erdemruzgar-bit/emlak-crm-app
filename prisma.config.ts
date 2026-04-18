import path from "node:path";
import { defineConfig } from "prisma/config";

// Note: `migrate.adapter` is recognized by the Prisma CLI for custom migration adapters,
// but is not part of the typed `PrismaConfig` interface yet. Cast to avoid type error during build.
export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      return new PrismaPg(pool);
    },
  },
} as Parameters<typeof defineConfig>[0]);

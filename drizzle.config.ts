import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_DIRECT_URL ?? 'postgresql://migration:local-only@127.0.0.1:5432/indicate',
  },
  strict: true,
  verbose: true,
});

import { defineConfig } from 'drizzle-kit';

function resolveDirectDatabaseUrl(): string {
  const url = process.env.DATABASE_DIRECT_URL;
  if (url === undefined || url === '') {
    throw new Error(
      'DATABASE_DIRECT_URL is required for drizzle-kit. Copy .env.example to .env.local and set it; refusing local-only fallback credentials.',
    );
  }
  return url;
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/data/schema/index.ts',
  out: './src/data/migrations',
  dbCredentials: {
    url: resolveDirectDatabaseUrl(),
  },
  strict: true,
  verbose: true,
});

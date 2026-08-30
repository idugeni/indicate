import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const approved = new Set([
  '@playwright/test',
  '@aws-sdk/client-s3',
  '@aws-sdk/s3-request-presigner',
  '@upstash/redis',
  '@radix-ui/react-slot',
  '@supabase/ssr',
  '@supabase/supabase-js',
  '@tailwindcss/postcss',
  '@types/node',
  '@types/react',
  '@types/react-dom',
  'class-variance-authority',
  'clsx',
  'drizzle-kit',
  'drizzle-orm',
  'eslint',
  'eslint-config-next',
  'fast-check',
  'next',
  'postcss',
  'postgres',
  'react',
  'react-dom',
  'server-only',
  'tailwind-merge',
  'tailwindcss',
  'tsx',
  'typescript',
  'vitest',
  'zod',
]);

const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
const unapproved = Object.keys(dependencies).filter((name) => !approved.has(name)).sort();
if (unapproved.length > 0) {
  console.error(`Unapproved dependencies: ${unapproved.join(', ')}`);
  process.exit(1);
}

for (const required of ['next', 'zod', 'drizzle-orm', 'postgres', '@supabase/ssr', 'vitest', '@playwright/test', 'tailwindcss']) {
  if (!(required in dependencies)) {
    console.error(`Required approved dependency is missing: ${required}`);
    process.exit(1);
  }
}

console.log(`Dependency policy passed (${Object.keys(dependencies).length} approved packages).`);

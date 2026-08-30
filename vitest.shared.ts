import { fileURLToPath, URL } from 'node:url';

const alias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export const vitestAliases = [
  { find: 'server-only', replacement: alias('./tests/helpers/server-only.ts') },
  { find: '@/domain', replacement: alias('./src/domain') },
  { find: '@/application', replacement: alias('./src/application') },
  { find: '@/ports', replacement: alias('./src/ports') },
  { find: '@/infrastructure', replacement: alias('./src/infrastructure') },
  { find: '@/shared', replacement: alias('./src/shared') },
  { find: '@/config', replacement: alias('./src/config') },
  { find: '@', replacement: alias('.') },
];

export const commonTestConfig = {
  environment: 'node' as const,
  passWithNoTests: false,
  restoreMocks: true,
  clearMocks: true,
  mockReset: true,
};

import { defineConfig } from 'vitest/config';

import { commonTestConfig, vitestAliases } from './vitest.shared.ts';

export default defineConfig({
  resolve: { alias: vitestAliases },
  test: {
    ...commonTestConfig,
    name: 'integration',
    include: ['tests/integration/**/*.integration.test.ts'],
    testTimeout: 15_000,
  },
});

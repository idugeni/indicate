import { defineConfig } from 'vitest/config';

import { commonTestConfig, vitestAliases } from './vitest.shared.ts';

export default defineConfig({
  resolve: { alias: vitestAliases },
  test: {
    ...commonTestConfig,
    name: 'property',
    include: ['tests/property/**/*.property.test.ts'],
    testTimeout: 15_000,
  },
});

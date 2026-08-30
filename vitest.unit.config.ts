import { defineConfig } from 'vitest/config';

import { commonTestConfig, vitestAliases } from './vitest.shared.ts';

export default defineConfig({
  resolve: { alias: vitestAliases },
  test: {
    ...commonTestConfig,
    name: 'unit',
    include: ['tests/unit/**/*.test.ts'],
  },
});

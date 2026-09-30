import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';
import dbAccess from './scripts/eslint/db-access.mjs';
import noNativeTooltip from './scripts/eslint/no-native-tooltip.mjs';

export default defineConfig([
  {
    name: 'indicate/web',
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
      'import-x': importX,
    },
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'import-x/no-anonymous-default-export': 'warn',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '..'],
              message:
                'Gunakan alias `@/` untuk impor lintas direktori (lihat AGENTS.md "Komentar & impor"). `./` hanya untuk sibling sedirektori / barrel index.ts.',
            },
          ],
        },
      ],
    },
  },
  ...tseslint.configs.recommended,
  {
    // Runtime boundary: wrangler membundel worker tanpa resolve alias `@/`,
    // sehingga impor relatif ke kontrak kanonis src adalah satu-satunya jalan
    // tanpa menduplikasi skema. Cakupan override sesempit direktori worker.
    name: 'indicate/workers',
    files: ['workers/**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Build and QA tooling runs from Node with no bundler alias resolution, so
    // `scripts/perf` importing `scripts/eslint` is relative by necessity. Scoped
    // to tooling only; `src/**` keeps the alias rule.
    name: 'indicate/scripts',
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Runtime database boundary: a read of every matching row spends the
    // shared Supabase egress quota, so an unbounded select is an error, not a
    // warning. Canonical rules: AGENTS.md §"Database access & egress".
    // The rule is deliberately independent from `@typescript-eslint` so a
    // type-checker upgrade cannot silently drop it.
    name: 'indicate/db-access',
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'db-access': dbAccess },
    rules: dbAccess.configs.recommended.rules,
  },
  {
    // Hover hints belong to the shadcn Tooltip, not the browser's `title`:
    // native titles are unreachable by keyboard and become the accessible
    // name of any control missing an `aria-label`. Kept independent from
    // `@typescript-eslint` for the same reason as `indicate/db-access`.
    name: 'indicate/tooltip',
    files: ['src/**/*.{ts,tsx}'],
    plugins: { tooltip: noNativeTooltip },
    rules: noNativeTooltip.configs.recommended.rules,
  },
  {
    name: 'indicate/typescript',
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'coverage/**',
    'next-env.d.ts',
    '.agents/**',
    '.claude/**',
    '.kiro/**',
    'tmp/**',
  ]),
]);
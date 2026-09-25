import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

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
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // eslint-plugin-react@7 memakai context.getFilename() yang dihapus di
    // ESLint 10 saat version: 'detect'. Versi eksplisit melewati deteksi itu.
    settings: {
      react: { version: '19.2.8' },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  globalIgnores([
    '.next/**',
    // Bundel skill agen pihak ketiga (vendor JS, bukan kode aplikasi).
    '.agents/**',
    '.claude/**',
    '.kiro/**',
  ]),
]);

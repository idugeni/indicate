import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // ESLint di-pin di major 9: plugin bawaan eslint-config-next
    // (react@7, import@2, jsx-a11y@6) peer-nya mentok di ESLint 9, dan
    // major 10 hanya menambah warning ERESOLVE di tiap install.
    // Versi React eksplisit agar melewati auto-deteksi yang rapuh.
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

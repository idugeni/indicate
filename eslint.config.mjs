import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import { importX } from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

// Config ESLint flat hand-rolled (tanpa eslint-config-next): preset Next
// menarik eslint-plugin-react/import/jsx-a11y yang peer-nya mentok di
// ESLint 9, sehingga tiap install memuntahkan warning ERESOLVE, sementara
// ESLint 9 sendiri sudah EOL/deprecated. Rangkaian di bawah setara dengan
// `core-web-vitals` + `typescript` minus dua plugin mati itu:
// - @next/next core-web-vitals: utuh, dipakai langsung dari plugin Next.
// - react-hooks recommended: utuh (versi yang sama persis).
// - import-x/no-anonymous-default-export: pengganti drop-in rule import
//   satu-satunya yang dipakai (nama rule jadi prefix `import-x/`).
// - typescript-eslint recommended + 2 warn bawaan preset + 2 error repo.
// Coverage yang hilang: rules `react/*` recommended dan `jsx-a11y/*`.
// Kode saat ini nol pelanggaran di kedua area itu, jadi gate tetap hijau;
// perlindungan ke depan untuk keduanya berkurang sampai upstream merilis
// versi yang mendukung ESLint 10.
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
      ...nextPlugin.configs['core-web-vitals'].rules,
      'import-x/no-anonymous-default-export': 'warn',
    },
  },
  ...tseslint.configs.recommended,
  {
    name: 'indicate/typescript',
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
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

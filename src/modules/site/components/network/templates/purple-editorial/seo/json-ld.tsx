function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

/**
 * Render JSON-LD mandiri template tanpa dependensi modul luar.
 *
 * @param schemas - Daftar skema SEO siap serialisasi.
 * @returns Elemen script JSON-LD atau null bila kosong.
 */
export function PurpleEditorialJsonLd({ schemas }: { readonly schemas: readonly Readonly<Record<string, unknown>>[] }) {
  if (schemas.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: escapeJsonLd(schemas.length === 1 ? schemas[0] : [...schemas]),
      }}
    />
  );
}

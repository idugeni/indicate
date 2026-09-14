function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

/** JSON-LD mandiri template (paritas struktur SEO bersama, tanpa dependensi modul luar). */
export function CleanBlueJsonLd({ schemas }: { readonly schemas: readonly Readonly<Record<string, unknown>>[] }) {
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

import { serializeJsonLd, type JsonLdSchema } from '@/modules/site/seo';

/**
 * Render JSON-LD untuk seluruh template tenant.
 *
 * @param schemas - Daftar skema SEO siap serialisasi.
 * @returns Elemen script JSON-LD atau null bila kosong.
 */
export function JsonLd({ schemas }: { readonly schemas: readonly JsonLdSchema[] }) {
  if (schemas.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(schemas as readonly Readonly<Record<string, unknown>>[]),
      }}
    />
  );
}

import { serializeJsonLd, type JsonLdSchema } from '@/modules/site/seo';

/** Server-rendered JSON-LD; escaping keeps article copy inside the script element. */
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

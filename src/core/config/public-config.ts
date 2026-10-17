import { z } from 'zod';

const publicConfigSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default('https://indicate.website'),
});

export interface PublicConfig {
  readonly siteUrl: string;
}

export function getPublicConfig(environment: Record<string, string | undefined>): PublicConfig {
  const parsed = publicConfigSchema.parse({
    NEXT_PUBLIC_SITE_URL: environment.NEXT_PUBLIC_SITE_URL,
  });
  return Object.freeze({ siteUrl: parsed.NEXT_PUBLIC_SITE_URL });
}

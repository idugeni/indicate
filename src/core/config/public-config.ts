import { z } from 'zod';

const publicConfigSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default('https://indicate.web.id'),
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine((value) => value.startsWith('https://'), 'https_required'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(8),
});

export interface PublicConfig {
  readonly siteUrl: string;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
}

export function getPublicConfig(environment: Record<string, string | undefined>): PublicConfig {
  const parsed = publicConfigSchema.parse({
    NEXT_PUBLIC_SITE_URL: environment.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: environment.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return Object.freeze({
    siteUrl: parsed.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

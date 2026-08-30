import { z } from 'zod';

const publicConfigSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine((value) => value.startsWith('https://'), 'https_required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(8),
});

export interface PublicConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

export function getPublicConfig(environment: Record<string, string | undefined>): PublicConfig {
  const parsed = publicConfigSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: environment.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return Object.freeze({
    supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

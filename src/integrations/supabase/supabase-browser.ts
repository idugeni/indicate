import 'client-only';

import { createBrowserClient } from '@supabase/ssr';

/** Shares session with SSR adapter; read each NEXT_PUBLIC_* individually (whole process.env is undefined client-side). */
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

export type BrowserSupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;
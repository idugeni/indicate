'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

export function GoogleButton() {
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    const supabase = createBrowserSupabaseClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=%2Fdashboard`,
      },
    });
    if (error) setBusy(false);
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" size="lg" onClick={() => void handleGoogle()} disabled={busy} className="w-full justify-center border-[#1a2430]/15 bg-white text-[#1a2430] hover:bg-[#1a2430]/5 hover:text-[#1a2430] dark:border-[#1a2430]/15 dark:bg-white dark:text-[#1a2430] dark:hover:bg-[#1a2430]/5">
        <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center font-sans text-sm font-bold">
          G
        </span>
        {busy ? 'Membuka Google...' : 'Lanjutkan dengan Google'}
      </Button>
    </div>
  );
}

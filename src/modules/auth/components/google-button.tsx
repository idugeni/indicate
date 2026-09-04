'use client';

import { useState } from 'react';
import { FaGoogle } from 'react-icons/fa6';

import { Button } from '@/components/ui/button';
import { createBrowserSupabaseClient } from '@/integrations/supabase/supabase-browser';

export function GoogleButton() {
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    const supabase = createBrowserSupabaseClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=%2Fdashboard`,
      },
    });
    if (error) setBusy(false);
  };

  return (
    <Button type="button" variant="outline" size="lg" onClick={() => void handleGoogle()} disabled={busy} className="w-full justify-center">
      <FaGoogle className="h-4 w-4" aria-hidden="true" />
      {busy ? 'Membuka Google...' : 'Lanjutkan dengan Google'}
    </Button>
  );
}
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { AuthPage } from '@/modules/auth/components/auth-ui';
import { UpdatePasswordForm } from '@/modules/auth/components/update-password-form';
import { getPublicConfig } from '@/core/config/public-config';
import { createHardenedSupabaseCookieStore, createSupabaseSsrAuthAdapter } from '@/integrations/supabase/supabase-ssr';

export default async function UpdatePasswordPage() {
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl,
    publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({
      getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      set: (name, value, options) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          /* Cookie write can fail during RSC render; the proxy refreshes them. */
        }
      },
    }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) redirect('/sign-in?auth=unavailable');

  return (
    <AuthPage
      title="Perbarui kata sandi"
      lede="Tentukan kata sandi baru untuk akun Anda."
      footer={
        <p className="m-0 text-center">
          <Link href="/sign-in" className="text-[#8a5f1c] hover:underline">
            Kembali ke Masuk
          </Link>
        </p>
      }
    >
      <UpdatePasswordForm />
    </AuthPage>
  );
}

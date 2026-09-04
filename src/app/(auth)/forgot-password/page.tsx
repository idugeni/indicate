import Link from 'next/link';

import { AuthPage } from '@/modules/auth/components/auth-ui';
import { ForgotPasswordForm } from '@/modules/auth/components/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Lupa kata sandi"
      lede="Kami akan mengirim tautan pemulihan ke email Anda."
      footer={
        <p className="m-0 text-center">
          <Link href="/sign-in" className="text-brass hover:underline">
            ← Kembali ke Masuk
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}

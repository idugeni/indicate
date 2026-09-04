import Link from 'next/link';

import { AuthPage } from '@/modules/auth/components/auth-ui';
import { UpdatePasswordForm } from '@/modules/auth/components/update-password-form';

export default function UpdatePasswordPage() {
  return (
    <AuthPage
      title="Perbarui kata sandi"
      lede="Tentukan kata sandi baru untuk akun Anda."
      footer={
        <p className="m-0 text-center">
          <Link href="/sign-in" className="text-brass hover:underline">
            Kembali ke Masuk
          </Link>
        </p>
      }
    >
      <UpdatePasswordForm />
    </AuthPage>
  );
}

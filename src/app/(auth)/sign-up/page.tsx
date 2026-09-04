import Link from 'next/link';

import { AuthPage } from '@/modules/auth/components/auth-ui';
import { SignUpForm } from '@/modules/auth/components/sign-up-form';

export default function SignUpPage() {
  return (
    <AuthPage
      title="Daftar akun organisasi"
      lede="Buat akun redaksi Anda. Verifikasi email diperlukan sebelum mengakses workspace."
      footer={
        <p className="m-0 text-center">
          Sudah punya akun?{' '}
          <Link href="/sign-in" className="text-brass hover:underline">
            Masuk di sini
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthPage>
  );
}

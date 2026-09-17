'use client';

import { useState } from 'react';

import { GoogleButton } from '@/modules/auth/components/google-button';
import { OtpSignInForm } from '@/modules/auth/components/otp-sign-in-form';
import { SignInForm } from '@/modules/auth/components/sign-in-form';

/** Sign-in method switcher: passwordless code first, password as fallback. */
export function SignInMethods() {
  const [method, setMethod] = useState<'otp' | 'password'>('otp');

  if (method === 'password') {
    return (
      <div className="space-y-6">
        <SignInForm />
        <p className="m-0 text-center">
          <button
            type="button"
            onClick={() => setMethod('otp')}
            className="font-sans text-sm font-medium text-[#8a5f1c] hover:underline"
          >
            Masuk dengan kode email
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OtpSignInForm />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e2ded2]" aria-hidden="true" />
        <span className="font-mono text-[11px] text-[#5f6b7a]">ATAU</span>
        <div className="h-px flex-1 bg-[#e2ded2]" aria-hidden="true" />
      </div>

      <GoogleButton />

      <p className="m-0 text-center">
        <button
          type="button"
          onClick={() => setMethod('password')}
          className="font-sans text-sm font-medium text-[#8a5f1c] hover:underline"
        >
          Masuk dengan kata sandi
        </button>
      </p>
    </div>
  );
}

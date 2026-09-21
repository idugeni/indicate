'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
          <Button
            type="button"
            variant="link"
            onClick={() => setMethod('otp')}
            className="h-auto px-0 font-sans text-[#8a5f1c]"
          >
            Masuk dengan kode email
          </Button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OtpSignInForm />

      <div className="relative">
        <Separator className="bg-[#e2ded2]" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 font-mono text-[11px] text-[#5f6b7a]">
          ATAU
        </span>
      </div>

      <GoogleButton />

      <p className="m-0 text-center">
        <Button
          type="button"
          variant="link"
          onClick={() => setMethod('password')}
          className="h-auto px-0 font-sans text-[#8a5f1c]"
        >
          Masuk dengan kata sandi
        </Button>
      </p>
    </div>
  );
}

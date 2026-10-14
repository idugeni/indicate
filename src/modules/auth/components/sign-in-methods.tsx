'use client';

import { Separator } from '@/components/ui/separator';
import { GoogleButton } from '@/modules/auth/components/google-button';
import { SignInForm } from '@/modules/auth/components/sign-in-form';

/** Supported sign-in methods: email/password and Google OAuth only. */
export function SignInMethods() {
  return (
    <div className="space-y-6">
      <SignInForm />

      <div className="relative">
        <Separator className="bg-[#e2ded2]" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 font-mono text-[11px] text-[#5f6b7a]">
          ATAU
        </span>
      </div>

      <GoogleButton />
    </div>
  );
}

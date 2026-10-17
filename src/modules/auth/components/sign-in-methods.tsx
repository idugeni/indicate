'use client';

import { SignInForm } from '@/modules/auth/components/sign-in-form';

/** Email/password is the only supported interactive login method. */
export function SignInMethods() {
  return <div className="space-y-6"><SignInForm /></div>;
}

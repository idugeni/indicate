import { safeRedirectPath } from '@/core/security/safe-redirect-path';

export function resolveTokenKind(tokenType: string | null): 'email' | 'signup' | 'magiclink' | 'recovery' {
  return tokenType === 'signup' || tokenType === 'magiclink' || tokenType === 'recovery' ? tokenType : 'email';
}

export function resolveCallbackDestination(authType: string | null, next: string | null): string {
  const fallback = authType === 'recovery' ? '/update-password' : '/dashboard';
  return next === null ? fallback : safeRedirectPath(next);
}

export function resolveCallbackFailureAlert(providerError: string | null): 'provider' | 'unavailable' {
  return providerError === null ? 'unavailable' : 'provider';
}


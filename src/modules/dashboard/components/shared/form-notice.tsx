import type { ReactNode } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';

export function FormNotice({
  tone,
  children,
}: {
  readonly tone: 'error' | 'success' | 'muted';
  readonly children: ReactNode;
}) {
  if (tone === 'error') {
    return (
      <Alert variant="destructive" className="border-error/60 bg-error/[0.06]">
        <AlertDescription className="font-sans text-xs text-error">{children}</AlertDescription>
      </Alert>
    );
  }
  if (tone === 'success') {
    return (
      <Alert role="status" className="border-signal/50 bg-signal/[0.06]">
        <AlertDescription className="font-sans text-xs text-signal">{children}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert role="status" className="border-hairline bg-bg">
      <AlertDescription className="font-sans text-xs text-paper-dim">{children}</AlertDescription>
    </Alert>
  );
}

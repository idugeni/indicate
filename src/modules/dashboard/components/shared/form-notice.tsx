import type { ReactNode } from 'react';

export function FormNotice({
  tone,
  children,
}: {
  readonly tone: 'error' | 'success' | 'muted';
  readonly children: ReactNode;
}) {
  if (tone === 'error') {
    return (
      <p role="alert" className="font-sans text-xs text-error">
        {children}
      </p>
    );
  }
  if (tone === 'success') {
    return (
      <p role="status" className="font-sans text-xs text-signal">
        {children}
      </p>
    );
  }
  return (
    <p role="status" className="m-0 font-sans text-xs text-paper-dim">
      {children}
    </p>
  );
}

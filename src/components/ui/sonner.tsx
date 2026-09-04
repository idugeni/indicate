'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

/** Single dark-only toast root mounted once in the root layout for all surfaces. */
export function Toaster(props: Readonly<ToasterProps>) {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      gap={8}
      closeButton
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'rounded border border-hairline-strong bg-bg-raised-2 px-4 py-2.5 font-mono text-xs text-paper shadow-none',
          title: 'font-mono text-xs text-paper',
          description: 'font-mono text-[11px] text-paper-dim',
          actionButton:
            'rounded border border-brass/50 bg-bg px-2 py-1 font-mono text-[11px] text-brass-soft',
          cancelButton:
            'rounded border border-hairline bg-bg px-2 py-1 font-mono text-[11px] text-paper-dim',
          closeButton:
            'border border-hairline bg-bg-raised text-paper-faint hover:text-paper',
          success: 'border-l-2 border-l-signal',
          error: 'border-l-2 border-l-error',
          warning: 'border-l-2 border-l-warning',
          info: 'border-l-2 border-l-brass',
        },
      }}
      {...props}
    />
  );
}

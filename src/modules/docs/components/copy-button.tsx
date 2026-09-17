'use client';

import { useState } from 'react';

export function CopyButton({ text, label }: { readonly text: string; readonly label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label ?? 'Salin'}
      onClick={() => {
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => setCopied(false));
      }}
      className="flex-none rounded-md bg-white/10 px-2 py-1 font-mono text-[11px] text-slate-200 transition-colors hover:bg-white/20"
    >
      {copied ? 'Disalin' : 'Salin'}
    </button>
  );
}

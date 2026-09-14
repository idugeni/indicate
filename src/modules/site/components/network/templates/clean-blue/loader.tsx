import { Newspaper } from 'lucide-react';

import { Spinner } from '@/components/ui/spinner';

/**
 * Loader global template Clean Blue: layar viewport penuh, brand di tengah,
 * tanpa skeleton. Menggabungkan Tailwind (layout, animasi) + shadcn Spinner.
 */
export function CleanBlueLoader({ label = 'Memuat berita' }: { readonly label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f5f8fd] px-6"
    >
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-2xl bg-[#1f6feb]/15" />
        <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1f6feb] text-white shadow-lg shadow-[#1f6feb]/30">
          <Newspaper className="h-7 w-7" />
        </span>
      </span>
      <span className="flex items-center gap-2.5 font-sans text-sm font-semibold text-slate-600">
        <Spinner className="h-4 w-4 text-[#1f6feb]" />
        {label}…
      </span>
      <span aria-hidden="true" className="h-1 w-44 overflow-hidden rounded-full bg-slate-200">
        <span className="block h-full w-1/2 animate-[cleanblue-loading_1.1s_ease-in-out_infinite] rounded-full bg-[#1f6feb]" />
      </span>
      <style>{`@keyframes cleanblue-loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
}

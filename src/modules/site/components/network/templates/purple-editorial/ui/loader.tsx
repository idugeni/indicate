import { Newspaper } from 'lucide-react';

/**
 * Loader global tenant Clean Blue: dua cincin contra-rotasi di tengah
 * viewport (luar berputar kiri, dalam berputar kanan), tanpa teks.
 */
export function PurpleEditorialLoader() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat"
      className="flex min-h-screen items-center justify-center bg-[#f8f7ff]"
    >
      <div aria-hidden="true" className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-[cleanblue-spin-rev_1.6s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,transparent_15%,#7c3aed_50%,transparent_85%)]" />
        <span className="absolute inset-2 rounded-full bg-[#f8f7ff]" />
        <span className="absolute inset-2 animate-[cleanblue-spin_1.1s_linear_infinite] rounded-full bg-[conic-gradient(from_180deg,transparent_20%,#9fc0ff_55%,transparent_80%)]" />
        <span className="absolute inset-4 rounded-full bg-[#f8f7ff]" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/30">
          <Newspaper className="h-5 w-5" />
        </span>
      </div>
      <style>{`@keyframes cleanblue-spin { to { transform: rotate(360deg); } } @keyframes cleanblue-spin-rev { to { transform: rotate(-360deg); } }`}</style>
    </div>
  );
}

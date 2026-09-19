import { Newspaper } from 'lucide-react';

/**
 * Loader global tenant Green Minimal: dua cincin contra-rotasi di tengah
 * viewport (luar berputar kiri, dalam berputar kanan), tanpa teks.
 */
export function GreenMinimalLoader() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat"
      className="flex min-h-screen items-center justify-center bg-[#f7faf7]"
    >
      <div aria-hidden="true" className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-[greenminimal-spin-rev_1.6s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,transparent_15%,#1d7a38_50%,transparent_85%)]" />
        <span className="absolute inset-2 rounded-full bg-[#f7faf7]" />
        <span className="absolute inset-2 animate-[greenminimal-spin_1.1s_linear_infinite] rounded-full bg-[conic-gradient(from_180deg,transparent_20%,#86c79a_55%,transparent_80%)]" />
        <span className="absolute inset-4 rounded-full bg-[#f7faf7]" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1d7a38] text-white shadow-lg shadow-[#1d7a38]/30">
          <Newspaper className="h-5 w-5" />
        </span>
      </div>
      <style>{`@keyframes greenminimal-spin { to { transform: rotate(360deg); } } @keyframes greenminimal-spin-rev { to { transform: rotate(-360deg); } }`}</style>
    </div>
  );
}

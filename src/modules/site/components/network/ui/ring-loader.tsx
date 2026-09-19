import { Newspaper } from 'lucide-react';

/**
 * Render dual contra-rotating ring loader centered on the viewport.
 *
 * @param background - Page background; 6-digit hex.
 * @param accent - Outer ring and badge fill; 6-digit hex.
 * @param halo - Inner ring highlight; 6-digit hex.
 * @param foreground - Badge icon color; any CSS color.
 * @returns Viewport-fixed loading overlay without visible text.
 */
export function TemplateRingLoader({
  background,
  accent,
  halo,
  foreground,
}: {
  readonly background: string;
  readonly accent: string;
  readonly halo: string;
  readonly foreground: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat"
      style={{ background }}
      className="fixed inset-0 z-[100] grid place-items-center [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]"
    >
      <div aria-hidden="true" className="relative flex h-28 w-28 items-center justify-center">
        <span
          className="absolute inset-0 animate-[template-ring-spin-rev_1.6s_linear_infinite] rounded-full"
          style={{ background: `conic-gradient(from 0deg, transparent 15%, ${accent} 50%, transparent 85%)` }}
        />
        <span className="absolute inset-2 rounded-full" style={{ background }} />
        <span
          className="absolute inset-2 animate-[template-ring-spin_1.1s_linear_infinite] rounded-full"
          style={{ background: `conic-gradient(from 180deg, transparent 20%, ${halo} 55%, transparent 80%)` }}
        />
        <span className="absolute inset-4 rounded-full" style={{ background }} />
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: accent,
            color: foreground,
            boxShadow: `0 10px 15px -3px ${accent}4d, 0 4px 6px -4px ${accent}4d`,
          }}
        >
          <Newspaper className="h-5 w-5" />
        </span>
      </div>
      <style>{`@keyframes template-ring-spin { to { transform: rotate(360deg); } } @keyframes template-ring-spin-rev { to { transform: rotate(-360deg); } }`}</style>
    </div>
  );
}

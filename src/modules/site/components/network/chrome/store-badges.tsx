import Image from 'next/image';

import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';

type StoreBadgeProps = {
  /** Store artwork under `/public/brand`. */
  readonly src: string;
  /** Doubles as image alt and tooltip copy; these badges have no destination yet. */
  readonly label: string;
};

function StoreBadge({ src, label }: StoreBadgeProps) {
  return (
    <TemplateTooltip label={label}>
      <span className="group relative block min-w-0 flex-1 basis-0 cursor-pointer overflow-hidden transition-all duration-300 ease-out hover:brightness-110 hover:shadow-md motion-reduce:transition-none">
        <Image
          unoptimized
          src={src}
          alt={label}
          width={120}
          height={40}
          className="h-10 w-full object-contain object-left"
        />
        {/* Diagonal glass sheen. The overlay is oversized (140% wide, 200% tall)
            so the skewed band is fully off-canvas at rest and travels the whole
            badge on hover instead of clipping into a corner wedge. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-50%_-20%] -translate-x-[130%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/45 to-transparent transition-[translate] duration-[var(--motion-slow)] ease-out group-hover:translate-x-[130%]"
        />
      </span>
    </TemplateTooltip>
  );
}

/** Linkless app store badges: visuals respond to hover, clicks are no-ops. */
export function StoreBadges() {
  return (
    <p className="m-0 mt-4 flex max-w-64 flex-wrap items-center gap-2">
      <StoreBadge src="/brand/app-store.svg" label="Segera hadir di App Store" />
      <StoreBadge src="/brand/google-play.svg" label="Segera hadir di Google Play" />
    </p>
  );
}
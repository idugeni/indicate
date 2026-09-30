import Image from 'next/image';

import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';

/** Linkless app store badges: visuals respond to hover, clicks are no-ops. */
export function StoreBadges() {
  return (
    <p className="m-0 mt-4 flex max-w-64 flex-wrap items-center gap-2">
      <TemplateTooltip label="Segera hadir di App Store">
        <span className="block min-w-0 flex-1 basis-0 cursor-pointer transition duration-180 hover:scale-[1.03] hover:brightness-110">
          <Image
            unoptimized
            src="/brand/app-store.svg"
            alt="Segera hadir di App Store"
            width={120}
            height={40}
            className="h-10 w-full object-contain object-left"
          />
        </span>
      </TemplateTooltip>
      <TemplateTooltip label="Segera hadir di Google Play">
        <span className="block min-w-0 flex-1 basis-0 cursor-pointer transition duration-180 hover:scale-[1.03] hover:brightness-110">
          <Image
            unoptimized
            src="/brand/google-play.svg"
            alt="Segera hadir di Google Play"
            width={120}
            height={40}
            className="h-10 w-full object-contain object-left"
          />
        </span>
      </TemplateTooltip>
    </p>
  );
}

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { TEMPLATE_IDS } from '@/modules/site/components/network/templates/listing-shared';
import { AD_SLOT_IDS } from '@/modules/ads/slots';
import { isSlotMapped } from '@/modules/ads/config';
import { makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { AdSlot } from '@/modules/ads/ad-slot';

function allSlotsOn(): Record<string, unknown> {
  return Object.fromEntries(
    AD_SLOT_IDS.map((slot) => [slot, { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/x.png' } }]),
  );
}

describe('matriks template × slot', () => {
  for (const templateId of TEMPLATE_IDS) {
    it(`mematuhi peta ${templateId}: slot terpetakan tampil, sisanya nol`, () => {
      for (const slot of AD_SLOT_IDS) {
        const site = makeNetworkSite();
        const html = renderToStaticMarkup(
          <AdSlot
            site={{ ...site, settings: { ...site.settings, colors: { templateId }, ads: allSlotsOn() } }}
            slot={slot}
          />,
        );
        if (isSlotMapped(templateId, slot)) {
          expect(html).toContain(`data-ad-slot="${slot}"`);
        } else {
          expect(html).toBe('');
        }
      }
    });
  }

  it('membedakan tenant pada slot yang sama', () => {
    const renders = (ads?: Record<string, unknown>) => {
      const site = makeNetworkSite();
      return renderToStaticMarkup(
        <AdSlot
          site={{ ...site, settings: { ...site.settings, colors: { templateId: 'clean-blue' }, ...(ads === undefined ? {} : { ads }) } }}
          slot="leaderboard"
        />,
      );
    };
    expect(
      renders({ leaderboard: { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/x.png' } } }),
    ).toContain('data-ad-slot="leaderboard"');
    expect(renders({ leaderboard: { enabled: false } })).toBe('');
    expect(renders({ leaderboard: { enabled: true } })).toBe('');
  });
});

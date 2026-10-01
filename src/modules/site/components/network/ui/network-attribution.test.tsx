import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { NetworkAttribution } from '@/modules/site/components/network/ui/network-attribution';

describe('NetworkAttribution', () => {
  it('merender dua tautan dofollow kontekstual', () => {
    const html = renderToStaticMarkup(
      <NetworkAttribution
        attribution={{
          networkHref: 'https://indicate.website/network',
          networkAnchor: 'jaringan Indicate',
          corporateHref: 'https://safenca.id',
          corporateName: 'PT Sanca Phena Cakra',
        }}
      />,
    );
    expect(html).toContain('href="https://indicate.website/network"');
    expect(html).toContain('href="https://safenca.id"');
    expect(html).toContain('jaringan Indicate');
    expect(html).not.toContain('rel=');
  });

  it('tidak merender apa pun untuk portal yang tidak lolos', () => {
    expect(renderToStaticMarkup(<NetworkAttribution attribution={null} />)).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { NetworkAttribution } from '@/modules/site/components/network/ui/network-attribution';

describe('NetworkAttribution', () => {
  it('merender satu tautan dofollow kontekstual', () => {
    const html = renderToStaticMarkup(
      <NetworkAttribution attribution={{ href: 'https://indicate.website/network', anchor: 'jaringan Indicate' }} />,
    );
    expect(html).toContain('href="https://indicate.website/network"');
    expect(html).toContain('jaringan Indicate');
    expect(html).not.toContain('rel=');
  });

  it('tidak merender apa pun untuk portal yang tidak lolos', () => {
    expect(renderToStaticMarkup(<NetworkAttribution attribution={null} />)).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import { DARK_NAVY_TEMPLATE_ID } from '@/modules/site/components/network/templates/dark-navy/template';

describe('DARK_NAVY_TEMPLATE_ID', () => {
  it('mengunci identitas template ke dark-navy', () => {
    expect(DARK_NAVY_TEMPLATE_ID).toBe('dark-navy');
  });
});

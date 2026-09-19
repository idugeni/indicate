import { describe, expect, it } from 'vitest';

import { ORANGE_MODERN_TEMPLATE_ID } from '@/modules/site/components/network/templates/orange-modern/template';

describe('ORANGE_MODERN_TEMPLATE_ID', () => {
  it('mengunci identitas template ke orange-modern', () => {
    expect(ORANGE_MODERN_TEMPLATE_ID).toBe('orange-modern');
  });
});

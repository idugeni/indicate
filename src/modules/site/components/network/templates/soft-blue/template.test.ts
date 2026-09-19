import { describe, expect, it } from 'vitest';

import { SOFT_BLUE_TEMPLATE_ID } from '@/modules/site/components/network/templates/soft-blue/template';

describe('SOFT_BLUE_TEMPLATE_ID', () => {
  it('mengunci identitas template ke soft-blue', () => {
    expect(SOFT_BLUE_TEMPLATE_ID).toBe('soft-blue');
  });
});

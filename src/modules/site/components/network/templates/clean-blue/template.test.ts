import { describe, expect, it } from 'vitest';

import { CLEAN_BLUE_TEMPLATE_ID } from '@/modules/site/components/network/templates/clean-blue/template';

describe('CLEAN_BLUE_TEMPLATE_ID', () => {
  it('mengunci identitas template ke clean-blue', () => {
    expect(CLEAN_BLUE_TEMPLATE_ID).toBe('clean-blue');
  });
});

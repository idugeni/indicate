import { describe, expect, it } from 'vitest';

import { WARM_EDITORIAL_TEMPLATE_ID } from '@/modules/site/components/network/templates/warm-editorial/template';

describe('WARM_EDITORIAL_TEMPLATE_ID', () => {
  it('mengunci identitas template ke warm-editorial', () => {
    expect(WARM_EDITORIAL_TEMPLATE_ID).toBe('warm-editorial');
  });
});

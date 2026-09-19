import { describe, expect, it } from 'vitest';

import { PURPLE_EDITORIAL_TEMPLATE_ID } from '@/modules/site/components/network/templates/purple-editorial/template';

describe('PURPLE_EDITORIAL_TEMPLATE_ID', () => {
  it('mengunci identitas template ke purple-editorial', () => {
    expect(PURPLE_EDITORIAL_TEMPLATE_ID).toBe('purple-editorial');
  });
});

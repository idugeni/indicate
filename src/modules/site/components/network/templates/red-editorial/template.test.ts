import { describe, expect, it } from 'vitest';

import { RED_EDITORIAL_TEMPLATE_ID } from '@/modules/site/components/network/templates/red-editorial/template';

describe('RED_EDITORIAL_TEMPLATE_ID', () => {
  it('mengunci identitas template ke red-editorial', () => {
    expect(RED_EDITORIAL_TEMPLATE_ID).toBe('red-editorial');
  });
});

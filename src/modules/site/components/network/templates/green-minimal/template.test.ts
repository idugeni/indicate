import { describe, expect, it } from 'vitest';

import { GREEN_MINIMAL_TEMPLATE_ID } from '@/modules/site/components/network/templates/green-minimal/template';

describe('GREEN_MINIMAL_TEMPLATE_ID', () => {
  it('mengunci identitas template ke green-minimal', () => {
    expect(GREEN_MINIMAL_TEMPLATE_ID).toBe('green-minimal');
  });
});

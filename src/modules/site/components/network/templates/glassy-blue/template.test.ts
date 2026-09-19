import { describe, expect, it } from 'vitest';

import { GLASSY_BLUE_TEMPLATE_ID } from '@/modules/site/components/network/templates/glassy-blue/template';

describe('GLASSY_BLUE_TEMPLATE_ID', () => {
  it('mengunci identitas template ke glassy-blue', () => {
    expect(GLASSY_BLUE_TEMPLATE_ID).toBe('glassy-blue');
  });
});

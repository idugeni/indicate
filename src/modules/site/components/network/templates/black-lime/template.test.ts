import { describe, expect, it } from 'vitest';

import { BLACK_LIME_TEMPLATE_ID } from '@/modules/site/components/network/templates/black-lime/template';

describe('BLACK_LIME_TEMPLATE_ID', () => {
  it('mengunci identitas template ke black-lime', () => {
    expect(BLACK_LIME_TEMPLATE_ID).toBe('black-lime');
  });
});

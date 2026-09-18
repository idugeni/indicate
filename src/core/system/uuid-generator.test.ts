import { describe, expect, it } from 'vitest';

import { UuidGenerator } from '@/core/system/uuid-generator';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('UuidGenerator', () => {
  it('menghasilkan UUID v4 unik', () => {
    const generator = new UuidGenerator();
    const first = generator.create();
    const second = generator.create();
    expect(first).toMatch(UUID_PATTERN);
    expect(second).toMatch(UUID_PATTERN);
    expect(first).not.toBe(second);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import PublicLoading from '@/app/(network)/loading';

afterEach(() => {
  cleanup();
});

describe('Fallback pemuatan jaringan', () => {
  it('mengembalikan null: tanpa overlay, spinner, maupun kerangka', () => {
    expect(PublicLoading()).toBeNull();
    const { container } = render(<PublicLoading />);
    expect(container.innerHTML).toBe('');
  });
});

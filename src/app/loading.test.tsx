// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import RootLoading from '@/app/loading';

afterEach(() => {
  cleanup();
});

describe('Fallback pemuatan tanpa brand', () => {
  it('mengembalikan null: tanpa cincin, titik, maupun overlay', () => {
    expect(RootLoading()).toBeNull();
    const { container } = render(<RootLoading />);
    expect(container.innerHTML).toBe('');
  });
});

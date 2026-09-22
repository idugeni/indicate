// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

import { useDebouncedValue } from '@/modules/dashboard/components/shared/use-debounced-value';

afterEach(() => cleanup());

describe('useDebouncedValue', () => {
  it('menerbitkan nilai setelah tenang', async () => {
    let current = '';
    function Probe({ value }: { readonly value: string }) {
      current = useDebouncedValue(value, 30);
      return null;
    }
    const { rerender } = render(<Probe value="a" />);
    expect(current).toBe('a');
    rerender(<Probe value="ab" />);
    expect(current).toBe('a');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    expect(current).toBe('ab');
  });
});

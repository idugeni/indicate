// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

afterEach(() => {
  cleanup();
});

describe('Kelompok masukan', () => {
  it('merender masukan dan tambahan', () => {
    render(
      <InputGroup>
        <InputGroupAddon>Rp</InputGroupAddon>
        <InputGroupInput placeholder="Nominal" />
      </InputGroup>,
    );
    expect(screen.getByPlaceholderText('Nominal')).toBeDefined();
    expect(screen.getByText('Rp')).toBeDefined();
  });

  it('merender peran grup', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput placeholder="Nominal" />
      </InputGroup>,
    );
    expect(container.querySelector('[data-slot="input-group"]')).not.toBe(null);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from '@/components/ui/button';
import { AppTooltip } from '@/ui/app-tooltip';
import { APP_TOOLTIP_CONTENT } from '@/ui/tooltip';

afterEach(() => {
  cleanup();
});

describe('AppTooltip', () => {
  it('merender elemen anak sebagai pemicu tanpa mengubah atributnya', () => {
    render(
      <AppTooltip label="Regenerasi kunci pengiriman">
        <Button type="button" aria-label="Regenerasi kunci pengiriman">x</Button>
      </AppTooltip>,
    );
    expect(screen.getByRole('button', { name: 'Regenerasi kunci pengiriman' })).toBeDefined();
  });

  it('tidak menulis atribut title native', () => {
    render(
      <AppTooltip label="Kurangi 100">
        <span>1.000</span>
      </AppTooltip>,
    );
    expect(document.querySelector('[title]')).toBe(null);
  });

  it('memakai chip app saat terbuka', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AppTooltip label="Kurangi 100">
        <Button type="button" aria-label="Kurangi tayangan awal">−</Button>
      </AppTooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Kurangi tayangan awal' }));
    await waitFor(() => expect(screen.getByText('Kurangi 100')).toBeDefined(), { timeout: 2000 });
    const chip = container.ownerDocument.querySelector('[data-slot="tooltip-content"]');
    expect(chip?.className).toContain(APP_TOOLTIP_CONTENT.split(' ')[0]);
  });
});

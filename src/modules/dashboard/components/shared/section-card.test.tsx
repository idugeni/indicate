// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SectionCard } from '@/modules/dashboard/components/shared/section-card';

afterEach(() => {
  cleanup();
});

function StubIcon(props: { readonly className?: string; readonly 'aria-hidden'?: boolean | 'true' | 'false' }) {
  return <svg data-testid="stub-icon" className={props.className} aria-hidden={props['aria-hidden']} />;
}

describe('SectionCard', () => {
  it('merender judul, eyebrow, dan children dengan label aksesibel', () => {
    render(
      <SectionCard icon={StubIcon} title="Akses" eyebrow="Keamanan">
        <p>Isi panel</p>
      </SectionCard>,
    );
    expect(screen.getByRole('region', { name: 'Akses' })).toBeDefined();
    expect(screen.getByText('Keamanan')).toBeDefined();
    expect(screen.getByText('Isi panel')).toBeDefined();
    expect(screen.getByTestId('stub-icon')).toBeDefined();
  });
});

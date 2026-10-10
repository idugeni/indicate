// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DashboardFooter } from '@/modules/dashboard/components/dashboard-footer';

describe('Footer dashboard', () => {
  it('menampilkan hak cipta dan tech stack dalam footer normal-flow', () => {
    render(<DashboardFooter />);
    const footer = screen.getByText(/PT Sanca Phena Cakra/).closest('footer');
    expect(footer).not.toBeNull();
    expect(footer?.className).toContain('mt-auto');
    expect(footer?.className).not.toContain('sticky');
    expect(
      screen.getByText('Next.js 16 · Supabase · Drizzle · Cloudflare · Upstash'),
    ).toBeDefined();
  });
});

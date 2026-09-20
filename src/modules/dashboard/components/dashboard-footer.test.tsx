// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DashboardFooter } from '@/modules/dashboard/components/dashboard-footer';

describe('Footer dashboard', () => {
  it('menampilkan hak cipta dan tech stack dalam bilah sticky bawah', () => {
    render(<DashboardFooter />);
    const footer = screen.getByText(/PT Sanca Phena Cakra/).closest('footer');
    expect(footer).not.toBeNull();
    expect(footer?.className).toContain('sticky');
    expect(footer?.className).toContain('bottom-0');
    expect(
      screen.getByText('Next.js 16 · Supabase · Drizzle · Cloudflare · Upstash'),
    ).toBeDefined();
  });
});

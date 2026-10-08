// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TrustModerationV2 } from './trust-moderation-v2';

vi.mock('@/modules/ai/components/ai-moderation-assist', () => ({
  AiModerationAssist: () => <div data-testid="ai-assist">AI assist</div>,
}));

afterEach(cleanup);

const reports = [
  {
    id: 'report-1',
    orgId: 'org-1',
    siteId: 'site-1',
    articleId: 'article-1',
    reporterContact: 'redacted',
    reasonCategory: 'privacy',
    details: 'Ada data pribadi pada artikel.',
    articleUrl: null,
    status: 'received',
    createdAt: '2026-10-08T18:00:00.000Z',
  },
];

const privacy = [
  {
    id: 'privacy-1',
    ticketNumber: 'PRV-001',
    orgId: 'org-1',
    requestType: 'access',
    details: 'Mohon salinan data saya.',
    status: 'open',
    createdAt: '2026-10-08T18:00:00.000Z',
  },
];

const holds = [
  {
    id: 'hold-1',
    orgId: 'org-1',
    reason: 'Legal review',
    heldBy: 'user-1',
    createdAt: '2026-10-08T18:00:00.000Z',
    releasedAt: null,
    releasedBy: null,
  },
];

const erasures = [
  {
    id: 'erase-1',
    orgId: 'org-1',
    requestedBy: 'user-1',
    reason: 'Retention request',
    status: 'pending',
    scheduledFor: '2026-10-09T18:00:00.000Z',
    attempts: 0,
    completedAt: null,
    createdAt: '2026-10-08T18:00:00.000Z',
  },
];

describe('TrustModerationV2', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const payload = url.includes('reports')
          ? reports
          : url.includes('privacy-requests')
            ? privacy
            : url.includes('holds')
              ? holds
              : erasures;
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
  });

  it('renders a case queue instead of the legacy moderation tabs', async () => {
    render(<TrustModerationV2 organizationId="org-1" />);
    expect(
      await screen.findByRole('heading', { name: 'Trust & Moderation', level: 1 }),
    ).toBeDefined();
    expect(await screen.findByText('Moderation Queue')).toBeDefined();
    expect(screen.queryByText('Laporan')).toBeNull();
    expect(screen.queryByText('Bagian moderasi')).toBeNull();
  });

  it('opens a report review surface with AI assist', async () => {
    render(<TrustModerationV2 organizationId="org-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /privacy/ }));
    expect(screen.getByText('Case Review')).toBeDefined();
    expect(screen.getByTestId('ai-assist')).toBeDefined();
    expect(screen.getByRole('button', { name: /Tindak/ })).toBeDefined();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });

  it('separates privacy and retention operations into distinct jobs', async () => {
    render(<TrustModerationV2 organizationId="org-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Privacy Operations/ }));
    expect(await screen.findByText('Privacy Request Queue')).toBeDefined();
    expect(screen.getByText('PRV-001')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Retention Controls/ }));
    expect(await screen.findByText('Litigation Holds')).toBeDefined();
    expect(screen.getByText('Erasure Queue')).toBeDefined();
  });
});

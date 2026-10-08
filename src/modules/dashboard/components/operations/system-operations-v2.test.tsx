// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SystemOperationsV2 } from './system-operations-v2';

afterEach(cleanup);

const data = {
  invalidationTasks: [
    {
      id: 'inv-1',
      organizationId: 'org-1',
      name: 'site.settings purge',
      status: 'pending',
      siteId: 'site-1',
      reason: 'settings',
      attempts: 1,
      nextAttemptAt: '2026-10-08T19:00:00.000Z',
      updatedAt: '2026-10-08T18:00:00.000Z',
    },
  ],
  objectCleanupTasks: [
    {
      id: 'clean-1',
      organizationId: 'org-1',
      name: 'media cleanup',
      status: 'completed',
      reason: 'archive',
      attempts: 1,
      nextAttemptAt: '2026-10-08T18:00:00.000Z',
      updatedAt: '2026-10-08T18:01:00.000Z',
    },
  ],
  mediaKeyReservations: [],
  cacheBypasses: [],
  transitionReceipts: [],
  webhookReplayClaims: [
    {
      id: 'hook-1',
      organizationId: 'org-1',
      name: 'publish webhook',
      status: 'retrying',
      attemptCount: 3,
      receivedAt: '2026-10-08T18:00:00.000Z',
      expiresAt: '2026-10-08T19:00:00.000Z',
    },
  ],
};

describe('SystemOperationsV2', () => {
  it('renders a control tower instead of generic operational tables', () => {
    render(<SystemOperationsV2 data={data} />);
    expect(screen.getByRole('heading', { name: 'System Operations', level: 1 })).toBeDefined();
    expect(screen.getByText('Runtime Posture')).toBeDefined();
    expect(screen.getByText('Incident Queue')).toBeDefined();
    expect(screen.queryByText('Antrean Invalidasi Cache')).toBeNull();
  });

  it('drills into queue health and exposes state, not mutation controls', () => {
    render(<SystemOperationsV2 data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /Queue Health/ }));
    expect(screen.getByText('Cache invalidation')).toBeDefined();
    expect(screen.getByText('site.settings purge')).toBeDefined();
    expect(screen.getByText('pending')).toBeDefined();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });

  it('shows webhook replay pressure separately', () => {
    render(<SystemOperationsV2 data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /Webhook & Delivery/ }));
    expect(screen.getByText('Webhook Replay')).toBeDefined();
    expect(screen.getByText(/3 attempts/)).toBeDefined();
    expect(screen.getByText('retrying')).toBeDefined();
  });
});

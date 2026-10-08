// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AuditSecurityV2 } from './audit-security-v2';

afterEach(cleanup);

const data = {
  auditLogs: [
    {
      id: 'log-1',
      organizationId: 'org-1',
      actorType: 'user',
      actorId: 'user-1',
      entryPoint: 'dashboard',
      action: 'membership.update',
      targetType: 'membership',
      targetId: 'member-1',
      outcome: 'succeeded',
      changedFields: ['roleId'],
      before: { roleId: 'viewer' },
      after: { roleId: 'editor' },
      requestId: 'req-1',
      occurredAt: '2026-10-08T18:00:00.000Z',
    },
    {
      id: 'log-2',
      organizationId: 'org-1',
      actorType: 'api_key',
      actorId: 'key-1',
      entryPoint: 'api',
      action: 'api-key.issue',
      targetType: 'api_key',
      targetId: 'key-2',
      outcome: 'denied',
      changedFields: [],
      before: null,
      after: null,
      requestId: 'req-2',
      occurredAt: '2026-10-08T18:01:00.000Z',
    },
  ],
  retentionRuns: [
    {
      id: 'ret-1',
      organizationId: 'org-1',
      name: 'Daily audit retention',
      status: 'success',
      category: 'audit',
      purgedCount: 4,
      startedAt: '2026-10-08T17:00:00.000Z',
      finishedAt: '2026-10-08T17:02:00.000Z',
    },
  ],
};

describe('AuditSecurityV2', () => {
  it('renders a security investigation workspace instead of a generic audit table', () => {
    render(<AuditSecurityV2 data={data} />);
    expect(screen.getByRole('heading', { name: 'Audit & Security', level: 1 })).toBeDefined();
    expect(screen.getByText('Risk Signals')).toBeDefined();
    expect(screen.getByRole('region', { name: 'Investigation Timeline' })).toBeDefined();
    expect(screen.getByText('Events')).toBeDefined();
    expect(screen.queryByText('Catatan Audit')).toBeNull();
  });

  it('opens metadata evidence without exposing before/after payload values', () => {
    render(<AuditSecurityV2 data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /membership.update/ }));
    expect(screen.getByText('Evidence Inspector')).toBeDefined();
    expect(screen.getByText('roleId')).toBeDefined();
    expect(screen.queryByText('viewer')).toBeNull();
    expect(screen.queryByText('editor')).toBeNull();
    expect(screen.getByText('req-1')).toBeDefined();
  });

  it('moves risk signals back into the investigation timeline', () => {
    render(<AuditSecurityV2 data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /Risk Signals/ }));
    expect(screen.getByText('Failure Clusters')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /api-key.issue/ }));
    expect(screen.getByText('Evidence Inspector')).toBeDefined();
    expect(screen.getByText('req-2')).toBeDefined();
  });
});

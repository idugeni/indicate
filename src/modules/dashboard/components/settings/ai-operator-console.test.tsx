// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiOperatorConsole } from '@/modules/dashboard/components/settings/ai-operator-console';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('AiOperatorConsole', () => {
  it('plans then runs a read-only check', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [], canReview: false }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, executed: false, plan: { steps: [{ id: 'step_1', capabilityId: 'command-center.overview.read', arguments: {} }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, results: [{ id: 'step_1', ok: true, result: { status: 'ok' } }] }) });
    vi.stubGlobal('fetch', mockFetch);
    render(<AiOperatorConsole organizationId="11111111-1111-4111-8111-111111111111" />);
    expect(await screen.findByText('Belum ada permintaan persetujuan yang dapat ditampilkan.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Apa yang ingin diperiksa?'), { target: { value: 'Ringkas kondisi dashboard' } });
    fireEvent.click(screen.getByRole('button', { name: /Susun rencana/i }));
    expect(await screen.findByText('Rencana tervalidasi (1 langkah)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Jalankan pemeriksaan/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(await screen.findByText(/\"status\": \"ok\"/)).toBeTruthy();
  });

  it('submits a publication approval request using the entered article and site IDs', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [], canReview: false, canRequest: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approval: { id: '33333333-3333-4333-8333-333333333333', state: 'pending' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [{ id: '33333333-3333-4333-8333-333333333333', toolId: 'publishing.delivery.request', input: { articleId: '11111111-1111-4111-8111-111111111111', siteIds: ['22222222-2222-4222-8222-222222222222'], idempotencyKey: 'key', options: {}, overrides: {} }, state: 'pending', expiresAt: '2026-10-10T00:00:00.000Z', isRequester: true }], canReview: false, canRequest: true }) });
    vi.stubGlobal('fetch', mockFetch);
    render(<AiOperatorConsole organizationId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" />);
    fireEvent.change(await screen.findByPlaceholderText('UUID artikel'), { target: { value: '11111111-1111-4111-8111-111111111111' } });
    fireEvent.change(screen.getByPlaceholderText('UUID situs tujuan'), { target: { value: '22222222-2222-4222-8222-222222222222' } });
    fireEvent.click(screen.getByRole('button', { name: /Ajukan persetujuan/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('Permintaan publikasi dikirim untuk persetujuan.')).toBeTruthy();
    const submitted = JSON.parse(String(mockFetch.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(submitted).toMatchObject({ organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', action: 'request', toolId: 'publishing.delivery.request' });
    expect(submitted.input).toMatchObject({ articleId: '11111111-1111-4111-8111-111111111111', siteIds: ['22222222-2222-4222-8222-222222222222'], options: {}, overrides: {} });
    expect((submitted.input as Record<string, unknown>).idempotencyKey).toEqual(submitted.idempotencyKey);
  });

  it('does not offer self-approval controls to the requester', async () => {
    const ownApproval = { id: '55555555-5555-4555-8555-555555555555', toolId: 'publishing.delivery.request', input: { articleId: '11111111-1111-4111-8111-111111111111' }, state: 'pending', expiresAt: '2026-10-10T00:00:00.000Z', isRequester: true };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [ownApproval], canReview: true, canRequest: true }) }));
    render(<AiOperatorConsole organizationId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" />);
    expect(await screen.findByText(/Status: pending/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Setujui/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Tolak/i })).toBeNull();
  });

  it('executes an approved publication only as its requester and refreshes the approval state', async () => {
    const approval = { id: '44444444-4444-4444-8444-444444444444', toolId: 'publishing.delivery.request', input: { articleId: '11111111-1111-4111-8111-111111111111', siteIds: ['22222222-2222-4222-8222-222222222222'], idempotencyKey: 'same-key', options: {}, overrides: {} }, state: 'approved', expiresAt: '2026-10-10T00:00:00.000Z', isRequester: true };
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [approval], canReview: false, canRequest: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ toolId: approval.toolId, result: { jobId: 'job-1' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [{ ...approval, state: 'consumed' }], canReview: false, canRequest: true }) });
    vi.stubGlobal('fetch', mockFetch);
    render(<AiOperatorConsole organizationId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" />);
    fireEvent.click(await screen.findByRole('button', { name: /Jalankan yang disetujui/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('Permintaan publikasi diterima oleh executor.')).toBeTruthy();
    expect(mockFetch.mock.calls[1]?.[0]).toBe('/api/dashboard/operator');
    expect(JSON.parse(String(mockFetch.mock.calls[1]?.[1]?.body))).toMatchObject({ approvalId: approval.id, toolId: approval.toolId, input: approval.input });
    expect(screen.getByText(/Status: consumed/)).toBeTruthy();
  });

  it('submits a version-bound article update for separate approval', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [], canReview: false, canRequest: false, canRequestArticleUpdate: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approval: { id: '66666666-6666-4666-8666-666666666666', state: 'pending' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [{ id: '66666666-6666-4666-8666-666666666666', toolId: 'content.articles.update', input: { articleId: '11111111-1111-4111-8111-111111111111', expectedVersion: 3, title: 'Judul baru' }, state: 'pending', expiresAt: '2026-10-10T00:00:00.000Z', isRequester: true }], canReview: false, canRequest: false, canRequestArticleUpdate: true }) });
    vi.stubGlobal('fetch', mockFetch);
    render(<AiOperatorConsole organizationId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" />);
    fireEvent.change(await screen.findByPlaceholderText('UUID artikel'), { target: { value: '11111111-1111-4111-8111-111111111111' } });
    fireEvent.change(screen.getByPlaceholderText('Contoh: 3'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Judul baru (opsional)'), { target: { value: 'Judul baru' } });
    fireEvent.click(screen.getByRole('button', { name: /Ajukan perubahan untuk disetujui/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('Permintaan perubahan artikel dikirim untuk persetujuan.')).toBeTruthy();
    const submitted = JSON.parse(String(mockFetch.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(submitted).toMatchObject({ organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', action: 'request', toolId: 'content.articles.update', input: { articleId: '11111111-1111-4111-8111-111111111111', expectedVersion: 3, title: 'Judul baru' } });
    expect(typeof submitted.idempotencyKey).toBe('string');
  });

  it('shows review controls only when the server grants review permission and refreshes after a decision', async () => {
    const approval = { id: '22222222-2222-4222-8222-222222222222', toolId: 'publishing.delivery.request', input: { articleId: 'article-1' }, state: 'pending', expiresAt: '2026-10-10T00:00:00.000Z' };
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [approval], canReview: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approval: { state: 'approved' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [{ ...approval, state: 'approved' }], canReview: true }) });
    vi.stubGlobal('fetch', mockFetch);
    render(<AiOperatorConsole organizationId="11111111-1111-4111-8111-111111111111" />);
    expect(await screen.findByText(/Status: pending/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Setujui/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('Permintaan disetujui. Perintah tidak dijalankan otomatis.')).toBeTruthy();
    expect(screen.getByText(/Status: approved/)).toBeTruthy();
    expect(mockFetch.mock.calls[1]?.[0]).toBe('/api/dashboard/operator/approvals');
  });
});

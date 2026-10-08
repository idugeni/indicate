// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DistributionControlV2 } from './distribution-control-v2';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

afterEach(() => cleanup());

const DATA = {
  articles: [{ id: 'a1', title: 'Berita Utama', slug: 'berita-utama' }],
  sites: [
    { id: 's1', normalizedHostname: 'portal-a.id' },
    { id: 's2', normalizedHostname: 'portal-b.id' },
  ],
};

describe('DistributionControlV2', () => {
  it('uses the V2 workspace and sends the production publication contract', async () => {
    const command = vi.fn(async (action: string) => action === 'publication.request' ? {
      job: { id: 'job-v2', state: 'queued' }, targets: [],
    } : null);
    const user = userEvent.setup();
    render(<DistributionControlV2 data={DATA} command={command} />);
    expect(screen.getByRole('heading', { name: 'Distribution Control' })).toBeDefined();
    const articleInput = screen.getByRole('combobox', { name: 'Artikel' });
    await user.click(articleInput);
    await user.click(await screen.findByRole('option', { name: /Berita Utama/ }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByRole('button', { name: /kirim distribusi/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publication.request',
      expect.objectContaining({ articleId: 'a1', siteIds: ['s1'], options: { mode: 'immediate' }, publishAt: null, overrides: {} }),
      { refresh: true },
    ));
    expect(screen.getByText('job-v2')).toBeDefined();
  });

  it('supports scheduling and preserves UTC conversion', async () => {
    const command = vi.fn(async (action: string) => action === 'publication.request' ? {
      job: { id: 'job-scheduled', state: 'queued' }, targets: [],
    } : null);
    const user = userEvent.setup();
    render(<DistributionControlV2 data={DATA} command={command} />);
    const articleInput = screen.getByRole('combobox', { name: 'Artikel' });
    await user.click(articleInput);
    await user.click(await screen.findByRole('option', { name: /Berita Utama/ }));
    fireEvent.click(screen.getByRole('button', { name: /jadwalkan/i }));
    fireEvent.change(screen.getByLabelText('Waktu publish'), { target: { value: '2099-01-02T10:00' } });
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    fireEvent.click(screen.getByRole('button', { name: /jadwalkan distribusi/i }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'publication.request',
      expect.objectContaining({ options: { mode: 'scheduled' }, publishAt: new Date('2099-01-02T10:00').toISOString() }),
      { refresh: true },
    ));
  });

  it('searches and selects only matching production portals', () => {
    render(<DistributionControlV2 data={DATA} command={vi.fn(async () => null)} />);
    fireEvent.change(screen.getByLabelText('Cari portal target'), { target: { value: 'portal-b' } });
    expect(screen.getByText('portal-b.id')).toBeDefined();
    expect(screen.queryByText('portal-a.id')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /pilih hasil/i }));
    expect(screen.getByText('1 / 2 portal')).toBeDefined();
  });

  it('loads live status and exposes retry/unpublish controls', async () => {
    const status = {
      job: { id: 'job-live', state: 'queued' },
      targets: [
        { id: 't1', siteId: 's1', articleSiteId: 'as1', state: 'published', attempt: 1, publishedUrl: 'https://portal-a.id/x', sanitizedError: null },
        { id: 't2', siteId: 's2', articleSiteId: 'as2', state: 'failed', attempt: 2, publishedUrl: null, sanitizedError: { code: 'failed' } },
      ],
    };
    const command = vi.fn(async () => status);
    const user = userEvent.setup();
    render(<DistributionControlV2 data={DATA} command={command} />);
    fireEvent.change(screen.getByLabelText('ID job distribusi'), { target: { value: 'job-live' } });
    fireEvent.click(screen.getByRole('button', { name: /^muat$/i }));
    expect(await screen.findByText('job-live')).toBeDefined();
    expect(screen.getAllByText('portal-a.id').length).toBeGreaterThan(0);
    await waitFor(() => expect((screen.getByRole('button', { name: /ulangi gagal/i }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByRole('button', { name: /tarik tayang/i })).toBeDefined();
    await act(async () => { await user.click(screen.getByRole('button', { name: /ulangi gagal/i })); });
    await waitFor(() => {
      const calls = command.mock.calls as unknown as readonly [string, Record<string, unknown>][];
      expect(calls.some(([action, payload]) => action === 'publication.retry' && payload.jobId === 'job-live')).toBe(true);
    });
    vi.stubGlobal('confirm', vi.fn(() => true));
    await act(async () => { await user.click(screen.getByRole('button', { name: /^Noindex$/i })); });
    await waitFor(() => {
      const calls = command.mock.calls as unknown as readonly [string, Record<string, unknown>][];
      expect(calls.some(([action, payload]) => action === 'publication.setSiteRobots' && payload.articleSiteId === 'as1' && payload.directive === 'noindex')).toBe(true);
    });
    await waitFor(() => expect((screen.getByRole('button', { name: /tarik tayang/i }) as HTMLButtonElement).disabled).toBe(false));
    await act(async () => { await user.click(screen.getByRole('button', { name: /tarik tayang/i })); });
    await waitFor(() => {
      const calls = command.mock.calls as unknown as readonly [string, Record<string, unknown>][];
      expect(calls.some(([action, payload]) => action === 'publication.unpublish' && payload.jobId === 'job-live')).toBe(true);
    });
  });
});

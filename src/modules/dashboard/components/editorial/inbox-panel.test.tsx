// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ForOrgInbox } from '@/modules/dashboard/components/editorial/inbox-panel';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ROW = {
  organizationId: 'org-upt',
  orgSlug: 'rutan-kelas-ii-b-wonosobo',
  orgName: 'RUTAN KELAS II B WONOSOBO',
  articleId: 'art-1',
  slug: 'berita-upt',
  title: 'Berita UPT',
  status: 'draft',
  publisherLabel: 'RUTAN KELAS II B WONOSOBO',
  regionSlug: 'wonosobo',
  updatedAt: new Date().toISOString(),
};

describe('ForOrgInbox', () => {
  it('tampil hanya bila ada draf dan menerbitkan per baris', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async (action: string) => {
      if (action === 'article.inbox.list') return [ROW];
      if (action === 'article.bridge.requestAuto') return { bridgeIds: ['b-1'], slug: 'berita-upt', siteCount: 3 };
      throw new Error(`unexpected ${action}`);
    });
    render(<ForOrgInbox command={command} />);
    expect(await screen.findByText('Berita UPT')).toBeDefined();
    await user.click(screen.getByRole('button', { name: /Tayangkan/ }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('article.bridge.requestAuto', {
      ownerOrganizationId: 'org-upt',
      articleId: 'art-1',
    }));
    await waitFor(() => expect(screen.queryByText('Berita UPT')).toBeNull());
    expect(command).toHaveBeenCalledWith('article.inbox.list', {});
  });

  it('tersembunyi saat perintah ditolak', async () => {
    const command = vi.fn(async () => {
      throw new Error('denied');
    });
    const { container } = render(<ForOrgInbox command={command} />);
    await act(async () => undefined);
    expect(container.textContent ?? '').not.toContain('Kotak masuk UPT');
  });

  it('tidak merender apa pun tanpa command', () => {
    const { container } = render(<ForOrgInbox command={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LiveblogUpdates } from '@/modules/dashboard/components/editorial/liveblog-updates';

const ENTRY = {
  id: 'u-1', organizationId: 'org-1', articleId: 'a-1', body: 'Gol pembuka.',
  sortOrder: 2, publishedAt: '2026-09-14T11:00:00.000Z', createdBy: 'user-1',
  version: 1, createdAt: '2026-09-14T11:00:00.000Z', updatedAt: '2026-09-14T11:00:00.000Z',
};

function stubCommand(entries: readonly unknown[] = [ENTRY]) {
  return vi.fn(async (action: string) => {
    if (action === 'article.updates.list') return [...entries];
    if (action === 'article.updates.create') return { ...ENTRY, id: 'u-2', body: 'Gol kedua.' };
    if (action === 'article.updates.update') return { ...ENTRY, version: 2 };
    if (action === 'article.updates.delete') return { id: 'u-1' };
    throw new Error(`unexpected action ${action}`);
  });
}

afterEach(() => {
  cleanup();
});

describe('LiveblogUpdates', () => {
  it('memuat dan menampilkan entri terbaru', async () => {
    const command = stubCommand();
    render(<LiveblogUpdates articleId="a-1" articleTitle="Live Skor" command={command} />);
    expect(await screen.findByText('Gol pembuka.')).toBeDefined();
    expect(command).toHaveBeenCalledWith('article.updates.list', { articleId: 'a-1' });
  });

  it('menambah pembaruan dan mengosongkan draf', async () => {
    const user = userEvent.setup();
    const command = stubCommand([]);
    render(<LiveblogUpdates articleId="a-1" articleTitle="Live Skor" command={command} />);
    await screen.findByText('Belum ada pembaruan. Tambahkan yang pertama di atas.');
    await user.type(screen.getByLabelText('Pembaruan baru (baris pertama jadi judul)'), 'Gol kedua.');
    await user.click(screen.getByRole('button', { name: 'Tambah pembaruan' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'article.updates.create', { articleId: 'a-1', body: 'Gol kedua.' }, { refresh: true },
    ));
  });

  it('menghapus dengan konfirmasi dua langkah', async () => {
    const user = userEvent.setup();
    const command = stubCommand();
    render(<LiveblogUpdates articleId="a-1" articleTitle="Live Skor" command={command} />);
    await screen.findByText('Gol pembuka.');
    await user.click(screen.getByRole('button', { name: 'Hapus pembaruan u-1' }));
    await user.click(screen.getByRole('button', { name: 'Ya, hapus' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith(
      'article.updates.delete', { id: 'u-1', expectedVersion: 1 }, { refresh: true },
    ));
  });
});

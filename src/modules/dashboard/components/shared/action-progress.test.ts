// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import { beginActionProgress } from '@/modules/dashboard/components/shared/action-progress';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

afterEach(() => {
  for (const spy of Object.values(toast)) vi.mocked(spy).mockClear();
});

describe('beginActionProgress', () => {
  it('menahan satu toast: setiap pembaruan memakai id yang sama', () => {
    const progress = beginActionProgress('Mengirim…');
    progress.step('Terkirim ke 100 dari 134 portal…');
    progress.step('Terkirim ke 134 dari 134 portal…');

    const ids = vi.mocked(toast.loading).mock.calls.map(([, options]) => options?.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(1);
  });

  it('menutup progres dengan hasil pada toast yang sama, bukan menambah yang baru', () => {
    const progress = beginActionProgress('Mengirim…');
    progress.step('Separuh selesai…');
    progress.succeed('Dikirim ke 134 portal.');

    const opened = vi.mocked(toast.loading).mock.calls[0]?.[1]?.id;
    expect(opened).toBeDefined();
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Dikirim ke 134 portal.', { id: opened });
  });

  it('melaporkan kegagalan lewat toast yang sama', () => {
    const progress = beginActionProgress('Mengirim…');
    progress.fail('Gagal ditayangkan.');

    const opened = vi.mocked(toast.loading).mock.calls[0]?.[1]?.id;
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Gagal ditayangkan.', { id: opened });
  });

  it('memberi id berbeda untuk dua tindakan yang berjalan bersamaan', () => {
    const first = beginActionProgress('Unggah A…');
    const second = beginActionProgress('Unggah B…');
    first.succeed('A selesai.');
    second.fail('B gagal.');

    const ids = vi.mocked(toast.loading).mock.calls.map(([, options]) => options?.id);
    expect(new Set(ids).size).toBe(2);
  });
});

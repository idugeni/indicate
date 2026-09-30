// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useAiSlot } from '@/modules/dashboard/components/editorial/use-ai-slot';

describe('useAiSlot', () => {
  it('melaporkan idle sebelum ada aksi', () => {
    const { result } = renderHook(() => useAiSlot());
    expect(result.current.action).toBe('idle');
  });

  it('menerima satu aksi lalu menahannya sampai release', () => {
    const { result } = renderHook(() => useAiSlot());
    act(() => {
      expect(result.current.claim('description')).toBe(true);
    });
    expect(result.current.action).toBe('description');
    act(() => result.current.release());
    expect(result.current.action).toBe('idle');
  });

  it('menolak aksi lain selama slot masih dipegang', () => {
    const { result } = renderHook(() => useAiSlot());
    act(() => {
      result.current.claim('polish');
    });
    act(() => {
      expect(result.current.claim('classify')).toBe(false);
    });
    expect(result.current.action).toBe('polish');
  });

  it('menolak aksi kedua dalam satu tick, bukan hanya setelah render ulang', () => {
    // Kegagalan yang dilaporkan: dua klik berdekatan menembak dua permintaan
    // karena guard membaca state yang belum diperbarui.
    const { result } = renderHook(() => useAiSlot());
    let second = true;
    act(() => {
      result.current.claim('title');
      second = result.current.claim('title-variants');
    });
    expect(second).toBe(false);
    expect(result.current.action).toBe('title');
  });

  it('menerima aksi baru setelah slot dilepas', () => {
    const { result } = renderHook(() => useAiSlot());
    act(() => {
      result.current.claim('title');
    });
    act(() => result.current.release());
    act(() => {
      expect(result.current.claim('title-variants')).toBe(true);
    });
    expect(result.current.action).toBe('title-variants');
  });

  it('memisahkan identitas title dan title-variants', () => {
    // Keduanya menjalankan pekerjaan yang sama lewat refineTitles, tapi punya
    // tombol sendiri; bila satu nilai dipakai keduanya, dua tombol akan
    // menampilkan keadaan sibuk bersamaan.
    const { result } = renderHook(() => useAiSlot());
    act(() => {
      result.current.claim('title');
    });
    expect(result.current.action === 'title-variants').toBe(false);
  });
});

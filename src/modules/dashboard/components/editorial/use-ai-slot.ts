'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Identitas aksi AI yang sedang berjalan.
 *
 * Satu nilai untuk seluruh tombol AI, jadi `busy` hanya benar pada satu tombol
 * dan dua tombol tidak dapat menampilkan keadaan sibuk bersamaan. Nilai
 * `title` dan `title-variants` sengaja terpisah meski pekerjaannya sama,
 * karena keduanya punya tombol sendiri yang harus hidup independen.
 */
export type AiAction = 'idle' | 'title' | 'title-variants' | 'description' | 'polish' | 'transcribe' | 'classify' | 'caption';

export interface AiSlot {
  /** Aksi yang sedang berjalan; `'idle'` bila tidak ada. */
  readonly action: AiAction;
  /**
   * Menguasai slot untuk satu aksi.
   *
   * Slot ditahan `ref` karena state masih basi di tick yang sama: dengan guard
   * berbasis state saja, dua klik berdekatan lolos pemeriksaan dan menembak
   * dua permintaan sekaligus.
   *
   * @param action - Identitas tombol pemicu; harus sama persis dengan nilai
   *   `busy` pada tombol itu sendiri.
   * @returns `true` bila slot berhasil dikuasai; `false` bila aksi lain masih
   *   berjalan, dan pemanggil harus membatalkan tanpa mengubah apa pun.
   */
  readonly claim: (action: Exclude<AiAction, 'idle'>) => boolean;
  /** Melepas slot; aman dipanggil dari `finally` aksi apa pun. */
  readonly release: () => void;
}

/**
 * Menyediakan satu slot AI untuk satu aksi berjalan pada satu waktu.
 *
 * @returns Aksi aktif beserta penugas claim dan release; lihat {@link AiSlot}.
 */
export function useAiSlot(): AiSlot {
  const [action, setAction] = useState<AiAction>('idle');
  const held = useRef<AiAction>('idle');

  const claim = useCallback((next: Exclude<AiAction, 'idle'>): boolean => {
    if (held.current !== 'idle') {
      toast.info('Tunggu permintaan AI yang sedang berjalan selesai.');
      return false;
    }
    held.current = next;
    setAction(next);
    return true;
  }, []);

  const release = useCallback((): void => {
    held.current = 'idle';
    setAction('idle');
  }, []);

  return { action, claim, release };
}

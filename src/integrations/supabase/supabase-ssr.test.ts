import { describe, expect, it, vi } from 'vitest';

import { createHardenedSupabaseCookieStore, type SupabaseCookieWriter } from '@/integrations/supabase/supabase-ssr';

function writerStub(): SupabaseCookieWriter & { sets: Array<{ name: string; value: string; options: Record<string, unknown> }> } {
  const sets: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  return {
    getAll: () => [{ name: 'sb-sesi', value: 'abc' }],
    set: (name, value, options) => { sets.push({ name, value, options: { ...options } }); },
    sets,
  };
}

describe('createHardenedSupabaseCookieStore', () => {
  it('meneruskan getAll sebagai salinan', () => {
    const writer = writerStub();
    const store = createHardenedSupabaseCookieStore(writer);
    expect(store.getAll()).toEqual([{ name: 'sb-sesi', value: 'abc' }]);
    expect(store.getAll()).not.toBe(store.getAll());
  });

  it('mengeraskan opsi cookie saat setAll', () => {
    const writer = writerStub();
    const store = createHardenedSupabaseCookieStore(writer);
    store.setAll([{ name: 'sb-sesi', value: 'abc', options: {} }]);
    expect(writer.sets).toEqual([
      { name: 'sb-sesi', value: 'abc', options: { path: '/', httpOnly: true, sameSite: 'lax' } },
    ]);
  });

  it('mempertahankan opsi bawaan pemanggil', () => {
    const writer = writerStub();
    const store = createHardenedSupabaseCookieStore(writer);
    store.setAll([{ name: 'sb-sesi', value: 'abc', options: { maxAge: 60 } }]);
    expect(writer.sets[0]?.options).toMatchObject({ maxAge: 60, path: '/', httpOnly: true });
  });

  it('memakai vi.fn writer tanpa mengeluh', () => {
    const set = vi.fn();
    const store = createHardenedSupabaseCookieStore({ getAll: () => [], set });
    store.setAll([]);
    expect(set).not.toHaveBeenCalled();
  });
});

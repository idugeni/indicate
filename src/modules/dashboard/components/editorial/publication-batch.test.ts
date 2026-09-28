import { describe, expect, it } from 'vitest';

import { chunkPublicationTargets, PUBLICATION_BATCH_LIMIT, selectPublicationTargets } from '@/modules/dashboard/components/editorial/publication-batch';

const site = (id: string, siteLevel: string, status = 'active', activationState = 'active', regionId: string | null = null) => ({ id, siteLevel, status, activationState, regionId });

describe('Pemilihan target penerbitan', () => {
  const sites = [
    site('apex-1', 'apex'),
    site('apex-2', 'apex'),
    site('region-1', 'region'),
    site('city-wonosobo-1', 'city', 'active', 'active', 'r-wonosobo'),
    site('city-wonosobo-2', 'city', 'active', 'active', 'r-wonosobo'),
    site('city-sleman', 'city', 'active', 'active', 'r-sleman'),
    site('apex-dead', 'apex', 'retired'),
    site('apex-dormant', 'apex', 'active', 'dormant'),
  ];

  it('memakai portal apex aktif saat tidak ada kota dipilih', () => {
    expect(selectPublicationTargets(sites, { kind: 'apex' })).toEqual(['apex-1', 'apex-2']);
  });

  it('memakai hanya portal kota terpilih', () => {
    expect(selectPublicationTargets(sites, { kind: 'city', regionId: 'r-wonosobo' })).toEqual(['city-wonosobo-1', 'city-wonosobo-2']);
  });

  it('tidak pernah menyertakan portal apex pada scope kota', () => {
    const targeted = selectPublicationTargets(sites, { kind: 'city', regionId: 'r-wonosobo' });
    expect(targeted).not.toContain('apex-1');
  });

  it('tidak pernah menyertakan portal region pada scope mana pun', () => {
    expect(selectPublicationTargets(sites, { kind: 'apex' })).not.toContain('region-1');
    expect(selectPublicationTargets(sites, { kind: 'city', regionId: 'r-wonosobo' })).not.toContain('region-1');
  });

  it('mengembalikan kosong untuk kota tanpa portal', () => {
    expect(selectPublicationTargets(sites, { kind: 'city', regionId: 'r-tidak-ada' })).toEqual([]);
  });

  it('membuang target ganda', () => {
    expect(selectPublicationTargets([site('apex-1', 'apex'), site('apex-1', 'apex')], { kind: 'apex' })).toEqual(['apex-1']);
  });

  it('mengembalikan kosong saat tidak ada portal aktif', () => {
    expect(selectPublicationTargets([], { kind: 'apex' })).toEqual([]);
  });
});

describe('Pemecahan batch penerbitan', () => {
  it('mengirim satu batch bila jumlah target di bawah ceiling', () => {
    expect(chunkPublicationTargets(['a', 'b'])).toEqual([['a', 'b']]);
  });

  it('memecah tepat di batas server dan menyisakan sisanya', () => {
    const ids = Array.from({ length: 134 }, (_, index) => `site-${index}`);
    const batches = chunkPublicationTargets(ids);
    expect(batches.map((batch) => batch.length)).toEqual([100, 34]);
    expect(batches.flat()).toEqual(ids);
  });

  it('tidak melewati ceiling pada jumlah tepat kelipatan', () => {
    const ids = Array.from({ length: 200 }, (_, index) => `site-${index}`);
    expect(chunkPublicationTargets(ids).map((batch) => batch.length)).toEqual([100, 100]);
  });

  it('menghormati ukuran batch yang diberikan', () => {
    expect(chunkPublicationTargets(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']]);
  });

  it('menghasilkan tanpa batch untuk input kosong', () => {
    expect(chunkPublicationTargets([])).toEqual([]);
  });

  it('memakai ceiling server sebagai nilai bawaan', () => {
    expect(PUBLICATION_BATCH_LIMIT).toBe(100);
  });
});

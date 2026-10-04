import { describe, expect, it } from 'vitest';

import {
  buildArticlePayload,
  type ArticleFormSnapshot,
} from '@/modules/dashboard/components/editorial/article-persistence';

const SNAPSHOT: ArticleFormSnapshot = {
  slug: 'judul-uji',
  titleText: 'Judul Uji',
  descriptionText: 'Inti berita.',
  bodyText: 'Isi berita lengkap.',
  bodyJson: null,
  source: 'Rilis Resmi',
  canonicalUrl: 'https://sumber.example/rilis',
  coverUrl: '',
  tags: ['Wonosobo', 'APBD'],
  status: 'draft',
  rawSchedule: '',
  provinceId: 'r-1',
  cityId: null,
  publisherId: null,
  authorId: 'a-1',
  categoryIds: ['c-1'],
  leadMediaId: null,
  type: 'standard',
  isSponsored: false,
  videoUrl: '',
  audioUrl: '',
  durationSeconds: '',
};

describe('buildArticlePayload', () => {
  it('menerjemahkan state form menjadi payload server', () => {
    const payload = buildArticlePayload(SNAPSHOT, ['c-1', 'c-2']);
    expect(payload).toMatchObject({
      regionId: 'r-1',
      categoryIds: ['c-1', 'c-2'],
      slug: 'judul-uji',
      title: 'Judul Uji',
      excerpt: 'Inti berita.',
      canonicalUrl: 'https://sumber.example/rilis',
      body: 'Isi berita lengkap.',
      source: 'Rilis Resmi',
      tags: ['wonosobo', 'apbd'],
      status: 'draft',
      scheduledAt: null,
    });
  });

  it('mengganti-naikkan kosong menjadi undefined dan source jadi string kosong', () => {
    const payload = buildArticlePayload(
      { ...SNAPSHOT, descriptionText: '   ', canonicalUrl: '', source: '  ' },
      [],
    );
    expect(payload.excerpt).toBeUndefined();
    expect(payload.canonicalUrl).toBeUndefined();
    expect(payload.source).toBe('');
  });

  it('memakai kota sebagai wilayah bila kota dipilih', () => {
    expect(buildArticlePayload({ ...SNAPSHOT, cityId: 'r-2' }, []).regionId).toBe('r-2');
  });

  it('mengirim null sebagai wilayah nasional bila provinsi dan kota kosong', () => {
    expect(buildArticlePayload({ ...SNAPSHOT, provinceId: null, cityId: null }, []).regionId).toBeNull();
  });

  it('membuang jadwal saat status bukan terjadwal', () => {
    const payload = buildArticlePayload({ ...SNAPSHOT, status: 'active', rawSchedule: '2026-10-01T07:00' }, []);
    expect(payload.scheduledAt).toBeNull();
  });

  it('mengirim mode standar bawaan tanpa URL dan sponsor', () => {
    const payload = buildArticlePayload(SNAPSHOT, []);
    expect(payload).toMatchObject({
      type: 'standard',
      isSponsored: false,
      videoUrl: null,
      audioUrl: null,
      durationSeconds: null,
    });
  });

  it('mengirim URL dan durasi untuk mode video serta audio', () => {
    const video = buildArticlePayload(
      { ...SNAPSHOT, type: 'video', videoUrl: 'https://video.example/tonton', durationSeconds: '180' },
      [],
    );
    expect(video).toMatchObject({ type: 'video', videoUrl: 'https://video.example/tonton', durationSeconds: 180 });

    const audio = buildArticlePayload(
      { ...SNAPSHOT, type: 'audio', audioUrl: 'https://cdn.example/rekaman.mp3', durationSeconds: 'abc' },
      [],
    );
    expect(audio).toMatchObject({ type: 'audio', audioUrl: 'https://cdn.example/rekaman.mp3', durationSeconds: null });
  });

  it('menandai konten bersponsor', () => {
    const payload = buildArticlePayload({ ...SNAPSHOT, isSponsored: true }, []);
    expect(payload.isSponsored).toBe(true);
  });
});

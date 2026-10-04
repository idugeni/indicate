import { describe, expect, it } from 'vitest';

import { articleAudioEntries, articleVideoEntries } from '@/modules/delivery/network-runtime';

describe('articleVideoEntries', () => {
  it('kosong di luar mode video dan untuk YouTube', () => {
    expect(articleVideoEntries(undefined)).toEqual([]);
    expect(articleVideoEntries({ type: 'standard', videoUrl: 'https://video.portalberita.id/a.mp4' })).toEqual([]);
    expect(articleVideoEntries({ type: 'video', videoUrl: null })).toEqual([]);
    expect(articleVideoEntries({ type: 'video', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toEqual([]);
    expect(articleVideoEntries({ type: 'video', videoUrl: 'javascript:alert(1)' })).toEqual([]);
  });

  it('membawa URL berkas https apa adanya tanpa menebak MIME', () => {
    expect(articleVideoEntries({ type: 'video', videoUrl: 'https://video.portalberita.id/liputan.mp4' })).toEqual([
      { url: 'https://video.portalberita.id/liputan.mp4' },
    ]);
  });
});

describe('articleAudioEntries', () => {
  it('kosong di luar mode audio dan untuk URL tak aman', () => {
    expect(articleAudioEntries(undefined)).toEqual([]);
    expect(articleAudioEntries({ type: 'standard', audioUrl: 'https://audio.portalberita.id/a.mp3' })).toEqual([]);
    expect(articleAudioEntries({ type: 'audio', audioUrl: null })).toEqual([]);
    expect(articleAudioEntries({ type: 'audio', audioUrl: 'http://insecure.example/a.mp3' })).toEqual([]);
  });

  it('membawa URL audio https', () => {
    expect(articleAudioEntries({ type: 'audio', audioUrl: 'https://audio.portalberita.id/rekaman.mp3' })).toEqual([
      { url: 'https://audio.portalberita.id/rekaman.mp3' },
    ]);
  });
});

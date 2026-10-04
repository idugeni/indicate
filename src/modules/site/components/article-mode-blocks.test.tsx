// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import {
  ArticleAudioPlayer,
  ArticleModeBadge,
  ArticleVideoPlayer,
  formatDuration,
  LiveblogTimeline,
  SponsoredDisclosure,
} from '@/modules/site/components/article-mode-blocks';

describe('formatDuration', () => {
  it('memformat detik menjadi M:SS dan H:MM:SS', () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(150)).toBe('2:30');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});

describe('ArticleModeBadge', () => {
  it('tidak menampilkan apa pun untuk standar', () => {
    const { container } = render(<ArticleModeBadge type="standard" />);
    expect(container.textContent).toBe('');
  });

  it('menampilkan label tiap mode non-standar', () => {
    for (const [type, label] of [['video', 'Video'], ['gallery', 'Galeri'], ['audio', 'Audio'], ['liveblog', 'Liveblog'], ['short', 'Short']] as const) {
      const { unmount } = render(<ArticleModeBadge type={type} />);
      expect(screen.getByText(label)).toBeDefined();
      unmount();
    }
  });
});

describe('ArticleVideoPlayer', () => {
  it('merender elemen video untuk berkas https', () => {
    const { container } = render(
      <ArticleVideoPlayer videoUrl="https://video.portalberita.id/liputan.mp4" durationSeconds={150} title="Judul" />,
    );
    expect(container.querySelector('video')?.getAttribute('src')).toBe('https://video.portalberita.id/liputan.mp4');
    expect(screen.getByText('Durasi 2:30')).toBeDefined();
  });

  it('merender sematan YouTube untuk URL tonton', () => {
    const { container } = render(
      <ArticleVideoPlayer videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" durationSeconds={null} title="Judul" />,
    );
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('iframe')?.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('menolak URL tak aman', () => {
    const { container } = render(
      <ArticleVideoPlayer videoUrl="javascript:alert(1)" durationSeconds={null} title="Judul" />,
    );
    expect(container.textContent).toBe('');
  });
});

describe('ArticleAudioPlayer', () => {
  it('merender elemen audio dengan durasi', () => {
    const { container } = render(
      <ArticleAudioPlayer audioUrl="https://audio.portalberita.id/rekaman.mp3" durationSeconds={65} title="Judul" />,
    );
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('https://audio.portalberita.id/rekaman.mp3');
    expect(screen.getByText(/1:05/)).toBeDefined();
  });

  it('menolak URL tak aman', () => {
    const { container } = render(
      <ArticleAudioPlayer audioUrl="http://insecure.example/a.mp3" durationSeconds={null} title="Judul" />,
    );
    expect(container.querySelector('audio')).toBeNull();
  });
});

describe('SponsoredDisclosure', () => {
  it('tampil hanya untuk konten bersponsor', () => {
    const { container, rerender } = render(<SponsoredDisclosure isSponsored={false} attribution="Humas" />);
    expect(container.textContent).toBe('');
    rerender(<SponsoredDisclosure isSponsored={true} attribution="Humas Uji" />);
    expect(screen.getByText(/Konten bersponsor oleh Humas Uji/)).toBeDefined();
  });
});

describe('LiveblogTimeline', () => {
  it('tidak tampil tanpa entri dan menomori terbaru dulu', () => {
    const { container, rerender } = render(<LiveblogTimeline updates={[]} />);
    expect(container.textContent).toBe('');
    rerender(
      <LiveblogTimeline
        updates={[
          { id: 'u-2', body: 'Gol kedua.', publishedAt: '2026-10-04T08:00:00.000Z' },
          { id: 'u-1', body: 'Gol pertama.', publishedAt: '2026-10-04T07:00:00.000Z' },
        ]}
      />,
    );
    expect(screen.getByText('Gol kedua.')).toBeDefined();
    expect(screen.getByText('Gol pertama.')).toBeDefined();
    expect(screen.getByText(/2 entri/)).toBeDefined();
  });
});

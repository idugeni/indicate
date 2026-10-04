// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { EditorialImage } from '@/modules/site/components/editorial-image';

describe('EditorialImage fallbackSrc', () => {
  it('bertahan di src utama bila tidak ada fallback', () => {
    render(<EditorialImage src="https://cdn.portalberita.id/a.webp" alt="Sampul" />);
    expect((screen.getByAltText('Sampul') as HTMLImageElement).src).toBe('https://cdn.portalberita.id/a.webp');
  });

  it('beralih ke fallback sekali saat src utama gagal', () => {
    render(
      <EditorialImage
        src="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
        fallbackSrc="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
        alt="Sampul video"
      />,
    );
    const img = screen.getByAltText('Sampul video') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    fireEvent.error(img);
    expect(img.src).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});

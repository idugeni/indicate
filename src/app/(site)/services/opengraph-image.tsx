import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate — Everything you need.';

export default function ServicesOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="Services" title="Everything you need." />, { ...size });
}

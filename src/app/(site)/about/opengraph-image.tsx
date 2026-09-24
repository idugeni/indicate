import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate — Small teams. Big systems.';

export default function AboutOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="About" title="Small teams. Big systems." />, { ...size });
}

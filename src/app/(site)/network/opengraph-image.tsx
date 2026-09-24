import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate - Every portal. One newsroom.';

export default function NetworkOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="Network" title="Every portal. One newsroom." />, { ...size });
}

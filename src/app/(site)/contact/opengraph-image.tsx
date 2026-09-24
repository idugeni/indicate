import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate — Start with a hello.';

export default function ContactOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="Contact" title="Start with a hello." />, { ...size });
}

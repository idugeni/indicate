import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate — Questions, answered.';

export default function FaqOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="FAQ" title="Questions, answered." />, { ...size });
}

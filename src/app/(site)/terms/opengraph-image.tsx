import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate — Terms of Service.';

export default function TermsOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="Legal" title="Terms of Service." />, { ...size });
}

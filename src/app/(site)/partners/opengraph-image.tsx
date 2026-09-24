import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate - Institutions that trust us.';

export default function PartnersOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="Partners" title="Institutions that trust us." />, { ...size });
}

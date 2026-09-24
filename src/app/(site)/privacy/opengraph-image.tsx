import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate — Privacy Policy.';

export default function PrivacyOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="Legal" title="Privacy Policy." />, { ...size });
}

import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate - One Newsroom. Everywhere.';

export default function DefaultOpenGraphImage() {
  return new ImageResponse(
    <OgCard eyebrow="Publishing Infrastructure" title="One Newsroom. Everywhere." />,
    { ...size },
  );
}

import { ImageResponse } from 'next/og';
import { OgCard } from '@/ui/site/og-card';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Indicate — One price. No surprises.';

export default function PricingOpenGraphImage() {
  return new ImageResponse(<OgCard eyebrow="Pricing" title="One price. No surprises." />, { ...size });
}

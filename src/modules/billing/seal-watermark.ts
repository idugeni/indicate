import sharp from 'sharp';

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/**
 * Burn an invoice number into a stamp image for per-invoice binding.
 *
 * @param image - Source PNG bytes.
 * @param label - Invoice number burned into a bottom band.
 * @returns Watermarked PNG bytes.
 * @throws When the source image cannot be decoded.
 * @example
 * ```ts
 * const marked = await watermarkStamp(raw, 'IND-0AD4A-2609-0047-Q2M9');
 * ```
 */
export async function watermarkStamp(image: Uint8Array, label: string): Promise<Uint8Array> {
  const base = sharp(image);
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width <= 0 || height <= 0) throw new Error('watermarkStamp needs a decodable image');
  const band = Math.max(24, Math.round(height * 0.09));
  const fontSize = Math.round(band * 0.52);
  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="0" y="${height - band}" width="${width}" height="${band}" fill="rgba(22,19,17,0.85)" />` +
      `<text x="${width / 2}" y="${height - band / 2}" text-anchor="middle" dominant-baseline="central" font-family="monospace" font-size="${fontSize}" letter-spacing="2" fill="#ffffff">${escapeXml(label)}</text>` +
      `</svg>`,
  );
  const out = await base.composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
  return new Uint8Array(out);
}

import type { ComponentType } from 'react';
import { Mail } from 'lucide-react';
import { FaFacebookF, FaTelegram, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';

/** Ikon kanal bagikan: glyph react-icons fa6 atau lucide. */
export type ShareChannelIcon = ComponentType<{
  readonly className?: string | undefined;
  readonly 'aria-hidden'?: boolean | 'false' | 'true' | undefined;
}>;

/** Kunci kanal bagikan. */
export type ShareChannelKey = 'email' | 'facebook' | 'telegram' | 'whatsapp' | 'x';

/** Satu kanal bagikan: kunci, label, tautan, dan ikon. */
export interface ShareChannel {
  readonly key: ShareChannelKey;
  readonly label: string;
  readonly href: string;
  readonly Icon: ShareChannelIcon;
}

/**
 * Susun daftar kanal bagikan yang identik untuk tombol baris dan dialog.
 *
 * @param title - Judul artikel yang dibagikan.
 * @param canonicalUrl - URL kanonis artikel.
 * @returns Lima kanal: WhatsApp, X, Facebook, Telegram, Email.
 */
export function buildShareChannels(title: string, canonicalUrl: string): readonly ShareChannel[] {
  const shareText = encodeURIComponent(`${title} ${canonicalUrl}`);
  return [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${shareText}`,
      Icon: FaWhatsapp,
    },
    {
      key: 'x',
      label: 'X',
      href: `https://x.com/intent/post?text=${shareText}`,
      Icon: FaXTwitter,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`,
      Icon: FaFacebookF,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(title)}`,
      Icon: FaTelegram,
    },
    {
      key: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${shareText}`,
      Icon: Mail,
    },
  ];
}

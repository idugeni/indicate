import type { ComponentType } from 'react';
import { Mail, Phone, Rss, Link2 } from 'lucide-react';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedin,
  FaTelegram,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';

const ICONS: Readonly<Record<string, ComponentType<{ readonly className?: string }>>> = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  x: FaXTwitter,
  twitter: FaXTwitter,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  telegram: FaTelegram,
  whatsapp: FaWhatsapp,
  linkedin: FaLinkedin,
  email: Mail,
  telepon: Phone,
};

/**
 * Ikon kanal kontak bersama untuk semua template.
 *
 * @param name - Kunci kanal (case-insensitive).
 * @returns Komponen ikon; `Rss` untuk sosmed umum, `Link2` untuk lainnya.
 */
export function channelIcon(name: string): ComponentType<{ readonly className?: string }> {
  const hit = ICONS[name.toLowerCase()];
  if (hit) return hit;
  if (name.toLowerCase().includes('rss') || name.toLowerCase().includes('feed')) return Rss;
  return Link2;
}

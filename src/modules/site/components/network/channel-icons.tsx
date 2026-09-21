import type { ComponentType } from 'react';
import { Mail, Phone, Rss, Link2 } from 'lucide-react';
import {
  FaBluesky,
  FaDailymotion,
  FaDiscord,
  FaFacebookF,
  FaGithub,
  FaInstagram,
  FaLine,
  FaLinkedin,
  FaMastodon,
  FaMedium,
  FaPinterest,
  FaQuora,
  FaReddit,
  FaSnapchat,
  FaSpotify,
  FaTelegram,
  FaThreads,
  FaTiktok,
  FaTumblr,
  FaTwitch,
  FaVimeo,
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
  threads: FaThreads,
  bluesky: FaBluesky,
  snapchat: FaSnapchat,
  pinterest: FaPinterest,
  reddit: FaReddit,
  discord: FaDiscord,
  twitch: FaTwitch,
  spotify: FaSpotify,
  medium: FaMedium,
  vimeo: FaVimeo,
  dailymotion: FaDailymotion,
  github: FaGithub,
  line: FaLine,
  quora: FaQuora,
  tumblr: FaTumblr,
  mastodon: FaMastodon,
  email: Mail,
  telepon: Phone,
};

/**
 * Shared contact channel icons for all templates.
 *
 * @param name - Channel key (case-insensitive).
 * @returns Icon component; `Rss` for generic social, `Link2` for everything else.
 */
export function channelIcon(name: string): ComponentType<{ readonly className?: string }> {
  const hit = ICONS[name.toLowerCase()];
  if (hit) return hit;
  if (name.toLowerCase().includes('rss') || name.toLowerCase().includes('feed')) return Rss;
  return Link2;
}

/**
 * Kontak perusahaan bersama untuk seluruh tenant.
 *
 * @remarks
 * Satu-satunya sumber akun PT Sanca Phena Cakra. Semua template (kini dan
 * nanti) wajib resolve kanal lewat `resolveContactChannels` agar konsisten.
 * Isi URL/email/nomor di bawah sekali — seluruh halaman kontak dan footer
 * tenant mengikutinya. Kunci yang belum diisi dikosongkan dan otomatis
 * disembunyikan dari render.
 */
export const COMPANY_NAME = 'PT Sanca Phena Cakra';

export const COMPANY_EMAIL = 'sancaphenacakra@gmail.com';

export const COMPANY_PHONE = '085641159405';

const COMPANY_SOCIALS: Readonly<Record<string, string>> = {
  facebook: 'https://facebook.com/safenca',
  instagram: 'https://instagram.com/safenca',
  x: 'https://x.com/safenca',
  youtube: 'https://youtube.com/@safenca',
  tiktok: 'https://tiktok.com/@safenca',
  telegram: 'https://t.me/safenca',
  whatsapp: 'https://wa.me/6285641159405',
  linkedin: 'https://linkedin.com/company/safenca',
};

const CHANNEL_LABELS: Readonly<Record<string, string>> = {
  email: 'Email',
  telepon: 'Telepon',
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
};

/** Urutan tampil kanal sosial di semua permukaan. */
export const SOCIAL_ORDER = [
  'facebook',
  'instagram',
  'x',
  'youtube',
  'tiktok',
  'telegram',
  'whatsapp',
  'linkedin',
] as const;

export interface ContactChannel {
  readonly key: string;
  readonly label: string;
  readonly href: string;
}

function labelFor(key: string): string {
  return CHANNEL_LABELS[key] ?? key.slice(0, 1).toUpperCase() + key.slice(1);
}

/**
 * Resolve kanal kontak tenant: default perusahaan + override per situs.
 *
 * @param siteSocials - `socialLinks` situs; nilai non-kosong menang atas default.
 * @returns Kanal terurut siap render; entri kosong dibuang.
 */
export function resolveContactChannels(
  siteSocials: Readonly<Record<string, string>>,
): readonly ContactChannel[] {
  const channels: ContactChannel[] = [];
  if (COMPANY_EMAIL.trim() !== '') {
    channels.push({ key: 'email', label: 'Email', href: `mailto:${COMPANY_EMAIL.trim()}` });
  }
  if (COMPANY_PHONE.trim() !== '') {
    channels.push({ key: 'telepon', label: 'Telepon', href: `tel:${COMPANY_PHONE.trim().replaceAll(' ', '')}` });
  }
  const seen = new Set<string>();
  const pick = (key: string): string => {
    const site = siteSocials[key]?.trim() ?? '';
    if (site !== '') return site;
    return COMPANY_SOCIALS[key]?.trim() ?? '';
  };
  for (const key of SOCIAL_ORDER) {
    const href = pick(key);
    if (href === '') continue;
    seen.add(key);
    channels.push({ key, label: labelFor(key), href });
  }
  for (const [key, raw] of Object.entries(siteSocials)) {
    const href = raw.trim();
    if (href === '' || seen.has(key.toLowerCase())) continue;
    channels.push({ key: key.toLowerCase(), label: labelFor(key.toLowerCase()), href });
  }
  return channels;
}

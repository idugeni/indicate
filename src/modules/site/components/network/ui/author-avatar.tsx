import Image from 'next/image';
import type { CSSProperties } from 'react';

/**
 * Avatar penulis: foto bila ada, inisial bila kosong.
 *
 * @param name - Nama penulis.
 * @param avatarUrl - URL avatar atau null.
 * @param size - Ukuran tampilan.
 * @returns Avatar bulat penulis.
 * @remarks Warna skin menempel lewat inline style: nilai Tailwind
 * interpolasi (`ring-[${...}]`) tidak pernah di-generate sehingga ring
 * jatuh ke `currentColor`.
 */
export interface AuthorAvatarSkin {
  readonly ring: string;
  readonly primary: string;
}

export function AuthorAvatar({
  skin,
  name,
  avatarUrl,
  size,
}: {
  readonly skin: AuthorAvatarSkin;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly size: 'md' | 'sm';
}) {
  const dimension = size === 'md' ? 'h-10 w-10 text-sm' : 'h-6 w-6 text-[11px]';
  if (avatarUrl !== null && avatarUrl !== '') {
    const side = size === 'md' ? 80 : 48;
    return (
      <Image
        unoptimized
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={side}
        height={side}
        className={`${dimension} flex-none rounded-full object-cover ring-1`}
        style={{ '--tw-ring-color': skin.ring } as CSSProperties}
      />
    );
  }
  const initial = (name || 'R').trim().slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`${dimension} flex flex-none items-center justify-center rounded-full font-sans font-bold`}
      style={{ backgroundColor: `${skin.primary}1A`, color: skin.primary }}
    >
      {initial}
    </span>
  );
}

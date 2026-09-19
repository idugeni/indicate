import Image from 'next/image';

/**
 * Avatar penulis: foto bila ada, inisial bila kosong.
 *
 * @param name - Nama penulis.
 * @param avatarUrl - URL avatar atau null.
 * @param size - Ukuran tampilan.
 * @returns Avatar bulat penulis.
 */
export function AuthorAvatar({
  name,
  avatarUrl,
  size,
}: {
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
        className={`${dimension} flex-none rounded-full object-cover ring-1 ring-slate-200`}
      />
    );
  }
  const initial = (name || 'R').trim().slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`${dimension} flex flex-none items-center justify-center rounded-full bg-[#b91c1c]/10 font-sans font-bold text-[#b91c1c]`}
    >
      {initial}
    </span>
  );
}

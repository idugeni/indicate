import Image from 'next/image';

/** Badge toko aplikasi tanpa tautan: visual merespons hover, klik tanpa aksi. */
export function WarmEditorialStoreBadges() {
  return (
    <p className="m-0 mt-4 flex flex-nowrap items-center gap-2">
      <span
        title="Segera hadir di App Store"
        className="min-w-0 flex-1 basis-0 cursor-pointer transition duration-180 hover:scale-[1.03] hover:brightness-110"
      >
        <Image
          src="/brand/app-store.svg"
          alt="Segera hadir di App Store"
          width={120}
          height={40}
          className="h-10 w-full object-contain object-left"
        />
      </span>
      <span
        title="Segera hadir di Google Play"
        className="min-w-0 flex-1 basis-0 cursor-pointer transition duration-180 hover:scale-[1.03] hover:brightness-110"
      >
        <Image
          src="/brand/google-play.svg"
          alt="Segera hadir di Google Play"
          width={120}
          height={40}
          className="h-10 w-full object-contain object-left"
        />
      </span>
    </p>
  );
}

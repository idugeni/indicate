import Image from 'next/image';

/** Badge toko aplikasi tanpa tautan: visual merespons hover, klik tanpa aksi. */
export function GreenMinimalStoreBadges() {
  return (
    <p className="m-0 mt-4 flex flex-wrap items-center gap-2">
      <span
        title="Segera hadir di App Store"
        className="flex-none cursor-pointer transition duration-180 hover:scale-[1.03] hover:brightness-110 sm:min-w-0 sm:flex-1 sm:basis-0"
      >
        <Image
          unoptimized
          src="/brand/app-store.svg"
          alt="Segera hadir di App Store"
          width={120}
          height={40}
          className="h-10 w-auto sm:w-full sm:object-contain sm:object-left"
        />
      </span>
      <span
        title="Segera hadir di Google Play"
        className="flex-none cursor-pointer transition duration-180 hover:scale-[1.03] hover:brightness-110 sm:min-w-0 sm:flex-1 sm:basis-0"
      >
        <Image
          unoptimized
          src="/brand/google-play.svg"
          alt="Segera hadir di Google Play"
          width={120}
          height={40}
          className="h-10 w-auto sm:w-full sm:object-contain sm:object-left"
        />
      </span>
    </p>
  );
}

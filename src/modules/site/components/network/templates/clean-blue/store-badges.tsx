import Image from 'next/image';

/** Badge toko aplikasi resmi (aset SVG). Tanpa link hingga tenant punya aplikasi. */
export function CleanBlueStoreBadges() {
  return (
    <p className="m-0 mt-4 grid grid-cols-2 gap-2.5">
      <Image
        unoptimized
        src="/brand/app-store.svg"
        alt="Download on the App Store"
        width={120}
        height={40}
        className="h-10 w-full object-contain object-left"
      />
      <Image
        unoptimized
        src="/brand/google-play.svg"
        alt="Temukan di Google Play"
        width={120}
        height={40}
        className="h-10 w-full object-contain object-left"
      />
    </p>
  );
}

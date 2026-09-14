import Image from 'next/image';

export default function RootLoading() {
  return (
    <div aria-busy="true" className="flex min-h-dvh items-center justify-center bg-bg">
      <span className="sr-only">Memuat</span>
      <div aria-hidden="true" className="relative h-28 w-28">
        <div className="absolute -inset-3 animate-pulse rounded-full bg-[#1f6feb]/20 blur-xl" />
        <div className="absolute -inset-1.5 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_10%,#1f6feb_45%,#9fc0ff_55%,transparent_90%)]" />
        <div className="absolute inset-0 rounded-full bg-bg" />
        <Image
          src="/apple-icon.png"
          alt=""
          width={112}
          height={112}
          priority
          className="absolute inset-0 m-auto h-20 w-20 rounded-full object-cover ring-1 ring-hairline-strong"
        />
      </div>
    </div>
  );
}

export default function RootLoading() {
  return (
    <div aria-busy="true" className="flex min-h-dvh items-center justify-center bg-[#f4f2ec]">
      <span className="sr-only">Memuat</span>
      <div aria-hidden="true" className="relative h-28 w-28">
        <div className="absolute -inset-3 animate-pulse rounded-full bg-[#b88d3a]/20 blur-xl" />
        <div className="absolute -inset-1.5 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_10%,#b88d3a_45%,#e8d5a8_55%,transparent_90%)]" />
        <div className="absolute inset-0 rounded-full bg-[#f4f2ec]" />
        <div className="absolute inset-0 m-auto h-5 w-5 animate-pulse rounded-full bg-[#b88d3a]" />
      </div>
    </div>
  );
}

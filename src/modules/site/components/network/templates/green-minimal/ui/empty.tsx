/**
 * Status kosong editorial untuk kanal tanpa artikel terbit.
 *
 * @param title - Nama konteks kanal.
 * @returns Kartu status kosong.
 */
export function GreenMinimalEmpty({ title }: { readonly title: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12" role="status">
        <h2 className="m-0 font-sans text-xl font-bold text-slate-900">Belum ada laporan terbit</h2>
        <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-slate-600">
          Konten editorial untuk {title} sedang dalam antrean pemrosesan sinyal atau validasi redaksi.
        </p>
      </div>
    </div>
  );
}

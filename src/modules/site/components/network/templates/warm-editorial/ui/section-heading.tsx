/**
 * Judul seksi editorial dengan aksen bilah terakota.
 *
 * @param children - Teks judul.
 * @param description - Deskripsi opsional di bawah judul.
 * @returns Kepala seksi konsisten template.
 */
export function SectionHeading({
  children,
  description,
}: {
  readonly children: string;
  readonly description?: string | undefined;
}) {
  return (
    <div>
      <h2 className="m-0 flex items-center gap-2.5 font-serif text-xl font-bold tracking-tight text-[#231208] sm:text-2xl">
        <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#b4532a]" />
        {children}
      </h2>
      {description === undefined || description === '' ? null : (
        <p className="m-0 mt-1 font-sans text-sm text-slate-600">{description}</p>
      )}
    </div>
  );
}

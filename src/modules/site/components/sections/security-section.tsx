import { SecondaryCta } from '@/modules/site/components/layout/content';
import { Container } from '@/modules/site/components/layout/content';

const SECURITY_ROWS = [
  {
    title: 'Host tepat, tanpa fallback',
    description: 'Situs publik ditentukan dari nama host yang sama persis secara eksak, tanpa fallback tenant.',
  },
  {
    title: 'Isolasi berlapis per organisasi',
    description: 'Setiap data terikat pada satu organisasi. Pemisahan ditegakkan berlapis, dari aturan aplikasi hingga kebijakan keamanan baris pada basis data.',
  },
  {
    title: 'Media privat bertanda tangan',
    description: 'Gambar disimpan pada penyimpanan privat dan hanya dibuka lewat tautan bertanda tangan berumur pendek. Tidak ada folder publik yang bisa diintip orang.',
  },
  {
    title: 'Jejak audit hanya-tambah',
    description: 'Setiap perubahan sensitif tercatat pada jejak audit yang tidak dapat dihapus oleh aplikasi.',
  },
  {
    title: 'Kontrol akses redaksi',
    description: 'Akses anggota dapat dicabut sewaktu-waktu oleh pengurus organisasi; akun yang disalahgunakan dapat dibekukan setelah pemberitahuan.',
  },
  {
    title: 'Tanpa pelacak iklan',
    description: 'Halaman publik tidak meminta data pribadi pembaca dan tidak memasang pelacak iklan.',
  },
] as const;

export function SecuritySection() {
  return (
    <section aria-labelledby="keamanan-berlapis-heading" className="border-y border-hairline bg-bg-raised/40">
      <Container className="grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium tracking-wide text-brass">
            <span aria-hidden="true" className="h-px w-8 flex-none bg-brass/70" />
            Keamanan
          </p>
          <h2 id="keamanan-berlapis-heading" className="m-0 mt-4 max-w-md font-serif text-3xl font-medium leading-[1.12] tracking-tight text-balance text-paper sm:text-4xl">
            Keamanan berlapis untuk banyak tenant
          </h2>
          <p className="m-0 mt-4 max-w-md font-sans text-base leading-relaxed text-paper-dim">
            Satu klaim, satu mekanisme yang bisa diverifikasi. Rincian penegakannya
            tertulis di Kebijakan Privasi — bukan sekadar janji pemasaran.
          </p>
          <div className="mt-6">
            <SecondaryCta href="/privacy">
              <span>Baca Kebijakan Privasi</span>
            </SecondaryCta>
          </div>
        </div>
        <div>
          {SECURITY_ROWS.map((row) => (
            <div key={row.title} className="border-t border-hairline py-5 first:border-t-0 first:pt-0 lg:first:pt-0">
              <h3 className="m-0 font-sans text-base font-semibold tracking-tight text-paper">
                {row.title}
              </h3>
              <p className="m-0 mt-1.5 max-w-xl font-sans text-sm leading-relaxed text-paper-dim">
                {row.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

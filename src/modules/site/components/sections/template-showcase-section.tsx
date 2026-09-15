import { Section } from '@/modules/site/components/layout/content';
import type { MasterTemplatePreset } from '@/ui/themes';

const TEMPLATE_FALLBACK: MasterTemplatePreset = {
  id: 'clean-blue',
  name: 'Clean Blue Editorial',
  category: 'news',
  description: 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.',
};

const TRENDING_ROWS = [
  { rank: '01', title: 'Pemekaran wilayah dan denyut portal daerah', meta: '12,4 rb baca · 6 menit' },
  { rank: '02', title: 'Arus mudik dan kesiapan posko terpadu', meta: '9,1 rb baca · 4 menit' },
  { rank: '03', title: 'Harga gabah dan serapan gudang kabupaten', meta: '7,8 rb baca · 5 menit' },
] as const;

export function TemplateShowcaseSection({
  templates,
}: {
  readonly templates: readonly MasterTemplatePreset[];
}) {
  const currentTemplate: MasterTemplatePreset =
    templates.find((t) => t.id === 'clean-blue') ??
    templates[0] ?? TEMPLATE_FALLBACK;

  return (
    <Section
      title="Satu template, seluruh jaringan seragam"
      eyebrow="Tampilan portal"
      description="Setiap domain memakai pola editorial yang sama — ticker, hero, pilihan redaksi, dan newsletter — agar identitas sinkron tanpa fragmentasi layout."
      tone="soft"
    >
      <div className="border border-hairline bg-bg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3">
          <p className="m-0 flex items-center gap-2 font-mono text-xs text-paper-faint">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-hairline-strong" />
              <span className="h-2 w-2 rounded-full bg-hairline-strong" />
              <span className="h-2 w-2 rounded-full bg-brass" />
            </span>
            portal-contoh.suarapagi.com
          </p>
          <p className="m-0 font-sans text-xs text-paper-faint">{currentTemplate.name}</p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
          <div className="border-b border-hairline px-5 py-8 sm:px-8 sm:py-10 lg:border-r lg:border-b-0">
            <p className="m-0 font-sans text-xs font-medium tracking-wide text-paper-faint">
              Terkini · {currentTemplate.category}
            </p>
            <h3 className="m-0 mt-3 max-w-xl font-serif text-3xl font-medium leading-[1.15] tracking-tight text-balance text-paper sm:text-4xl">
              Redaksi menulis sekali, puluhan portal tayang serentak
            </h3>
            <p className="m-0 mt-4 max-w-xl font-sans text-base leading-relaxed text-paper-dim">
              {currentTemplate.description} Setiap artikel membawa atribusi kanonik,
              pratinjau tautan, dan peta situsnya sendiri — dinilai mandiri oleh mesin pencari.
            </p>
            <p className="m-0 mt-6 font-mono text-[11px] tracking-wide text-paper-faint">
              Oleh Redaksi Pusat · 8 menit baca · Diperbarui 10:42 WIB
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <h4 className="m-0 font-sans text-xs font-semibold tracking-wide text-paper-dim">
              Terpopuler di jaringan
            </h4>
            <ol className="m-0 mt-2 list-none p-0">
              {TRENDING_ROWS.map((row) => (
                <li key={row.rank} className="flex gap-4 border-b border-hairline/60 py-4 last:border-b-0">
                  <span className="font-serif text-2xl font-medium text-brass">{row.rank}</span>
                  <span>
                    <span className="block font-sans text-sm font-medium leading-snug text-paper">
                      {row.title}
                    </span>
                    <span className="mt-1 block font-sans text-xs text-paper-faint">{row.meta}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Section>
  );
}

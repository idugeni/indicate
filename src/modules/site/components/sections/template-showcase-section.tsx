'use client';

import { Layout } from 'lucide-react';
import { Section } from '@/modules/site/components/layout/content';
import type { MasterTemplatePreset } from '@/ui/themes';

const TEMPLATE_FALLBACK: MasterTemplatePreset = {
  id: 'clean-blue',
  name: 'Clean Blue Editorial',
  category: 'news',
  description: 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.',
};

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
      title="Template Aktif: Clean Blue Editorial"
      eyebrow="Template"
      description="Seluruh domain jaringan saat ini memakai satu template terpadu agar identitas visual sinkron tanpa fragmentasi layout maupun warna."
    >
      <div className="min-w-0 rounded-lg border border-hairline bg-bg-raised p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="m-0 font-sans text-base font-semibold tracking-tight text-paper">
            {currentTemplate.name}
          </h3>
          <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">
            {currentTemplate.category}
          </span>
        </div>

        <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
          {currentTemplate.description}
        </p>

        <div className="mt-4 rounded-lg border border-hairline bg-bg p-3 font-mono text-[11px] text-paper-dim sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2"
                style={{ backgroundColor: '#1f6feb' }}
                aria-hidden="true"
              />
              <span className="font-medium text-paper">
                [NAV] Header · Clean Blue
              </span>
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: '#1f6feb' }}
            >
              Live Signal Node
            </span>
          </div>

          <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-3">
            <div className="flex min-h-[112px] flex-col justify-between bg-bg p-4 sm:col-span-2">
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-paper">
                  <Layout className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                  <span>[HERO STACK] {currentTemplate.category.toUpperCase()}</span>
                </div>
                <p className="mt-2 font-sans text-xs leading-relaxed text-paper-faint">
                  Alur rendering artikel terisolasi dengan atribut kanonik otomatis,
                  skema microdata JSON-LD terverifikasi, dan edge CDN invalidation.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2 font-mono text-[10px] font-semibold">
                <span
                  className="px-2 py-0.5 text-white"
                  style={{ backgroundColor: '#1f6feb' }}
                >
                  Primary Surface
                </span>
                <span
                  className="border px-2 py-0.5"
                  style={{
                    borderColor: '#1f6feb',
                    color: '#1f6feb',
                  }}
                >
                  Accent Token
                </span>
              </div>
            </div>

            <div className="flex min-h-[112px] flex-col justify-between bg-bg p-4">
              <div>
                <span className="font-semibold text-brass">[SIDEBAR]</span>
                  <p className="mt-2 font-sans text-xs leading-relaxed text-paper-faint">
                    Widget trending, sindikasi silang multi-portal, dan indeks topik.
                  </p>
              </div>
              <span className="font-mono text-[10px] text-paper-faint">
                Exact Slot Isolation
              </span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

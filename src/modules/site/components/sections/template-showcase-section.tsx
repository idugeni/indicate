'use client';

import { useState } from 'react';
import { Layout } from 'lucide-react';
import { Section } from '@/modules/site/components/layout/content';
import { useRovingSelection } from '@/ui/hooks/use-roving-selection';
import {
  type MasterTemplatePreset,
  type NetworkColorPreset,
} from '@/ui/themes';

const TEMPLATE_FALLBACK: MasterTemplatePreset = {
  id: 'portal-news',
  name: 'Portal Berita Utama',
  category: 'editorial',
  description: 'Struktur berita hierarki tinggi dengan headline visual dan wireframe multi-seksi.',
};
const COLOR_FALLBACK: NetworkColorPreset = {
  id: 'emerald-forest',
  name: 'Emerald Forest',
  description: 'Warna hijau zamrud & emas kuningan yang berwibawa.',
  primary: '#0b5d4b',
  accent: '#e9a23b',
};

export function TemplateShowcaseSection({
  templates,
  colors,
}: {
  readonly templates: readonly MasterTemplatePreset[];
  readonly colors: readonly NetworkColorPreset[];
}) {
  const TEMPLATE_IDS: readonly string[] = templates.map((tmpl) => tmpl.id);
  const COLOR_IDS: readonly string[] = colors.map((preset) => preset.id);
  const defaultTemplate = templates[0]?.id ?? TEMPLATE_FALLBACK.id;
  const defaultColor = colors[0]?.id ?? COLOR_FALLBACK.id;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate);
  const [selectedColorId, setSelectedColorId] = useState<string>(defaultColor);

  const templateNav = useRovingSelection(TEMPLATE_IDS, selectedTemplateId, setSelectedTemplateId);
  const colorNav = useRovingSelection(COLOR_IDS, selectedColorId, setSelectedColorId);

  const currentTemplate: MasterTemplatePreset =
    templates.find((t) => t.id === selectedTemplateId) ??
    templates[0] ?? TEMPLATE_FALLBACK;

  const currentColor: NetworkColorPreset =
    colors.find((c) => c.id === selectedColorId) ??
    colors[0] ?? COLOR_FALLBACK;

  return (
    <Section
      title="Master Template & Klaster Warna Siap Pakai"
      description="Kombinasikan matriks layout dan warna branding semantik agar setiap domain dalam jaringan Anda memiliki identitas visual unik tanpa merusak integritas arsitektur redaksi."
    >
      <div className="space-y-6">
        <div
          role="tablist"
          aria-label="Daftar Master Template"
          onKeyDown={templateNav.onKeyDown}
          className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-hairline"
        >
          {templates.map((tmpl) => {
            const isSelected = selectedTemplateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                ref={templateNav.register(tmpl.id)}
                type="button"
                role="tab"
                id={`tab-${tmpl.id}`}
                tabIndex={templateNav.tabIndexFor(tmpl.id)}
                aria-selected={isSelected}
                aria-controls="template-preview-panel"
                onClick={() => setSelectedTemplateId(tmpl.id)}
                className={`whitespace-nowrap border-b-2 pb-2 font-mono text-xs transition-colors duration-180 ${
                  isSelected
                    ? 'border-brass font-semibold text-paper'
                    : 'border-transparent text-paper-faint hover:text-paper'
                }`}
              >
                {tmpl.name}
              </button>
            );
          })}
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div
            id="template-preview-panel"
            role="tabpanel"
            aria-labelledby={`tab-${currentTemplate.id}`}
            className="border-t-2 border-hairline pt-5"
          >
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

            <div className="mt-5 rounded-lg border border-hairline bg-bg-raised/40 p-4 font-mono text-[11px] text-paper-dim sm:p-5">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2"
                    style={{ backgroundColor: currentColor.primary }}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-paper">
                    [NAV] Header · {currentColor.name}
                  </span>
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: currentColor.accent }}
                >
                  Live Signal Node
                </span>
              </div>

              <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-3">
                <div className="flex min-h-[140px] flex-col justify-between bg-bg p-4 sm:col-span-2">
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
                      className="px-2 py-0.5 text-bg"
                      style={{ backgroundColor: currentColor.primary }}
                    >
                      Primary Surface
                    </span>
                    <span
                      className="border px-2 py-0.5"
                      style={{
                        borderColor: currentColor.accent,
                        color: currentColor.accent,
                      }}
                    >
                      Accent Token
                    </span>
                  </div>
                </div>

                <div className="flex min-h-[140px] flex-col justify-between bg-bg p-4">
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

          <div className="rounded-lg border border-hairline bg-bg-raised p-5">
            <div className="flex items-baseline justify-between border-b border-hairline pb-3">
              <h4 className="m-0 font-sans text-sm font-semibold text-paper">
                Klaster warna
              </h4>
              <span className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                Semantik
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Pilihan Klaster Warna"
              onKeyDown={colorNav.onKeyDown}
              className="max-h-80 overflow-y-auto"
            >
              {colors.map((preset) => {
                const isSelected = selectedColorId === preset.id;
                return (
                  <button
                    key={preset.id}
                    ref={colorNav.register(preset.id)}
                    type="button"
                    role="radio"
                    tabIndex={colorNav.tabIndexFor(preset.id)}
                    aria-checked={isSelected}
                    onClick={() => setSelectedColorId(preset.id)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-hairline py-2.5 text-left transition-colors duration-180 ${
                      isSelected ? 'text-paper' : 'text-paper-dim hover:text-paper'
                    }`}
                  >
                    <div>
                      <span className="block font-mono text-xs font-medium">
                        {isSelected ? '● ' : ''}
                        {preset.name}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-paper-faint">
                        {preset.primary} · {preset.accent}
                      </span>
                    </div>
                    <div className="flex flex-none items-center gap-1.5" aria-hidden="true">
                      <span
                        className="h-3.5 w-3.5 border border-hairline-strong"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-3.5 w-3.5 border border-hairline-strong"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
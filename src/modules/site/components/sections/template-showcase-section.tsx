'use client';

import { useState } from 'react';
import { Layout } from 'lucide-react';
import { Section } from '@/modules/site/components/layout/content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const COLOR_IDS: readonly string[] = colors.map((preset) => preset.id);
  const defaultTemplate = templates[0]?.id ?? TEMPLATE_FALLBACK.id;
  const defaultColor = colors[0]?.id ?? COLOR_FALLBACK.id;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate);
  const [selectedColorId, setSelectedColorId] = useState<string>(defaultColor);

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
      eyebrow="Template"
      description="Kombinasikan matriks layout dan warna branding semantik agar setiap domain dalam jaringan Anda memiliki identitas visual unik tanpa merusak integritas arsitektur redaksi."
    >
      <Tabs value={selectedTemplateId} onValueChange={setSelectedTemplateId} className="flex w-full flex-col gap-4">
        <TabsList
          variant="default"
          aria-label="Daftar Master Template"
          className="flex w-full flex-row flex-wrap justify-start gap-2 bg-transparent p-0"
        >
          {templates.map((tmpl) => (
            <TabsTrigger
              key={tmpl.id}
              value={tmpl.id}
              className="h-auto flex-none whitespace-nowrap rounded-md border border-hairline bg-bg-raised px-2.5 py-1 font-mono text-xs text-paper-faint after:hidden transition-colors duration-180 hover:border-hairline-strong hover:text-paper data-active:border-brass data-active:bg-bg-raised-2 data-active:text-paper"
            >
              {tmpl.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <TabsContent
            value={selectedTemplateId}
            className="min-w-0 rounded-lg border border-hairline bg-bg-raised p-4 sm:p-5"
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

            <div className="mt-4 rounded-lg border border-hairline bg-bg p-3 font-mono text-[11px] text-paper-dim sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
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
          </TabsContent>

          <div className="rounded-lg border border-hairline bg-bg-raised p-4">
            <div className="flex items-baseline justify-between gap-2 border-b border-hairline pb-3">
              <h4 className="m-0 font-sans text-sm font-semibold text-paper">
                Klaster warna
              </h4>
              <span className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                Semantik
              </span>
            </div>

            <p className="m-0 mt-3 font-mono text-[11px] tabular-nums text-paper-dim" aria-live="polite">
              <span className="font-semibold text-paper">{currentColor.name}</span>
              <span className="text-paper-faint"> · {currentColor.primary} · {currentColor.accent}</span>
            </p>

            <div
              role="radiogroup"
              aria-label="Pilihan Klaster Warna"
              onKeyDown={colorNav.onKeyDown}
              className="mt-3 flex flex-wrap gap-2"
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
                    aria-label={preset.name}
                    title={`${preset.name} · ${preset.primary} · ${preset.accent}`}
                    onClick={() => setSelectedColorId(preset.id)}
                    className={`flex h-9 w-14 overflow-hidden rounded border transition-colors duration-180 ${
                      isSelected
                        ? 'border-brass'
                        : 'border-hairline hover:border-hairline-strong'
                    }`}
                  >
                    <span
                      className="h-full flex-1"
                      style={{ backgroundColor: preset.primary }}
                      aria-hidden="true"
                    />
                    <span
                      className="h-full flex-1"
                      style={{ backgroundColor: preset.accent }}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Tabs>
    </Section>
  );
}
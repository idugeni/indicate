'use client';

import { useState } from 'react';
import { useRovingSelection } from '@/ui/hooks/use-roving-selection';

const ROUTING_NODES = [
  { host: 'portal-utama.suarapagi.com', siteId: 'site_utama', status: 'Aktif', latency: '12ms' },
  { host: 'portal-sore.wartasore.net', siteId: 'site_sore', status: 'Aktif', latency: '14ms' },
  { host: 'portal-malam.kabarmalam.org', siteId: 'site_malam', status: 'Aktif', latency: '11ms' },
] as const;

type PreviewTab = 'dashboard' | 'telegram' | 'routing';

const TABS: readonly { readonly value: PreviewTab; readonly label: string }[] = [
  { value: 'dashboard', label: 'Dasbor penerbitan' },
  { value: 'telegram', label: 'Alur Telegram' },
  { value: 'routing', label: 'Penentu host' },
];

const TAB_VALUES: readonly PreviewTab[] = TABS.map((tab) => tab.value);

/** Static preview tabs via colocated useState (no tab library in the landing bundle). */
export function LivePreviewSection() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('dashboard');
  const { register, tabIndexFor, onKeyDown } = useRovingSelection(TAB_VALUES, activeTab, setActiveTab);

  return (
    <div className="w-full border-t-2 border-brass/70 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="m-0 font-serif text-2xl font-medium tracking-tight text-paper sm:text-3xl">
            Satu perintah, tiga kanal terbit
          </h2>
          <p className="m-0 mt-2 font-sans text-base leading-relaxed text-paper-dim">
            Bukti antarmuka yang sama dipakai redaksi setiap hari — bukan mockup pajangan.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Pratinjau alur kerja"
          onKeyDown={onKeyDown}
          className="flex max-w-full flex-wrap gap-x-6 gap-y-1"
        >
          {TABS.map((tab) => {
            const selected = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                ref={register(tab.value)}
                type="button"
                role="tab"
                tabIndex={tabIndexFor(tab.value)}
                aria-selected={selected}
                aria-controls={`preview-panel-${tab.value}`}
                id={`preview-tab-${tab.value}`}
                onClick={() => setActiveTab(tab.value)}
                className={`border-b-2 pb-2 font-sans text-sm font-medium transition-colors ${
                  selected
                    ? 'border-brass text-paper'
                    : 'border-transparent text-paper-faint hover:text-paper'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid border border-hairline bg-bg-raised">
        <div
          id="preview-panel-dashboard"
          role="tabpanel"
          aria-labelledby="preview-tab-dashboard"
          aria-hidden={activeTab !== 'dashboard'}
          className={`m-0 col-start-1 row-start-1 ${activeTab !== 'dashboard' ? 'invisible' : ''}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
            <span className="font-mono text-xs text-paper">POST /api/dashboard/publishing</span>
            <span className="font-mono text-xs font-medium text-signal">200 OK</span>
          </div>
          <dl className="m-0 grid gap-0 px-5 py-2 sm:grid-cols-3">
            <div className="border-b border-hairline/60 py-3 sm:border-b-0 sm:border-r sm:pr-5">
              <dt className="font-sans text-xs text-paper-faint">Organisasi</dt>
              <dd className="m-0 mt-1 font-sans text-sm font-medium text-paper">Media Nusantara Group</dd>
              <dd className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">org_01h8x</dd>
            </div>
            <div className="border-b border-hairline/60 py-3 sm:border-b-0 sm:border-r sm:px-5">
              <dt className="font-sans text-xs text-paper-faint">Naskah</dt>
              <dd className="m-0 mt-1 font-sans text-sm font-medium text-paper">Laporan Kinerja Ekonomi Nasional 2026</dd>
              <dd className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">3 situs tujuan</dd>
            </div>
            <div className="py-3 sm:pl-5">
              <dt className="font-sans text-xs text-paper-faint">Hasil</dt>
              <dd className="m-0 mt-1 flex items-center gap-1.5 font-sans text-sm font-medium text-signal">
                <span className="h-1.5 w-1.5 flex-none bg-signal" aria-hidden="true" />
                Terkirim ke 3 kanal
              </dd>
              <dd className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">3 tugas invalidasi edge</dd>
            </div>
          </dl>
        </div>

        <div
          id="preview-panel-telegram"
          role="tabpanel"
          aria-labelledby="preview-tab-telegram"
          aria-hidden={activeTab !== 'telegram'}
          className={`m-0 col-start-1 row-start-1 ${activeTab !== 'telegram' ? 'invisible' : ''}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
            <span className="font-sans text-sm font-medium text-paper">Bot Dispatcher Indicate</span>
            <span className="font-mono text-[11px] text-paper-faint">10:14:02 WIB</span>
          </div>
          <div className="px-5 py-2">
            <p className="m-0 border-b border-hairline/60 py-3 font-mono text-xs text-paper">
              /publish #1092 --target=portal-timur.lintasharian.com
            </p>
            <p className="m-0 flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="flex items-center gap-1.5 font-sans text-sm font-medium text-signal">
                <span className="h-1.5 w-1.5 flex-none bg-signal" aria-hidden="true" />
                Artikel terbit. ID: pub_8821a
              </span>
              <span className="font-mono text-[11px] text-paper-faint">portal-timur.lintasharian.com/laporan-kinerja-2026</span>
            </p>
          </div>
        </div>

        <div
          id="preview-panel-routing"
          role="tabpanel"
          aria-labelledby="preview-tab-routing"
          aria-hidden={activeTab !== 'routing'}
          className={`m-0 col-start-1 row-start-1 ${activeTab !== 'routing' ? 'invisible' : ''}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
            <span className="font-sans text-sm font-medium text-paper">Klasifikasi host eksak</span>
            <span className="font-mono text-[11px] text-paper-faint">Cache edge hangat</span>
          </div>
          <ul className="m-0 list-none p-0">
            {ROUTING_NODES.map((node) => (
              <li
                key={node.host}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hairline/60 px-5 py-3 last:border-b-0"
              >
                <span className="font-sans text-sm font-medium text-paper">{node.host}</span>
                <span className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-paper-faint">{node.siteId}</span>
                  <span className="tabular-nums text-paper-dim">{node.latency}</span>
                  <span className="flex items-center gap-1.5 text-signal">
                    <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
                    {node.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

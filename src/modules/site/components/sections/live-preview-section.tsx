'use client';

import { useState } from 'react';
import { Bot, Check, Globe, Terminal } from 'lucide-react';
import { useRovingSelection } from '@/ui/hooks/use-roving-selection';

const ROUTING_NODES = [
  { host: 'portal-alpha.web.id', siteId: 'site_alpha', status: 'ACTIVE', latency: '12ms' },
  { host: 'portal-beta.web.id', siteId: 'site_beta', status: 'ACTIVE', latency: '14ms' },
  { host: 'portal-gamma.web.id', siteId: 'site_gamma', status: 'ACTIVE', latency: '11ms' },
] as const;

type PreviewTab = 'dashboard' | 'telegram' | 'routing';

const TABS: readonly { readonly value: PreviewTab; readonly label: string }[] = [
  { value: 'dashboard', label: 'Dashboard Publish' },
  { value: 'telegram', label: 'Telegram Flow' },
  { value: 'routing', label: 'Host Resolver' },
];

const TAB_VALUES: readonly PreviewTab[] = TABS.map((tab) => tab.value);

/** Static preview tabs via colocated useState (no tab library in the landing bundle). */
export function LivePreviewSection() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('dashboard');
  const { register, tabIndexFor, onKeyDown } = useRovingSelection(TAB_VALUES, activeTab, setActiveTab);

  return (
    <div className="w-full border-t-2 border-hairline pt-5">
      <div className="w-full">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
              Pratinjau langsung
            </p>
            <h2 className="m-0 mt-2 font-sans text-lg font-semibold tracking-tight text-paper sm:text-xl">
              Satu perintah, tiga kanal terbit
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Pratinjau alur kerja"
            onKeyDown={onKeyDown}
            className="flex max-w-full flex-wrap gap-x-5 gap-y-1 border-b border-hairline"
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
                  className={`border-b-2 pb-2 font-mono text-xs transition-colors ${
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

        <div className="min-h-[200px] border border-hairline bg-bg-raised/40 p-4 font-mono text-xs text-paper-dim sm:p-5">
          <div
            id="preview-panel-dashboard"
            role="tabpanel"
            aria-labelledby="preview-tab-dashboard"
            hidden={activeTab !== 'dashboard'}
            className="m-0 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
              <span className="flex items-center gap-2 font-semibold text-paper">
                <Terminal className="h-4 w-4 text-brass" aria-hidden="true" />
                <span className="break-all">POST /api/dashboard/publishing</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-signal">
                200 OK
              </span>
            </div>

            <div className="grid gap-1.5 leading-relaxed">
              <p className="m-0">
                <span className="text-paper-faint">ORGANIZATION:</span>{' '}
                <span className="text-paper">Media Nusantara Group (org_01h8x)</span>
              </p>
              <p className="m-0">
                <span className="text-paper-faint">DOCUMENT:</span>{' '}
                <span className="text-paper">&quot;Laporan Kinerja Ekonomi Nasional 2026&quot;</span>
              </p>
              <p className="m-0">
                <span className="text-paper-faint">TARGET SITES:</span>{' '}
                <span className="text-brass-soft">portal-alpha.web.id, portal-beta.web.id, portal-gamma.web.id</span>
              </p>
              <p className="m-0 flex items-center gap-1.5 pt-1.5 text-signal">
                <Check className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                <span>Transaction committed: 3 edge invalidation tasks dispatched.</span>
              </p>
            </div>
          </div>

          <div
            id="preview-panel-telegram"
            role="tabpanel"
            aria-labelledby="preview-tab-telegram"
            hidden={activeTab !== 'telegram'}
            className="m-0 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
              <div className="flex items-center gap-2 text-paper">
                <Bot className="h-4 w-4 text-brass" aria-hidden="true" />
                <span className="font-semibold">Indicate Dispatcher Bot</span>
              </div>
              <span className="text-[11px] text-paper-faint">10:14:02 WIB</span>
            </div>

            <div className="space-y-2 border border-hairline p-3 text-paper">
              <div className="text-xs text-paper-dim">
                <span className="text-brass">INBOUND:</span> /publish #1092 --target=portal-alpha.web.id
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-signal">
                <Check className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                <span>Artikel berhasil dipublikasikan. ID: pub_8821a</span>
              </div>
              <div className="break-all font-mono text-[11px] text-paper-dim">
                <span className="text-paper-faint">ENDPOINT:</span>{' '}
                <span className="text-brass-soft underline decoration-hairline-strong underline-offset-2">
                  https://portal-alpha.web.id/articles/laporan-kinerja-2026
                </span>
              </div>
            </div>
          </div>

          <div
            id="preview-panel-routing"
            role="tabpanel"
            aria-labelledby="preview-tab-routing"
            hidden={activeTab !== 'routing'}
            className="m-0 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
              <span className="flex items-center gap-2 font-semibold text-paper">
                <Globe className="h-4 w-4 text-brass" aria-hidden="true" />
                <span>Exact Host Classification Matrix</span>
              </span>
              <span className="text-[11px] text-paper-faint">EDGE CACHE WARM</span>
            </div>

            <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline sm:grid-cols-3">
              {ROUTING_NODES.map((node) => (
                <div
                  key={node.host}
                  className="bg-bg p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-sans text-xs font-semibold text-paper">
                      {node.host}
                    </span>
                    <span className="flex-none text-[10px] text-signal">
                      ● {node.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-paper-faint">
                    <span>{node.siteId}</span>
                    <span className="tabular-nums text-brass-soft">{node.latency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

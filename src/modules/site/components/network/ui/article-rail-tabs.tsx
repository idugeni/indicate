'use client';

import { useState, type ReactNode } from 'react';

/**
 * Tab Terbaru dan Terpopuler untuk rail varian tabs.
 *
 * @param terbaru - Panel daftar terbaru (server).
 * @param terpopuler - Panel daftar terpopuler (server).
 * @returns Tablist dengan dua panel.
 */
export function RailTabs({ terbaru, terpopuler }: { readonly terbaru: ReactNode; readonly terpopuler: ReactNode }) {
  const [tab, setTab] = useState<'baru' | 'populer'>('baru');
  const tabs = [
    { id: 'baru' as const, label: 'Terbaru', panel: terbaru },
    { id: 'populer' as const, label: 'Terpopuler', panel: terpopuler },
  ];
  return (
    <section aria-label="Sorotan rail">
      <div role="tablist" aria-label="Pilih sorotan" className="grid grid-cols-2 gap-1 rounded-full bg-[var(--tpl-canvas,#f5f8fd)] p-1 ring-1 ring-[var(--tpl-ring,#e2e8f0)]">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`rail-panel-${item.id}`}
              id={`rail-tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`h-9 rounded-full font-sans text-sm transition-colors ${
                active
                  ? 'bg-[var(--tpl-primary,#1a5fd0)] font-bold text-white shadow-sm'
                  : 'font-medium text-[var(--tpl-muted,#475569)] hover:text-[var(--tpl-ink,#0f172a)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {tabs.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`rail-panel-${item.id}`}
          aria-labelledby={`rail-tab-${item.id}`}
          hidden={tab !== item.id}
          className="mt-4"
        >
          {tab === item.id ? item.panel : null}
        </div>
      ))}
    </section>
  );
}

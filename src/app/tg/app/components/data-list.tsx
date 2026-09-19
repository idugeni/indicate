'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { MiniAppPalette } from '@/app/tg/app/theme';

/**
 * Render a status value as a dot plus a sentence-case Indonesian label.
 *
 * @param value - Raw status string; matched case-insensitively.
 * @param theme - Palette supplying every color used.
 * @returns Inline dot-and-label marker.
 */
export function StatusDot({ value, theme }: { readonly value: string; readonly theme: MiniAppPalette }): ReactNode {
  const key = value.trim().toLowerCase();
  let color = theme.dim;
  let label = value;
  if (key === 'draft') {
    color = theme.dim;
    label = 'Draf';
  } else if (key === 'archived') {
    color = theme.dim;
    label = 'Diarsipkan';
  } else if (key === 'published' || key === 'live') {
    color = theme.ok;
    label = 'Tayang';
  } else if (key === 'success' || key === 'ok') {
    color = theme.ok;
    label = 'Berhasil';
  } else if (key === 'failed') {
    color = theme.danger;
    label = 'Gagal';
  } else if (key === 'queued') {
    color = theme.accent;
    label = 'Antre';
  } else if (key === 'running') {
    color = theme.accent;
    label = 'Berjalan';
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.dim }}>
      <span
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }}
      />
      {label}
    </span>
  );
}

export interface SearchListProps<T> {
  readonly items: readonly T[];
  readonly keyOf: (item: T) => string;
  readonly renderItem: (item: T) => ReactNode;
  readonly searchKeys: (item: T) => string;
  readonly placeholder?: string;
  readonly pageSize?: number;
  readonly emptyTitle: string;
  readonly emptyHint?: string;
  readonly emptyActionLabel?: string;
  readonly onEmptyAction?: () => void;
  readonly statusFilter?: {
    readonly label: string;
    readonly options: readonly { readonly value: string; readonly label: string }[];
    readonly getValue: (item: T) => string;
  };
  readonly theme: MiniAppPalette;
}

const ALL = 'all';

/**
 * Render a searchable, filterable, paginated ledger list for mini app tabs.
 *
 * @param props - Items, renderers, search configuration, and theme.
 * @returns Sticky search header with chips, ledger rows, and a load-more control.
 */
export function SearchList<T>({
  items,
  keyOf,
  renderItem,
  searchKeys,
  placeholder = 'Cari…',
  pageSize = 25,
  emptyTitle,
  emptyHint,
  emptyActionLabel,
  onEmptyAction,
  statusFilter,
  theme,
}: SearchListProps<T>): ReactNode {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>(ALL);
  const [visible, setVisible] = useState(pageSize);

  const updateQuery = (value: string): void => {
    setQuery(value);
    setVisible(pageSize);
  };
  const updateActive = (value: string): void => {
    setActive(value);
    setVisible(pageSize);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== undefined && active !== ALL && statusFilter.getValue(item) !== active) return false;
      if (needle === '') return true;
      return searchKeys(item).toLowerCase().includes(needle);
    });
  }, [items, query, active, statusFilter, searchKeys]);

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  const header: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: theme.bg,
    borderTop: `3px solid ${theme.accent}`,
    paddingTop: 10,
    paddingBottom: 8,
  };
  const searchBox: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: theme.card,
    color: theme.text,
    border: `1px solid ${theme.line}`,
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 14,
  };
  const chipRow: CSSProperties = { display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0 2px' };
  const chip = (selected: boolean): CSSProperties => ({
    flexShrink: 0,
    background: selected ? theme.accent : 'transparent',
    color: selected ? theme.bg : theme.dim,
    border: `1px solid ${selected ? theme.accent : theme.line}`,
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: selected ? 700 : 400,
  });
  const count: CSSProperties = { color: theme.dim, fontSize: 12, margin: '6px 0 0' };
  const row: CSSProperties = { borderBottom: `1px solid ${theme.line}`, padding: '12px 2px' };
  const more: CSSProperties = {
    display: 'block',
    width: '100%',
    marginTop: 12,
    background: 'transparent',
    color: theme.text,
    border: `1px solid ${theme.line}`,
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 14,
  };
  const empty: CSSProperties = { textAlign: 'center', padding: '32px 16px' };
  const emptyTitleStyle: CSSProperties = { fontSize: 15, fontWeight: 700, color: theme.text, margin: '0 0 4px' };
  const emptyHintStyle: CSSProperties = { fontSize: 13, color: theme.dim, margin: '0 0 12px' };
  const emptyAction: CSSProperties = {
    background: theme.accent,
    color: theme.bg,
    border: 'none',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 700,
  };

  return (
    <div>
      <div style={header}>
        <input
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder={placeholder}
          style={searchBox}
          type="search"
          aria-label={placeholder}
        />
        {statusFilter !== undefined && (
          <div style={chipRow} role="group" aria-label={statusFilter.label}>
            <button key={ALL} type="button" style={chip(active === ALL)} onClick={() => updateActive(ALL)}>
              Semua
            </button>
            {statusFilter.options.map((option) => (
              <button key={option.value} type="button" style={chip(active === option.value)} onClick={() => updateActive(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        )}
        <p style={count}>
          Menampilkan {shown.length} dari {filtered.length}
        </p>
      </div>
      {shown.length === 0 ? (
        <div style={empty}>
          <p style={emptyTitleStyle}>{emptyTitle}</p>
          {emptyHint !== undefined && <p style={emptyHintStyle}>{emptyHint}</p>}
          {emptyActionLabel !== undefined && onEmptyAction !== undefined && (
            <button type="button" style={emptyAction} onClick={onEmptyAction}>
              {emptyActionLabel}
            </button>
          )}
        </div>
      ) : (
        <div>
          {shown.map((item) => (
            <div key={keyOf(item)} style={row}>
              {renderItem(item)}
            </div>
          ))}
          {remaining > 0 && (
            <button type="button" style={more} onClick={() => setVisible((value) => value + pageSize)}>
              Muat lagi (sisa {remaining})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

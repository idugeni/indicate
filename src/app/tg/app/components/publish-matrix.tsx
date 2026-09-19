'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { MiniAppPalette } from '@/app/tg/app/theme';

export type PublishMatrixStatus = 'live' | 'failed' | 'queued';

export interface PublishMatrixArticle {
  readonly id: string;
  readonly title: string;
}

export interface PublishMatrixSite {
  readonly id: string;
  readonly hostname: string;
}

export interface PublishMatrixProps {
  readonly articles: readonly PublishMatrixArticle[];
  readonly sites: readonly PublishMatrixSite[];
  readonly cell: (articleId: string, siteId: string) => PublishMatrixStatus | null;
  readonly onSelectArticle?: (articleId: string) => void;
  readonly pageSize?: number;
  readonly theme: MiniAppPalette;
}

const TITLE_WIDTH = 200;
const SITE_WIDTH = 60;
const DOT = 10;

const STATUS_LABEL: Record<PublishMatrixStatus, string> = {
  live: 'Tayang',
  queued: 'Antre',
  failed: 'Gagal',
};

function shortHostname(hostname: string): string {
  const bare = (hostname.split(':')[0] ?? '').replace(/\.$/, '');
  const withoutWww = bare.startsWith('www.') ? bare.slice(4) : bare;
  const first = withoutWww.split('.')[0] ?? '';
  return first !== '' ? first : hostname;
}

/**
 * Render the newsroom publish-status matrix: article rows against site columns.
 *
 * @param props - Articles, sites, per-cell status reader, optional row picker, page size, and theme.
 * @returns Masthead with summary, one-line legend, sticky-title grid, and a load-more control.
 */
export function PublishMatrix({ articles, sites, cell, onSelectArticle, pageSize = 20, theme }: PublishMatrixProps): ReactNode {
  const [pagination, setPagination] = useState({ pages: 1, articles, sites, pageSize });
  if (pagination.articles !== articles || pagination.sites !== sites || pagination.pageSize !== pageSize) {
    setPagination({ pages: 1, articles, sites, pageSize });
  }

  const shown = articles.slice(0, pagination.pages * pageSize);
  const remaining = articles.length - shown.length;

  const counts = useMemo(() => {
    let live = 0;
    let queued = 0;
    let failed = 0;
    for (const article of shown) {
      for (const site of sites) {
        const status = cell(article.id, site.id);
        if (status === 'live') live += 1;
        else if (status === 'queued') queued += 1;
        else if (status === 'failed') failed += 1;
      }
    }
    return { live, queued, failed };
  }, [shown, sites, cell]);

  const masthead: CSSProperties = {
    borderTop: `3px solid ${theme.accent}`,
    borderBottom: `1px solid ${theme.line}`,
    paddingTop: 10,
    paddingBottom: 8,
  };
  const title: CSSProperties = { color: theme.text, fontSize: 15, fontWeight: 700, margin: 0 };
  const summary: CSSProperties = { color: theme.dim, fontSize: 12, margin: '4px 0 0' };
  const legend: CSSProperties = {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    padding: '8px 0 2px',
    color: theme.dim,
    fontSize: 12,
  };
  const legendItem: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 };
  const scroller: CSSProperties = {
    overflowX: 'auto',
    background: theme.card,
    border: `1px solid ${theme.line}`,
    borderRadius: 6,
    marginTop: 8,
  };
  const table: CSSProperties = { borderCollapse: 'collapse', width: '100%', minWidth: TITLE_WIDTH + sites.length * SITE_WIDTH };
  const corner: CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: 2,
    background: theme.card,
    color: theme.dim,
    fontSize: 12,
    fontWeight: 400,
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: `1px solid ${theme.line}`,
    borderRight: `1px solid ${theme.line}`,
    minWidth: TITLE_WIDTH,
    maxWidth: TITLE_WIDTH,
  };
  const siteHead: CSSProperties = {
    color: theme.dim,
    fontSize: 11,
    fontWeight: 400,
    textAlign: 'center',
    padding: '10px 4px',
    borderBottom: `1px solid ${theme.line}`,
    width: SITE_WIDTH,
    minWidth: SITE_WIDTH,
    maxWidth: SITE_WIDTH,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  const rowTitleCell: CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: 1,
    background: theme.card,
    padding: '10px 12px',
    borderBottom: `1px solid ${theme.line}`,
    borderRight: `1px solid ${theme.line}`,
    minWidth: TITLE_WIDTH,
    maxWidth: TITLE_WIDTH,
  };
  const rowTitleText: CSSProperties = {
    display: 'block',
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.text,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'left',
  };
  const rowTitleButton: CSSProperties = { ...rowTitleText, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' };
  const dotCell: CSSProperties = {
    textAlign: 'center',
    padding: '10px 4px',
    borderBottom: `1px solid ${theme.line}`,
    width: SITE_WIDTH,
    minWidth: SITE_WIDTH,
  };
  const count: CSSProperties = { color: theme.dim, fontSize: 12, margin: '8px 0 0' };
  const more: CSSProperties = {
    display: 'block',
    width: '100%',
    marginTop: 8,
    background: 'transparent',
    color: theme.text,
    border: `1px solid ${theme.line}`,
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 14,
  };
  const empty: CSSProperties = { color: theme.dim, fontSize: 13, padding: '20px 4px', margin: 0 };

  return (
    <div>
      <div style={masthead}>
        <p style={title}>Peta tayang</p>
        <p style={summary}>
          {counts.live} tayang, {counts.queued} antre, {counts.failed} gagal
        </p>
        <div style={legend}>
          {(Object.keys(STATUS_LABEL) as readonly PublishMatrixStatus[]).map((status) => (
            <span key={status} style={legendItem}>
              <span aria-hidden="true" style={dot(status, theme)} />
              {STATUS_LABEL[status]}
            </span>
          ))}
          <span style={legendItem}>
            <span aria-hidden="true" style={dot(null, theme)} />
            Belum
          </span>
        </div>
      </div>
      {articles.length === 0 ? (
        <p style={empty}>Belum ada artikel.</p>
      ) : sites.length === 0 ? (
        <p style={empty}>Belum ada situs.</p>
      ) : (
        <div style={scroller}>
          <table style={table} aria-label="Peta tayang artikel per situs">
            <thead>
              <tr>
                <th scope="col" style={corner}>
                  Artikel
                </th>
                {sites.map((site) => (
                  <th key={site.id} scope="col" title={site.hostname} style={siteHead}>
                    {shortHostname(site.hostname)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((article) => (
                <tr key={article.id}>
                  <th scope="row" style={rowTitleCell}>
                    {onSelectArticle === undefined ? (
                      <span style={rowTitleText}>{article.title}</span>
                    ) : (
                      <button type="button" style={rowTitleButton} onClick={() => onSelectArticle(article.id)} aria-label={`Buka ${article.title}`}>
                        {article.title}
                      </button>
                    )}
                  </th>
                  {sites.map((site) => {
                    const status = cell(article.id, site.id);
                    return (
                      <td key={site.id} style={dotCell}>
                        <span role="img" aria-label={status === null ? 'Belum tayang' : STATUS_LABEL[status]} title={status === null ? 'Belum tayang' : STATUS_LABEL[status]} style={dot(status, theme)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {articles.length > 0 && sites.length > 0 && (
        <p style={count}>
          Menampilkan {shown.length} dari {articles.length} artikel
        </p>
      )}
      {remaining > 0 && (
        <button type="button" style={more} onClick={() => setPagination((value) => ({ ...value, pages: value.pages + 1 }))}>
          Muat lagi (sisa {remaining})
        </button>
      )}
    </div>
  );
}

function dot(status: PublishMatrixStatus | null, theme: MiniAppPalette): CSSProperties {
  if (status === 'live') return { display: 'inline-block', width: DOT, height: DOT, borderRadius: DOT / 2, background: theme.ok, flexShrink: 0 };
  if (status === 'failed') return { display: 'inline-block', width: DOT, height: DOT, borderRadius: DOT / 2, background: theme.danger, flexShrink: 0 };
  if (status === 'queued') return { display: 'inline-block', width: DOT, height: DOT, borderRadius: DOT / 2, background: theme.accent, flexShrink: 0 };
  return {
    display: 'inline-block',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    background: 'transparent',
    border: `1px solid ${theme.dim}`,
    opacity: 0.45,
    boxSizing: 'border-box',
    flexShrink: 0,
  };
}

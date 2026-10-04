'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Inbox, Loader2, Send } from 'lucide-react';

import type { DashboardCommand } from '@/modules/dashboard/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface InboxRow {
  readonly organizationId: string;
  readonly orgSlug: string;
  readonly orgName: string;
  readonly articleId: string;
  readonly slug: string;
  readonly title: string;
  readonly status: string;
  readonly publisherLabel: string | null;
  readonly regionSlug: string | null;
  readonly updatedAt: string;
}

function asInboxRows(value: unknown): readonly InboxRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is InboxRow => {
    if (typeof item !== 'object' || item === null) return false;
    const row = item as Record<string, unknown>;
    return typeof row.organizationId === 'string'
      && typeof row.articleId === 'string'
      && typeof row.title === 'string'
      && typeof row.orgName === 'string';
  });
}

/**
 * Kotak masuk draf humas untuk steward platform.
 *
 * @param command - Dispatcher perintah dasbor (`article.inbox.list`, `article.bridge.requestAuto`).
 * @returns Seksi draf UPT menunggu tayang, atau null bila kosong/bukan steward.
 * @remarks Humas menulis di org sendiri yang tanpa situs, sehingga drafnya tak
 * pernah masuk antrean operator. Seksi ini memberi admin visibilitas lintas-org
 * plus satu tombol tayang ke portal kota asal per baris. Non-steward mendapat
 * denial (diabaikan diam-diam) sehingga seksi tetap tersembunyi untuk mereka.
 */
export function ForOrgInbox({ command }: { readonly command?: DashboardCommand | undefined }) {
  const [rows, setRows] = useState<readonly InboxRow[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (command === undefined) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await command('article.inbox.list', {});
        if (!cancelled) setRows(asInboxRows(result));
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [command]);

  if (rows.length === 0) return null;

  const publish = async (row: InboxRow) => {
    if (command === undefined || busyKey !== null) return;
    const key = `${row.organizationId}:${row.articleId}`;
    setBusyKey(key);
    try {
      const result = (await command('article.bridge.requestAuto', {
        ownerOrganizationId: row.organizationId,
        articleId: row.articleId,
      })) as { readonly siteCount?: unknown } | null;
      if (result === null) return;
      const count = typeof result.siteCount === 'number' ? result.siteCount : 0;
      setRows((prev) => prev.filter((candidate) => candidate.articleId !== row.articleId));
      toast.success(`Tayang ke ${count.toLocaleString('id-ID')} portal untuk ${row.orgName}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menerbitkan dari kotak masuk.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section aria-label="Kotak masuk UPT" className="space-y-3 rounded-lg border border-hairline bg-bg-raised p-4">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-brass" aria-hidden="true" />
        <h3 className="m-0 font-mono text-xs font-bold uppercase tracking-wider text-paper">
          Kotak masuk UPT ({rows.length})
        </h3>
      </div>
      <p className="m-0 font-mono text-[11px] leading-relaxed text-paper-faint">
        Draf humas dari organisasinya masing-masing. Tayangkan untuk menerbitkannya ke portal kota asalnya.
      </p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((row) => {
          const key = `${row.organizationId}:${row.articleId}`;
          const busy = busyKey === key;
          return (
            <li key={key} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded border border-hairline bg-bg px-3 py-2">
              <div className="grid min-w-0 flex-1 gap-0.5">
                <p className="m-0 truncate font-sans text-sm font-bold text-paper">{row.title}</p>
                <p className="m-0 truncate font-mono text-[11px] text-paper-faint">
                  {row.orgName}
                  {row.publisherLabel === null || row.publisherLabel === '' ? '' : ` · ${row.publisherLabel}`}
                  {` · ${row.status}`}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[11px]">{row.orgSlug}</Badge>
              <Button type="button" size="sm" disabled={command === undefined || busyKey !== null} onClick={() => void publish(row)} className="gap-1.5">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                {busy ? 'Menayangkan…' : 'Tayangkan'}
              </Button>
            </li>
          );
        })}
      </ul>
      <Separator />
    </section>
  );
}

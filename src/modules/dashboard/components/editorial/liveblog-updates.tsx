'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DashboardCommand } from '@/modules/dashboard/command';
import type { ArticleUpdateRecord } from '@/modules/dashboard/models';

const BODY_MAX = 20000;

function asUpdates(value: unknown): readonly ArticleUpdateRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ArticleUpdateRecord =>
    typeof item === 'object' && item !== null && typeof (item as { readonly id?: unknown }).id === 'string',
  );
}

/**
 * Kelola entri pembaruan langsung milik satu artikel mode liveblog.
 *
 * @param articleId - Artikel induk; harus mode liveblog di server.
 * @param articleTitle - Judul untuk label aksesibel.
 * @param command - Dispatcher perintah dasbor ke API.
 * @param ownerOrganizationId - Org pemilik untuk steward lintas-org; tanpa ini jalur satu-org yang dipakai.
 * @returns Panel daftar, tambah, ubah, dan hapus entri.
 */
export function LiveblogUpdates({
  articleId,
  articleTitle,
  command,
  ownerOrganizationId,
}: {
  readonly articleId: string;
  readonly articleTitle: string;
  readonly command: DashboardCommand;
  readonly ownerOrganizationId?: string | undefined;
}) {
  const draftId = useId();
  const [updates, setUpdates] = useState<readonly ArticleUpdateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const ownerPayload = useMemo(
    () => (ownerOrganizationId === undefined || ownerOrganizationId === '' ? {} : { ownerOrganizationId }),
    [ownerOrganizationId],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await command('article.updates.list', { articleId, ...ownerPayload });
      if (result === null) return;
      setUpdates(asUpdates(result));
    } catch {
      setError('Gagal memuat pembaruan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [command, articleId, ownerPayload]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await command('article.updates.list', { articleId, ...ownerPayload });
        if (cancelled || result === null) return;
        setUpdates(asUpdates(result));
      } catch {
        if (!cancelled) setError('Gagal memuat pembaruan. Coba lagi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [command, articleId, ownerPayload]);

  const mutate = async (run: () => Promise<unknown>, after: () => void): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await run();
      if (result === null) return;
      after();
      await reload();
    } catch {
      setError('Permintaan gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const body = draft.trim();
    if (body === '') {
      setError('Isi pembaruan masih kosong.');
      return;
    }
    void mutate(
      () => command('article.updates.create', { articleId, body, ...ownerPayload }, { refresh: true }),
      () => setDraft(''),
    );
  };

  const saveEdit = (entry: ArticleUpdateRecord) => {
    const body = editBody.trim();
    if (body === '') {
      setError('Isi pembaruan masih kosong.');
      return;
    }
    void mutate(
      () => command('article.updates.update', { id: entry.id, expectedVersion: entry.version, body, ...ownerPayload }, { refresh: true }),
      () => setEditingId(null),
    );
  };

  const remove = (entry: ArticleUpdateRecord) => {
    void mutate(
      () => command('article.updates.delete', { id: entry.id, expectedVersion: entry.version, ...ownerPayload }, { refresh: true }),
      () => setConfirmingId(null),
    );
  };

  return (
    <section aria-label={`Pembaruan langsung ${articleTitle}`} className="mt-3 space-y-3 rounded border border-hairline bg-bg p-3">
      <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper">
        Pembaruan langsung · {updates.length} entri
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={draftId} className="font-mono text-xs text-paper-dim">
          Pembaruan baru (baris pertama jadi judul)
        </Label>
        <Textarea
          id={draftId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="cth: Gol pembuka — skor berubah 1-0."
          disabled={busy}
          maxLength={BODY_MAX}
          rows={3}
          className="font-sans text-xs"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] tabular-nums text-paper-faint">{draft.trim().length}/{BODY_MAX}</span>
          <Button type="button" size="xs" disabled={busy || draft.trim() === ''} onClick={add}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
            Tambah pembaruan
          </Button>
        </div>
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {loading ? (
        <p className="m-0 font-mono text-[11px] text-paper-faint">Memuat pembaruan…</p>
      ) : updates.length === 0 ? (
        <p className="m-0 font-sans text-xs text-paper-dim">Belum ada pembaruan. Tambahkan yang pertama di atas.</p>
      ) : (
        <ol className="m-0 list-none space-y-2 p-0">
          {updates.map((entry, index) => (
            <li key={entry.id} className="rounded border border-hairline bg-bg-raised p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] tabular-nums text-paper-faint">
                  #{updates.length - index} · {entry.publishedAt === null ? entry.updatedAt : entry.publishedAt}
                </span>
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(entry.id);
                      setEditBody(entry.body);
                      setConfirmingId(null);
                    }}
                    aria-label={`Ubah pembaruan ${entry.id}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  {confirmingId === entry.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={busy}
                      className="text-destructive"
                      onClick={() => remove(entry)}
                    >
                      {busy ? 'Menghapus…' : 'Ya, hapus'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      className="text-paper-dim hover:text-destructive"
                      onClick={() => {
                        setConfirmingId(entry.id);
                        setEditingId(null);
                      }}
                      aria-label={`Hapus pembaruan ${entry.id}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </span>
              </div>
              {editingId === entry.id ? (
                <div className="mt-1.5 space-y-1.5">
                  <Textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    disabled={busy}
                    maxLength={BODY_MAX}
                    rows={3}
                    aria-label={`Isi pembaruan ${entry.id}`}
                    className="font-sans text-xs"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button type="button" size="xs" disabled={busy || editBody.trim() === ''} onClick={() => saveEdit(entry)}>
                      Simpan
                    </Button>
                    <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={() => setEditingId(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="m-0 mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-paper">{entry.body}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

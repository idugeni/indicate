'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageIcon, Info, LayoutTemplate, Loader2, Phone, RefreshCw, Search, Star, Trash2 } from 'lucide-react';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppTooltip } from '@/ui/app-tooltip';

type FieldKind = 'text' | 'textarea' | 'number' | 'checkbox' | 'json' | 'color';
interface FieldDef { readonly key: string; readonly label: string; readonly kind: FieldKind; readonly required?: boolean }
interface TypeDef {
  readonly kind: string;
  readonly label: string;
  readonly idKey: string;
  /** Field that reads as the row's human title in the editor card header. */
  readonly titleKey: string;
  readonly fields: readonly FieldDef[];
  readonly newRow: () => Record<string, unknown>;
}

const TYPES: readonly TypeDef[] = Object.freeze([
  {
    kind: 'testimonial', label: 'Testimoni', idKey: 'id', titleKey: 'author',
    fields: [
      { key: 'quote', label: 'Kutipan', kind: 'textarea', required: true },
      { key: 'author', label: 'Penulis', kind: 'text', required: true },
      { key: 'role', label: 'Peran', kind: 'text', required: true },
      { key: 'media', label: 'Media', kind: 'text', required: true },
      { key: 'sortOrder', label: 'Urutan', kind: 'number', required: true },
      { key: 'active', label: 'Aktif', kind: 'checkbox' },
    ],
    newRow: () => ({ id: crypto.randomUUID(), quote: '', author: '', role: '', media: '', sortOrder: 99, active: true }),
  },
  {
    kind: 'faq', label: 'FAQ', idKey: 'id', titleKey: 'question',
    fields: [
      { key: 'question', label: 'Pertanyaan', kind: 'textarea', required: true },
      { key: 'answer', label: 'Jawaban', kind: 'textarea', required: true },
      { key: 'category', label: 'Topik', kind: 'text', required: true },
      { key: 'sortOrder', label: 'Urutan', kind: 'number', required: true },
      { key: 'active', label: 'Aktif', kind: 'checkbox' },
    ],
    newRow: () => ({ id: crypto.randomUUID(), question: '', answer: '', category: 'Umum', sortOrder: 99, active: true }),
  },
  {
    kind: 'showcase', label: 'Etalase Media', idKey: 'id', titleKey: 'name',
    fields: [
      { key: 'name', label: 'Nama', kind: 'text', required: true },
      { key: 'sortOrder', label: 'Urutan', kind: 'number', required: true },
      { key: 'active', label: 'Aktif', kind: 'checkbox' },
    ],
    newRow: () => ({ id: crypto.randomUUID(), name: '', sortOrder: 99, active: true }),
  },
  {
    kind: 'channel', label: 'Kanal Kontak', idKey: 'key', titleKey: 'title',
    fields: [
      { key: 'key', label: 'Kunci', kind: 'text', required: true },
      { key: 'title', label: 'Judul', kind: 'text', required: true },
      { key: 'description', label: 'Deskripsi', kind: 'textarea', required: true },
      { key: 'href', label: 'Tautan (opsional)', kind: 'text' },
      { key: 'sortOrder', label: 'Urutan', kind: 'number', required: true },
    ],
    newRow: () => ({ key: '', title: '', description: '', href: '', sortOrder: 99 }),
  },
  {
    kind: 'template', label: 'Preset Template', idKey: 'id', titleKey: 'name',
    fields: [
      { key: 'id', label: 'ID', kind: 'text', required: true },
      { key: 'name', label: 'Nama', kind: 'text', required: true },
      { key: 'description', label: 'Deskripsi', kind: 'textarea', required: true },
      { key: 'category', label: 'Kategori', kind: 'text', required: true },
    ],
    newRow: () => ({ id: '', name: '', description: '', category: 'news' }),
  },
]);

const KIND_ICONS: Readonly<Record<string, typeof Star>> = {
  testimonial: Star,
  faq: Info,
  showcase: ImageIcon,
  channel: Phone,
  template: LayoutTemplate,
};

type Row = Record<string, unknown>;
interface ContentBundle {
  readonly quotes: readonly Row[]; readonly faqRows: readonly Row[];
  readonly showcase: readonly Row[]; readonly channels: readonly Row[];
  readonly templates: readonly Row[];
}
const BUNDLE_KEY: Record<string, keyof ContentBundle> = {
  testimonial: 'quotes', faq: 'faqRows', showcase: 'showcase',
  channel: 'channels', template: 'templates',
};

function toFieldValue(def: FieldDef, row: Row): string | boolean {
  const value = row[def.key];
  if (def.kind === 'checkbox') return value === true;
  if (def.kind === 'number') return typeof value === 'number' ? String(value) : '';
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').join('\n');
  if (value === null || value === undefined) return '';
  return String(value);
}

function fromFieldValue(def: FieldDef, raw: string | boolean): unknown {
  if (def.kind === 'checkbox') return raw === true;
  if (def.kind === 'number') return Number(raw);
  if (typeof raw === 'string' && raw === '' && !def.required) return null;
  return raw;
}

export function ContentManager() {
  const [activeKind, setActiveKind] = useState<string>(TYPES[0]!.kind);
  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  const [drafts, setDrafts] = useState<Readonly<Record<string, Row>>>({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  /** Baris yang sedang menyimpan/menghapus; baris lain tetap bisa diklik. */
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const requestSeq = useRef(0);
  const reload = useCallback(async () => {
    const seq = ++requestSeq.current;
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/dashboard/content');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as ContentBundle;
      if (seq !== requestSeq.current) return;
      setBundle(body); setDrafts({});
    } catch {
      if (seq !== requestSeq.current) return;
      setError('Gagal memuat konten website.');
    } finally {
      if (seq === requestSeq.current) setBusy(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => reload()); }, [reload]);

  const post = useCallback(async (action: string, payload: Record<string, unknown>, rowKey: string) => {
    setBusyRow(rowKey);
    setError(null); setNotice(null);
    try {
      const response = await fetch('/api/dashboard/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNotice('Tersimpan.');
      await reload();
    } catch {
      setError('Penyimpanan gagal. Periksa hak akses platform Anda.');
    } finally {
      setBusyRow((prev) => (prev === rowKey ? null : prev));
    }
  }, [reload]);

  const rowsFor = (kind: string): readonly Row[] => {
    const type = TYPES.find((t) => t.kind === kind) ?? TYPES[0]!;
    return bundle === null ? [] : (bundle[BUNDLE_KEY[type.kind]!] ?? []);
  };
  const visibleRowsFor = (type: TypeDef): readonly Row[] => {
    const needle = search.trim().toLowerCase();
    if (needle === '') return rowsFor(type.kind);
    return rowsFor(type.kind).filter((row) =>
      type.fields.some((field) => String(toFieldValue(field, row) ?? '').toLowerCase().includes(needle)),
    );
  };
  /** Human title for the editor card; the row id stays on the line below it. */
  const titleFor = (type: TypeDef, row: Row): string => {
    const value = row[type.titleKey];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : 'Tanpa judul';
  };
  const getDraftFor = (kind: string, idKey: string, row: Row): Row =>
    drafts[`${kind}:${String(row[idKey])}`] ?? row;
  const setDraftFor = (kind: string, idKey: string, row: Row, key: string, value: string | boolean) => {
    const id = `${kind}:${String(row[idKey])}`;
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? row), [key]: value } }));
  };

  const saveRowFor = (type: TypeDef, row: Row) => {
    const current = getDraftFor(type.kind, type.idKey, row);
    const payload: Record<string, unknown> = {};
    for (const field of type.fields) payload[field.key] = fromFieldValue(field, toFieldValue(field, current));
    void post(`${type.kind}.save`, { row: payload }, `${type.kind}:${String(row[type.idKey])}`);
  };

  return (
    <Tabs value={activeKind} onValueChange={setActiveKind} className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <TabsList aria-label="Jenis konten website" className="max-w-full flex-1 overflow-x-auto overflow-y-clip">
          {TYPES.map((t) => {
            const KindIcon = KIND_ICONS[t.kind];
            return (
              <TabsTrigger key={t.kind} value={t.kind} className="flex-none">
                {KindIcon ? <KindIcon className="h-3.5 w-3.5 text-brass" aria-hidden="true" /> : null}
                {t.label}
                <span className="ml-1.5 rounded bg-bg px-1 font-mono text-[10px] tabular-nums text-paper-dim">{rowsFor(t.kind).length.toLocaleString('id-ID')}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <Button type="button" variant="ghost" size="xs" onClick={() => void reload()} disabled={busy} className="flex-none text-paper-dim hover:text-paper">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Muat ulang
        </Button>
      </div>
      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}
      {TYPES.map((t) => {
        const total = rowsFor(t.kind);
        const typeRows = visibleRowsFor(t);
        return (
          <TabsContent key={t.kind} value={t.kind} className="mt-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 max-w-xs flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-paper-dim" aria-hidden="true" />
                <Input
                  value={search}
                  disabled={busy}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Cari ${t.label.toLowerCase()}…`}
                  aria-label={`Cari ${t.label}`}
                  className="h-9 rounded-md border-hairline-strong bg-bg pr-3 pl-9 font-mono text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>
              <span className="font-mono text-[11px] tabular-nums text-paper-faint">
                {typeRows.length.toLocaleString('id-ID')} dari {total.length.toLocaleString('id-ID')} baris
              </span>
            </div>
            {typeRows.length === 0 ? (
              <EmptyState
                compact
                className="mt-3"
                title={
                  total.length === 0
                    ? `Belum ada baris ${t.label.toLowerCase()} di situs publik.`
                    : `Tidak ada baris ${t.label.toLowerCase()} yang cocok dengan pencarian.`
                }
              />
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {typeRows.map((row) => {
                  const current = getDraftFor(t.kind, t.idKey, row);
                  const rowId = String(row[t.idKey]);
                  const rowKey = `${t.kind}:${rowId}`;
                  const rowBusy = busy || busyRow === rowKey;
                  return (
                    <section key={rowId} aria-label={titleFor(t, row)} className="rounded-lg border border-hairline bg-bg-raised p-3.5 transition duration-150 hover:border-hairline-strong">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="m-0 min-w-0 flex-1 truncate font-sans text-xs font-medium text-paper">
                          <AppTooltip label={titleFor(t, row)} side="top">
                            <span className="block truncate">{titleFor(t, row)}</span>
                          </AppTooltip>
                        </p>
                        <p className="m-0 flex-none truncate font-mono text-[10px] tabular-nums text-paper-faint">
                          <AppTooltip label={rowId} side="top">
                            <span className="block truncate">{rowId}</span>
                          </AppTooltip>
                        </p>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {t.fields.map((field) => (
                          <Label key={field.key} className={field.kind === 'textarea' ? 'block sm:col-span-2' : 'block'}>
                            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-paper-dim">{field.label}</span>
                            {field.kind === 'checkbox' ? (
                              <Checkbox checked={toFieldValue(field, current) === true} onCheckedChange={(checked) => setDraftFor(t.kind, t.idKey, row, field.key, checked)} />
                            ) : field.kind === 'textarea' ? (
                              <Textarea value={String(toFieldValue(field, current))} onChange={(e) => setDraftFor(t.kind, t.idKey, row, field.key, e.target.value)} rows={3} className="font-sans text-xs" />
                            ) : (
                              <Input type={field.kind === 'color' ? 'text' : field.kind} value={String(toFieldValue(field, current) ?? '')} onChange={(e) => setDraftFor(t.kind, t.idKey, row, field.key, e.target.value)} className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-sans text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass" />
                            )}
                          </Label>
                        ))}
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Button type="button" size="sm" variant="default" disabled={rowBusy} onClick={() => saveRowFor(t, row)}>
                          {busyRow === rowKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                          Simpan
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={rowBusy} onClick={() => post('row.delete', { kind: t.kind, id: rowId }, rowKey)}>
                          {busyRow === rowKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />} Hapus
                        </Button>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </TabsContent>
        );
      })}
      <p className="m-0 font-sans text-[11px] text-paper-faint">
        Ubah ID untuk menduplikasi sebagai baris baru. Perubahan tayang segera setelah disimpan.
      </p>
    </Tabs>
  );
}

export default ContentManager;

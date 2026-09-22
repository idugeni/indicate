'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FieldKind = 'text' | 'textarea' | 'number' | 'checkbox' | 'json' | 'color';
interface FieldDef { readonly key: string; readonly label: string; readonly kind: FieldKind; readonly required?: boolean }
interface TypeDef {
  readonly kind: string;
  readonly label: string;
  readonly idKey: string;
  readonly fields: readonly FieldDef[];
  readonly newRow: () => Record<string, unknown>;
}

const TYPES: readonly TypeDef[] = Object.freeze([
  {
    kind: 'testimonial', label: 'Testimoni', idKey: 'id',
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
    kind: 'faq', label: 'FAQ', idKey: 'id',
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
    kind: 'showcase', label: 'Etalase Media', idKey: 'id',
    fields: [
      { key: 'name', label: 'Nama', kind: 'text', required: true },
      { key: 'sortOrder', label: 'Urutan', kind: 'number', required: true },
      { key: 'active', label: 'Aktif', kind: 'checkbox' },
    ],
    newRow: () => ({ id: crypto.randomUUID(), name: '', sortOrder: 99, active: true }),
  },
  {
    kind: 'channel', label: 'Kanal Kontak', idKey: 'key',
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
    kind: 'template', label: 'Preset Template', idKey: 'id',
    fields: [
      { key: 'id', label: 'ID', kind: 'text', required: true },
      { key: 'name', label: 'Nama', kind: 'text', required: true },
      { key: 'description', label: 'Deskripsi', kind: 'textarea', required: true },
      { key: 'category', label: 'Kategori', kind: 'text', required: true },
    ],
    newRow: () => ({ id: '', name: '', description: '', category: 'news' }),
  },
]);

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/dashboard/content', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as ContentBundle;
      setBundle(body); setDrafts({});
    } catch {
      setError('Gagal memuat konten website.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => reload()); }, [reload]);

  const post = useCallback(async (action: string, payload: Record<string, unknown>) => {
    setBusy(true); setError(null); setNotice(null);
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
      setBusy(false);
    }
  }, [reload]);

  const rowsFor = (kind: string): readonly Row[] => {
    const type = TYPES.find((t) => t.kind === kind) ?? TYPES[0]!;
    return bundle === null ? [] : (bundle[BUNDLE_KEY[type.kind]!] ?? []);
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
    void post(`${type.kind}.save`, { row: payload });
  };

  return (
    <Tabs value={activeKind} onValueChange={setActiveKind} className="w-full space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <TabsList aria-label="Jenis konten website" className="max-w-full flex-1 overflow-x-auto overflow-y-clip">
          {TYPES.map((t) => (
            <TabsTrigger key={t.kind} value={t.kind} className="flex-none">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button type="button" variant="ghost" size="xs" onClick={() => void reload()} disabled={busy} className="flex-none text-paper-dim hover:text-paper">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Muat ulang
        </Button>
      </div>
      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}
      {TYPES.map((t) => {
        const typeRows = rowsFor(t.kind);
        return (
          <TabsContent keepMounted key={t.kind} value={t.kind} className="mt-0">
            <div className="grid gap-4 md:grid-cols-2">
              {typeRows.map((row) => {
                const current = getDraftFor(t.kind, t.idKey, row);
                return (
                  <section key={String(row[t.idKey])} aria-label={String(row[t.idKey])} className="rounded-lg border border-hairline bg-bg-raised p-4 sm:p-5">
                    <p className="m-0 truncate font-mono text-xs tabular-nums text-paper-dim">{String(row[t.idKey])}</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {t.fields.map((field) => (
                        <Label key={field.key} className={field.kind === 'textarea' ? 'block sm:col-span-2' : 'block'}>
                          <span className="mb-1.5 block font-sans text-xs font-medium text-paper-dim">{field.label}</span>
                          {field.kind === 'checkbox' ? (
                            <Checkbox checked={toFieldValue(field, current) === true} onCheckedChange={(checked) => setDraftFor(t.kind, t.idKey, row, field.key, checked)} />
                          ) : field.kind === 'textarea' ? (
                            <Textarea value={String(toFieldValue(field, current))} onChange={(e) => setDraftFor(t.kind, t.idKey, row, field.key, e.target.value)} rows={3} className="font-sans text-xs" />
                          ) : (
                            <Input type={field.kind === 'color' ? 'text' : field.kind} value={String(toFieldValue(field, current) ?? '')} onChange={(e) => setDraftFor(t.kind, t.idKey, row, field.key, e.target.value)} className="font-sans text-xs" />
                          )}
                        </Label>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button type="button" variant="default" disabled={busy} onClick={() => saveRowFor(t, row)} className="w-full sm:w-auto">
                        Simpan
                      </Button>
                      <Button type="button" variant="outline" disabled={busy} onClick={() => post('row.delete', { kind: t.kind, id: String(row[t.idKey]) })} className="w-full sm:w-auto">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Hapus
                      </Button>
                    </div>
                  </section>
                );
              })}
            </div>
          </TabsContent>
        );
      })}
      <p className="m-0 font-sans text-xs text-paper-faint">
        Ubah ID untuk menduplikasi sebagai baris baru. Perubahan tayang segera setelah disimpan.
      </p>
    </Tabs>
  );
}

export default ContentManager;

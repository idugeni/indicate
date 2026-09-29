'use client';

import { useId, useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callAi } from '@/modules/ai/components/ai-client';

interface SemanticHit {
  readonly id: string;
  readonly article_id: string | null;
  readonly excerpt: string;
}

/**
 * Mencari arsip lewat indeks semantik dengan batas 20 hasil.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @returns Kolom pencarian semantik arsip.
 */
export function AiArchiveSearch({ organizationId }: { readonly organizationId?: string | undefined }) {
  const queryId = useId();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hits, setHits] = useState<readonly SemanticHit[]>([]);
  const disabled = busy || organizationId === undefined || organizationId === '' || query.trim().length < 3;

  const run = async () => {
    if (organizationId === undefined || organizationId === '') return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = (await callAi(organizationId, 'semantic-search', { query })) as {
        readonly results?: readonly SemanticHit[];
        readonly note?: string;
      };
      setHits((result.results ?? []).slice(0, 20));
      if (typeof result.note === 'string') setNote(result.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={queryId} className="font-sans text-xs text-paper-dim">Pencarian semantik (indeks embedding, maks 20)</label>
      <div className="flex gap-1.5">
        <Input
          id={queryId} value={query} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void run(); } }}
          placeholder="makna, bukan sekadar kata kunci…" maxLength={200} disabled={busy} className="h-8 font-sans text-xs"
        />
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()} className="flex-none">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{busy ? 'Mencari…' : 'Cari'}</span>
        </Button>
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {note !== null ? <p className="m-0 font-sans text-[11px] text-paper-faint">{note}</p> : null}
      {hits.length > 0 ? (
        <ul className="m-0 list-none space-y-1 p-0">
          {hits.map((hit) => (
            <li key={hit.id} className="rounded border border-hairline px-2 py-1.5">
              <p className="m-0 font-mono text-[10px] text-paper-faint">{hit.article_id ?? hit.id}</p>
              <p className="m-0 mt-0.5 font-sans text-xs text-paper-dim">{hit.excerpt}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

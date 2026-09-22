'use client';

import { useId, useState, type FormEvent } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { TemplateButton, TemplateInput, TemplateLabel, TemplateMenuSelect, TemplateNotice, TemplateTextarea } from '@/modules/site/components/network/ui/field';

const CATEGORIES = [
  { value: 'copyright', label: 'Pelanggaran hak cipta' },
  { value: 'defamation', label: 'Pencemaran nama baik' },
  { value: 'privacy', label: 'Pelanggaran privasi' },
  { value: 'hate', label: 'Ujaran kebencian / hasutan' },
  { value: 'misinformation', label: 'Misinformasi / hoaks' },
  { value: 'other', label: 'Lainnya' },
] as const;

export function OrangeModernReportForm({ articleSlug }: { readonly articleSlug: string | null }) {
  const contactId = useId();
  const categoryId = useId();
  const detailsId = useId();
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState<string>('copyright');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (contact.trim().length < 3 || details.trim().length < 10) {
      setError('Lengkapi kontak dan uraian (min. 10 karakter).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/network/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleSlug, contact: contact.trim(), category, details: details.trim(), articleUrl: null }),
      });
      if (response.status === 429) {
        setError('Terlalu banyak laporan. Coba lagi dalam satu menit.');
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json().catch(() => null)) as { requestId?: unknown } | null;
      setTicket(typeof payload?.requestId === 'string' ? payload.requestId : null);
      setDone(true);
    } catch {
      setError('Laporan gagal dikirim. Coba lagi nanti.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <TemplateNotice tone="success" title="Laporan diterima">
        Tim redaksi meninjau paling lambat 1x24 jam. Terima kasih.
        {ticket ? (
          <>
            {' '}No. referensi: <span className="font-mono">{ticket}</span>.
          </>
        ) : null}
      </TemplateNotice>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {articleSlug ? (
        <p className="m-0 font-mono text-xs text-[var(--tpl-muted,#475569)]">Artikel: /{articleSlug}</p>
      ) : null}
      <div>
        <TemplateLabel htmlFor={contactId}>Kontak Anda (surel/nomor, untuk klarifikasi)</TemplateLabel>
        <TemplateInput
          id={contactId} type="text" value={contact} disabled={busy} maxLength={320}
          onChange={(event) => setContact(event.target.value)}
          className="mt-1.5 block h-11 w-full appearance-none rounded-xl px-3.5 font-sans text-base focus:outline-none sm:text-sm"
        />
      </div>
      <div>
        <TemplateLabel htmlFor={categoryId}>Kategori pelanggaran</TemplateLabel>
        <TemplateMenuSelect
          triggerId={categoryId} value={category} onValueChange={setCategory} disabled={busy}
          options={CATEGORIES} placeholder="Pilih kategori"
          triggerClassName="mt-1.5 w-full rounded-xl px-3.5 font-sans text-base data-[size=default]:h-11 sm:text-sm"
        />
      </div>
      <div>
        <TemplateLabel htmlFor={detailsId}>Uraian spesifik (bagian mana yang melanggar dan mengapa)</TemplateLabel>
        <TemplateTextarea
          id={detailsId} value={details} disabled={busy} rows={5} maxLength={4000}
          onChange={(event) => setDetails(event.target.value)}
          className="mt-1.5 block w-full appearance-none rounded-xl px-3.5 py-2.5 font-sans text-base focus:outline-none sm:text-sm"
        />
      </div>
      {error ? (
        <TemplateNotice tone="error" title="Gagal mengirim laporan">{error}</TemplateNotice>
      ) : null}
      <TemplateButton
        type="submit" disabled={busy}
        className="inline-flex h-11 items-center gap-2 rounded-full px-6 font-sans text-sm font-bold disabled:opacity-50"
      >
        {busy ? (
          <>
            <Spinner className="h-4 w-4" aria-hidden="true" /> Mengirim…
          </>
        ) : 'Kirim laporan'}
      </TemplateButton>
    </form>
  );
}

'use client';

import { useState } from 'react';

const CATEGORIES = [
  { value: 'copyright', label: 'Pelanggaran hak cipta' },
  { value: 'defamation', label: 'Pencemaran nama baik' },
  { value: 'privacy', label: 'Pelanggaran privasi' },
  { value: 'hate', label: 'Ujaran kebencian / hasutan' },
  { value: 'misinformation', label: 'Misinformasi / hoaks' },
  { value: 'other', label: 'Lainnya' },
] as const;

export function ReportForm({ articleSlug }: { readonly articleSlug: string | null }) {
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState<string>('copyright');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDone(true);
    } catch {
      setError('Laporan gagal dikirim. Coba lagi nanti.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <p className="m-0 font-sans text-sm leading-relaxed text-paper">Laporan diterima. Tim redaksi meninjau paling lambat 1x24 jam. Terima kasih.</p>;
  }

  return (
    <div className="space-y-3">
      {articleSlug ? (
        <p className="m-0 font-mono text-xs text-paper-faint">Artikel: /articles/{articleSlug}</p>
      ) : null}
      <label className="block font-sans text-xs text-paper-dim">
        Kontak Anda (surel/nomor, untuk klarifikasi)
        <input
          type="text" value={contact} disabled={busy} maxLength={320}
          onChange={(event) => setContact(event.target.value)}
          className="mt-1 block h-9 w-full border border-hairline-strong bg-bg px-3 font-sans text-sm text-paper"
        />
      </label>
      <label className="block font-sans text-xs text-paper-dim">
        Kategori pelanggaran
        <select
          value={category} disabled={busy}
          onChange={(event) => setCategory(event.target.value)}
          className="mt-1 block h-9 w-full border border-hairline-strong bg-bg px-3 font-sans text-sm text-paper"
        >
          {CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="block font-sans text-xs text-paper-dim">
        Uraian spesifik (bagian mana yang melanggar dan mengapa)
        <textarea
          value={details} disabled={busy} rows={5} maxLength={4000}
          onChange={(event) => setDetails(event.target.value)}
          className="mt-1 block w-full border border-hairline-strong bg-bg px-3 py-2 font-sans text-sm text-paper"
        />
      </label>
      {error ? <p className="m-0 font-sans text-xs text-error">{error}</p> : null}
      <button
        type="button" onClick={submit} disabled={busy}
        className="h-9 bg-brass px-4 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
      >
        {busy ? 'Mengirim…' : 'Kirim laporan'}
      </button>
    </div>
  );
}

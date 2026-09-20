'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const CATEGORIES = [
  { value: 'copyright', label: 'Pelanggaran hak cipta' },
  { value: 'defamation', label: 'Pencemaran nama baik' },
  { value: 'privacy', label: 'Pelanggaran privasi' },
  { value: 'hate', label: 'Ujaran kebencian / hasutan' },
  { value: 'misinformation', label: 'Misinformasi / hoaks' },
  { value: 'other', label: 'Lainnya' },
] as const;

export function SoftBlueReportForm({ articleSlug }: { readonly articleSlug: string | null }) {
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
    return <p className="m-0 font-sans text-sm leading-relaxed text-slate-600">Laporan diterima. Tim redaksi meninjau paling lambat 1x24 jam. Terima kasih.</p>;
  }

  return (
    <div className="space-y-4">
      {articleSlug ? (
        <p className="m-0 font-mono text-xs text-slate-600">Artikel: /{articleSlug}</p>
      ) : null}
      <label className="block font-sans text-xs font-medium text-slate-600">
        Kontak Anda (surel/nomor, untuk klarifikasi)
        <input
          type="text" value={contact} disabled={busy} maxLength={320}
          onChange={(event) => setContact(event.target.value)}
          className="mt-1.5 block h-11 w-full appearance-none rounded-xl border border-slate-200 bg-[#f1f6ff] px-3.5 font-sans text-base text-slate-900 focus:border-[#2563eb] focus:outline-none sm:text-sm"
        />
      </label>
      <label className="block font-sans text-xs font-medium text-slate-600">
        Kategori pelanggaran
        <div className="relative mt-1.5">
          <select
            value={category} disabled={busy}
            onChange={(event) => setCategory(event.target.value)}
            className="block h-11 w-full appearance-none rounded-xl border border-slate-200 bg-[#f1f6ff] pl-3 pr-10 font-sans text-base text-slate-900 focus:border-[#2563eb] focus:outline-none sm:text-sm"
          >
          {CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        </div>
      </label>
      <label className="block font-sans text-xs font-medium text-slate-600">
        Uraian spesifik (bagian mana yang melanggar dan mengapa)
        <textarea
          value={details} disabled={busy} rows={5} maxLength={4000}
          onChange={(event) => setDetails(event.target.value)}
          className="mt-1.5 block w-full appearance-none rounded-xl border border-slate-200 bg-[#f1f6ff] px-3.5 py-2.5 font-sans text-base text-slate-900 focus:border-[#2563eb] focus:outline-none sm:text-sm"
        />
      </label>
      {error ? <p className="m-0 font-sans text-xs font-medium text-red-600">{error}</p> : null}
      <button
        type="button" onClick={submit} disabled={busy}
        className="inline-flex h-11 items-center rounded-full bg-[#2563eb] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50"
      >
        {busy ? 'Mengirim…' : 'Kirim laporan'}
      </button>
    </div>
  );
}

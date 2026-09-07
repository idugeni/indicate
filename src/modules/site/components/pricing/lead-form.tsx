'use client';

import { useState } from 'react';

/** Formulir lead Enterprise publik dengan consent trail (PENDING A6). */
export function LeadForm() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [kebutuhan, setKebutuhan] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (nama.trim().length === 0 || email.trim().length < 3 || kebutuhan.trim().length < 10) {
      setError('Lengkapi nama, surel, dan kebutuhan (min. 10 karakter).');
      return;
    }
    if (!consent) {
      setError('Centang persetujuan pemrosesan data terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: nama.trim(), email: email.trim(), kebutuhan: kebutuhan.trim(), consent: true }),
      });
      if (response.status === 429) {
        setError('Terlalu banyak percobaan. Coba lagi nanti.');
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDone(true);
    } catch {
      setError('Pengiriman gagal. Coba lagi nanti.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <p className="m-0 max-w-xl font-sans text-sm leading-relaxed text-paper">
        Kebutuhan diterima. Tim kami menghubungi maksimal 1x24 jam hari kerja. Terima kasih.
      </p>
    );
  }

  return (
    <div className="max-w-xl space-y-3">
      <label className="block font-sans text-xs text-paper-dim">
        Nama lengkap
        <input
          type="text" value={nama} disabled={busy} maxLength={200}
          onChange={(event) => setNama(event.target.value)}
          className="mt-1 block h-9 w-full border border-hairline-strong bg-bg px-3 font-sans text-sm text-paper"
        />
      </label>
      <label className="block font-sans text-xs text-paper-dim">
        Surel kerja
        <input
          type="email" value={email} disabled={busy} maxLength={320}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 block h-9 w-full border border-hairline-strong bg-bg px-3 font-sans text-sm text-paper"
        />
      </label>
      <label className="block font-sans text-xs text-paper-dim">
        Kebutuhan (jumlah domain, wilayah, jadwal)
        <textarea
          value={kebutuhan} disabled={busy} rows={4} maxLength={4000}
          onChange={(event) => setKebutuhan(event.target.value)}
          className="mt-1 block w-full border border-hairline-strong bg-bg px-3 py-2 font-sans text-sm text-paper"
        />
      </label>
      <label className="flex cursor-pointer items-start gap-2 font-sans text-xs leading-relaxed text-paper-dim">
        <input
          type="checkbox" checked={consent} disabled={busy}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 flex-none accent-brass"
        />
        <span>
          Saya setuju data di atas diproses untuk menindaklanjuti kebutuhan Enterprise
          (Kebijakan Privasi §4, transfer lintas negara §12). Persetujuan dapat ditarik
          kapan saja via halaman Kontak.
        </span>
      </label>
      {error ? <p className="m-0 font-sans text-xs text-error">{error}</p> : null}
      <button
        type="button" onClick={submit} disabled={busy}
        className="h-9 bg-brass px-4 font-sans text-xs font-semibold text-bg hover:bg-brass-soft disabled:opacity-50"
      >
        {busy ? 'Mengirim…' : 'Kirim kebutuhan Enterprise'}
      </button>
    </div>
  );
}

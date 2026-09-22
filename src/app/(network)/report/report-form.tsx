'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
        <p className="m-0 font-mono text-xs text-paper-faint">Artikel: /{articleSlug}</p>
      ) : null}
      <Label className="block font-sans text-xs text-paper-dim">
        Kontak Anda (surel/nomor, untuk klarifikasi)
        <Input
          type="text" value={contact} disabled={busy} maxLength={320}
          onChange={(event) => setContact(event.target.value)}
          className="mt-1 h-9 border-hairline-strong bg-bg font-sans text-sm text-paper"
        />
      </Label>
      <Label className="block font-sans text-xs text-paper-dim">
        Kategori pelanggaran
        <Select
          value={category}
          disabled={busy}
          items={Object.fromEntries(CATEGORIES.map((option) => [option.value, option.label]))}
          onValueChange={(value) => { if (value !== null) setCategory(value); }}
        >
          <SelectTrigger className="mt-1 h-9 w-full border-hairline-strong bg-bg font-sans text-sm text-paper">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>
      <Label className="block font-sans text-xs text-paper-dim">
        Uraian spesifik (bagian mana yang melanggar dan mengapa)
        <Textarea
          value={details} disabled={busy} rows={5} maxLength={4000}
          onChange={(event) => setDetails(event.target.value)}
          className="mt-1 border-hairline-strong bg-bg font-sans text-sm text-paper"
        />
      </Label>
      {error ? <p className="m-0 font-sans text-xs text-error">{error}</p> : null}
      <Button
        type="button" onClick={submit} disabled={busy}
        className="h-9 bg-brass font-sans text-xs font-semibold text-bg hover:bg-brass-soft"
      >
        {busy ? 'Mengirim…' : 'Kirim laporan'}
      </Button>
    </div>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { hashInviteCode } from '@/modules/dashboard/components/shared/invite-code';

export function RedeemInviteForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const redeem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const parts = code.trim().split(':');
      if (parts.length !== 3 || parts.some((part) => part.length === 0)) throw new Error('bad-code');
      const [orgId, email, secret] = parts as [string, string, string];
      const tokenHash = await hashInviteCode(orgId, email, secret);
      const response = await fetch('/api/dashboard/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite.redeem', payload: { tokenHash } }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNotice('Undangan diterima. Memuat dasbor…');
      router.refresh();
    } catch {
      setNotice('Kode tidak valid, kedaluwarsa, atau email tidak cocok.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={redeem} className="mt-6 w-full max-w-xl rounded-lg border border-hairline bg-bg-raised p-5 text-left sm:p-6">
      <p className="m-0 font-sans text-sm font-semibold text-paper">Punya kode undangan?</p>
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        required
        placeholder="ID-organisasi:surel:rahasia"
        aria-label="Kode undangan"
        className="mt-3 w-full border border-hairline-strong bg-bg px-3 py-2.5 font-mono text-xs text-paper placeholder:text-paper-faint"
      />
      <button
        type="submit"
        disabled={busy}
        className="mt-2 inline-flex w-full items-center justify-center border border-hairline-strong bg-transparent px-5 py-2.5 font-sans text-sm font-medium text-paper transition-colors duration-180 hover:border-paper-faint disabled:opacity-50"
      >
        {busy ? 'Memeriksa…' : 'Tukarkan undangan'}
      </button>
      {notice ? <FormNotice tone="muted">{notice}</FormNotice> : null}
    </form>
  );
}

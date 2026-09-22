'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

interface SiteOption {
  readonly id: string;
  readonly normalizedHostname: string;
}

export function CachePurgeForm({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as { readonly sites?: readonly SiteOption[] } | null;
  const siteSelectId = useId();
  const confirmBulkId = useId();
  const [siteId, setSiteId] = useState('');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [isPurging, startPurgeTransition] = useTransition();

  const sites = model?.sites ?? [];
  const isBulk = siteId === '';
  const targetLabel = isBulk ? 'semua situs' : (sites.find((site) => site.id === siteId)?.normalizedHostname ?? siteId);

  const doPurge = () => {
    setNotice(null);
    startPurgeTransition(async () => {
      const result = await command('site.cache.purge', isBulk ? { confirmBulk: true } : { siteId });
      if (result === null) {
        setNotice({ tone: 'error', message: 'Bersihkan cache gagal. Periksa pesan kesalahan di atas halaman.' });
        return;
      }
      const value = result as { readonly sites?: readonly { readonly hostname: string }[]; readonly dispatched?: { readonly completed: number; readonly failed: number } | null };
      const count = value.sites?.length ?? 0;
      const dispatchNote = value.dispatched === null || value.dispatched === undefined
        ? 'dijalankan sistem berikutnya'
        : `${value.dispatched.completed} tugas selesai, ${value.dispatched.failed} gagal`;
      setNotice({ tone: 'success', message: `Permintaan dikirim untuk ${targetLabel} (${count} situs) — ${dispatchNote}.` });
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBulk) {
      setConfirmBulkOpen(true);
      return;
    }
    doPurge();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SectionCard icon={RefreshCw} title="Bersihkan Cache" eyebrow="Perbarui tampilan">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {notice ? <FormNotice tone={notice.tone}>{notice.message}</FormNotice> : null}
        <div className="space-y-1.5">
          <Label htmlFor={siteSelectId} className="font-mono text-xs text-paper-dim">
            Target
          </Label>
          <NativeSelect
            id={siteSelectId}
            value={siteId}
            disabled={isPurging}
            onChange={(event) => { setSiteId(event.target.value); setConfirmBulk(false); }}
            className="w-full"
          >
            <NativeSelectOption value="">Semua situs</NativeSelectOption>
            {sites.map((site) => (
              <NativeSelectOption key={site.id} value={site.id}>
                {site.normalizedHostname}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">
            Memperbarui tampilan {targetLabel} di semua server. Tercatat di Riwayat Keamanan dan terlihat di Tugas Latar Belakang.
            {isBulk ? ` Pembersihan massal menyegarkan ${sites.length} situs sekaligus dan dibatasi 2 menit per organisasi.` : null}
          </p>
        </div>
        {isBulk ? (
          <div className="flex items-start gap-2">
            <Checkbox
              id={confirmBulkId}
              checked={confirmBulk}
              disabled={isPurging}
              onCheckedChange={(checked) => setConfirmBulk(checked)}
              className="mt-0.5"
            />
            <Label htmlFor={confirmBulkId} className="font-sans text-[11px] leading-relaxed text-paper-dim">
              Saya paham membersihkan {sites.length} situs sekaligus membebani server.
            </Label>
          </div>
        ) : null}
        <div>
          <Button
            type="submit"
            variant="default"
            disabled={isPurging || (isBulk && !confirmBulk)}
            className="w-full sm:w-auto"
          >
            {isPurging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            <span>{isPurging ? 'Mengirim…' : 'Bersihkan Sekarang'}</span>
          </Button>
        </div>
      </form>
      <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bersihkan {sites.length} situs sekaligus?</AlertDialogTitle>
            <AlertDialogDescription>
              Pembersihan massal menyegarkan semua situs dan membebani server. Lanjutkan hanya bila diperlukan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmBulkOpen(false);
                doPurge();
              }}
            >
              Ya, bersihkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
      <aside aria-label="Panduan cache" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Cara kerja</p>
        <ul className="m-0 mt-2 list-disc space-y-1.5 pl-5 font-sans text-xs leading-relaxed text-paper-dim">
          <li>Target tunggal menyegarkan satu situs tanpa antre massal.</li>
          <li>Pembersihan massal dibatasi 2 menit per organisasi.</li>
          <li>Setiap permintaan tercatat di Riwayat Keamanan.</li>
        </ul>
      </aside>
    </div>
  );
}

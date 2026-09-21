import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Baris aksi formulir dasbor: tombol kirim primer dan tombol batal sekunder.
 *
 * @param submitLabel - Label tombol kirim saat idle.
 * @param busySubmitLabel - Label tombol kirim saat sibuk; default `submitLabel`.
 * @param cancelLabel - Label tombol batal; default `Batal`.
 * @param onCancel - Handler tombol batal; bila absen, tombol batal disembunyikan.
 * @param disabled - Kunci kedua tombol.
 * @param isBusy - Tampilkan indikator putar pada tombol kirim dan kunci kirim.
 * @returns Baris aksi formulir siap pakai.
 */
export function FormActions({
  submitLabel,
  busySubmitLabel,
  cancelLabel = 'Batal',
  onCancel,
  disabled = false,
  isBusy = false,
}: {
  readonly submitLabel: string;
  readonly busySubmitLabel?: string;
  readonly cancelLabel?: string;
  readonly onCancel?: () => void;
  readonly disabled?: boolean;
  readonly isBusy?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" variant="default" disabled={disabled || isBusy}>
        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
        <span>{isBusy && busySubmitLabel ? busySubmitLabel : submitLabel}</span>
      </Button>
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel} disabled={disabled || isBusy}>
          <span>{cancelLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}

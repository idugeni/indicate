import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Dashboard form action row: primary submit button and secondary cancel button.
 *
 * @param submitLabel - Submit button label while idle.
 * @param busySubmitLabel - Submit button label while busy; defaults to `submitLabel`.
 * @param cancelLabel - Cancel button label; defaults to `Batal`.
 * @param onCancel - Cancel button handler; when absent, the cancel button is hidden.
 * @param disabled - Lock both buttons.
 * @param isBusy - Show a spinner on the submit button and lock submission.
 * @returns Ready-to-use form action row.
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

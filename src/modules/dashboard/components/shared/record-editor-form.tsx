'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { Textarea } from '@/components/ui/textarea';
import {
  buildUpdatePayload,
  initialFieldValue,
  resolveFieldOptions,
  type EditorConfig,
  type EditorValues,
  type LookupTables,
} from '@/modules/dashboard/components/shared/record-editor-config';
import { PermissionChecklist } from '@/modules/dashboard/components/shared/permission-checklist';
import { FormActions } from '@/modules/dashboard/components/shared/form-actions';

export function RecordEditorForm({
  config,
  collectionKey,
  item,
  lookups,
  onSaved,
  onCancel,
  onSubmit,
}: {
  readonly config: EditorConfig;
  readonly collectionKey: string;
  readonly item: Record<string, unknown>;
  readonly lookups: LookupTables;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
  readonly onSubmit: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const formId = useId();
  const [values, setValues] = useState<EditorValues>(() =>
    Object.fromEntries(config.fields.map((field) => [field.key, initialFieldValue(field, item)])),
  );
  const [isSaving, startSaveTransition] = useTransition();

  const version = typeof item.version === 'number' ? item.version : Number(item.version ?? 1);

  const setValue = (key: string, value: string | boolean | readonly string[]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    for (const field of config.fields) {
      if (field.kind !== 'text' && field.kind !== 'textarea' && field.kind !== 'select') continue;
      const raw = values[field.key];
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (field.required === true && text === '') {
        toast.error(`Isi ${field.label} dulu.`);
        return;
      }
      if (text !== '' && typeof field.pattern === 'string' && field.pattern !== '') {
        let valid = true;
        try {
          valid = new RegExp(`^(?:${field.pattern})$`).test(text);
        } catch {
          valid = true;
        }
        if (!valid) {
          toast.error(`${field.label} tidak sesuai format.`);
          return;
        }
      }
    }
    const payload = buildUpdatePayload(collectionKey, item, values);
    startSaveTransition(async () => {
      const result = await onSubmit(config.updateAction, payload);
      if (result !== null) onSaved();
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} aria-label={config.title} className="space-y-4 border-t border-hairline bg-bg px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 font-sans text-xs font-semibold text-paper">{config.title}</p>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          versi {Number.isFinite(version) ? version : 1}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {config.fields.map((field) => {
          const inputId = `${formId}-${field.key}`;
          const value = values[field.key] ?? '';
          const wide = field.kind === 'textarea' || field.kind === 'checklist' || field.key === 'title' || field.key === 'body';
          if (field.kind === 'static') {
            return (
              <div key={field.key} className="block">
                <span className="mb-1.5 block font-sans text-xs font-medium text-paper-dim">{field.label}</span>
                <p className="m-0 break-all border border-hairline bg-bg-raised px-3 py-2 font-mono text-xs text-paper-dim">
                  {typeof value === 'string' ? value : ''}
                </p>
              </div>
            );
          }
          if (field.kind === 'checklist') {
            const selected = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
            return (
              <div key={field.key} className="block sm:col-span-2">
                <span className="mb-1.5 block font-sans text-xs font-medium text-paper-dim">{field.label}</span>
                <PermissionChecklist
                  options={field.options ?? []}
                  selected={selected}
                  disabled={isSaving}
                  onChange={(next) => setValue(field.key, next)}
                />
              </div>
            );
          }
          if (field.kind === 'checkbox') {
            return (
              <Label key={field.key} htmlFor={inputId} className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                <Checkbox
                  id={inputId}
                  checked={value === true}
                  disabled={isSaving}
                  onCheckedChange={(checked) => setValue(field.key, checked)}
                />
                <span className="font-sans text-xs text-paper-dim">{field.label}</span>
              </Label>
            );
          }
          if (field.kind === 'select') {
            return (
              <Label key={field.key} htmlFor={inputId} className="block">
                <span className="mb-1.5 block font-sans text-xs font-medium text-paper-dim">{field.label}</span>
                <SearchCombobox
                  id={inputId}
                  value={typeof value === 'string' ? value : ''}
                  required={field.required}
                  disabled={isSaving}
                  placeholder={field.emptyLabel ?? field.placeholder ?? field.label}
                  options={resolveFieldOptions(field, lookups)}
                  allowEmpty={field.allowEmpty}
                  emptyLabel={field.emptyLabel}
                  onValueChange={(next) => setValue(field.key, next ?? '')}
                />
              </Label>
            );
          }
          if (field.kind === 'textarea') {
            return (
              <Label key={field.key} htmlFor={inputId} className={wide ? 'block sm:col-span-2' : 'block'}>
                <span className="mb-1.5 block font-sans text-xs font-medium text-paper-dim">{field.label}</span>
                <Textarea
                  id={inputId}
                  value={typeof value === 'string' ? value : ''}
                  required={field.required}
                  disabled={isSaving}
                  rows={field.key === 'body' ? 6 : 3}
                  placeholder={field.placeholder}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  className="w-full font-sans text-xs"
                />
              </Label>
            );
          }
          return (
            <Label key={field.key} htmlFor={inputId} className={wide ? 'block sm:col-span-2' : 'block'}>
              <span className="mb-1.5 block font-sans text-xs font-medium text-paper-dim">{field.label}</span>
              <Input
                id={inputId}
                value={typeof value === 'string' ? value : ''}
                required={field.required}
                disabled={isSaving}
                pattern={field.pattern}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.key, event.target.value)}
                className="font-sans text-xs"
              />
            </Label>
          );
        })}
      </div>

      <FormActions
        submitLabel="Simpan perubahan"
        busySubmitLabel="Menyimpan…"
        onCancel={onCancel}
        isBusy={isSaving}
      />
    </form>
  );
}

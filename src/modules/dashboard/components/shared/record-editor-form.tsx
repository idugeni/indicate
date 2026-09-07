'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
    const payload = buildUpdatePayload(collectionKey, item, values);
    startSaveTransition(async () => {
      const result = await onSubmit(config.updateAction, payload);
      if (result !== null) onSaved();
    });
  };

  return (
    <form onSubmit={handleSubmit} aria-label={config.title} className="space-y-4 border-t border-hairline bg-bg px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 font-sans text-xs font-semibold text-paper">{config.title}</p>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          ID {String(item.id ?? '—')} · versi {Number.isFinite(version) ? version : 1}
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
              <label key={field.key} htmlFor={inputId} className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={value === true}
                  disabled={isSaving}
                  onChange={(event) => setValue(field.key, event.target.checked)}
                  className="h-4 w-4 accent-brass"
                />
                <span className="font-sans text-xs text-paper-dim">{field.label}</span>
              </label>
            );
          }
          if (field.kind === 'select') {
            return (
              <label key={field.key} htmlFor={inputId} className="block">
                <span className="mb-1.5 block font-sans text-xs font-medium text-paper-dim">{field.label}</span>
                <select
                  id={inputId}
                  value={typeof value === 'string' ? value : ''}
                  required={field.required}
                  disabled={isSaving}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  className="h-9 w-full border border-hairline-strong bg-bg-raised px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-paper-faint focus:border-brass focus:outline-none"
                >
                  {field.allowEmpty ? <option value="">{field.emptyLabel ?? 'Tanpa relasi'}</option> : null}
                  {resolveFieldOptions(field, lookups).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (field.kind === 'textarea') {
            return (
              <label key={field.key} htmlFor={inputId} className={wide ? 'block sm:col-span-2' : 'block'}>
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
              </label>
            );
          }
          return (
            <label key={field.key} htmlFor={inputId} className={wide ? 'block sm:col-span-2' : 'block'}>
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
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-8 items-center gap-1.5 bg-brass px-4 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          <span>{isSaving ? 'Menyimpan…' : 'Simpan perubahan'}</span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="inline-flex h-8 items-center gap-1.5 border border-hairline px-4 font-sans text-xs text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Batal</span>
        </button>
      </div>
    </form>
  );
}

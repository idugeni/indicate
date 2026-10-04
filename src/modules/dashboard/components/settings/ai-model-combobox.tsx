'use client';

import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Combobox, ComboboxCollection, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxLabel, ComboboxList } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';

/** One selectable model with the capability flags shown as badges. */
export interface AiModelComboOption {
  readonly providerId: string;
  readonly modelName: string;
  readonly displayName: string;
  readonly contextWindow: number;
  readonly supportedModalities: readonly string[];
  readonly supportsTools: boolean;
  readonly isDefault: boolean;
}

/** Combobox value shape; extra fields ride along for badge rendering. */
export interface AiModelComboItem {
  readonly value: string;
  readonly label: string;
  readonly providerId: string;
  readonly contextWindow: number;
  readonly supportedModalities: readonly string[];
  readonly supportsTools: boolean;
  readonly isDefault: boolean;
}

/** One provider group in the model picker popup. */
export interface AiModelComboGroup {
  readonly value: string;
  readonly label: string;
  readonly items: readonly AiModelComboItem[];
}

/**
 * Compact context window for badges (`512k`, `1M`).
 *
 * @param contextWindow - Raw context window in tokens.
 * @returns Short human label, or the raw number when tiny.
 */
export function formatModelCtx(contextWindow: number): string {
  if (!Number.isFinite(contextWindow) || contextWindow <= 0) return '-';
  if (contextWindow % 1048576 === 0) return `${contextWindow / 1048576}M`;
  if (contextWindow % 1024 === 0) return `${contextWindow / 1024}k`;
  if (contextWindow >= 1000) return `${Math.round(contextWindow / 1000)}k`;
  return String(contextWindow);
}

/**
 * Whether a modality list can carry images into the model.
 *
 * @param modalities - Catalog `supported_modalities` for one model.
 * @returns True for image or video input.
 */
export function modelSupportsVision(modalities: readonly string[]): boolean {
  return modalities.includes('image') || modalities.includes('video');
}

/**
 * Group model options by provider for the picker popup.
 *
 * @param options - Active catalog models from the overview.
 * @param providers - Provider directory for display names.
 * @param currentValue - Selected model id; kept visible even outside the catalog.
 * @returns Provider groups sorted by label, items with the default first.
 */
export function groupModelOptions(
  options: readonly AiModelComboOption[],
  providers: readonly { readonly id: string; readonly name: string }[],
  currentValue: string,
): readonly AiModelComboGroup[] {
  const names = new Map(providers.map((provider) => [provider.id, provider.name] as const));
  const byProvider = new Map<string, AiModelComboItem[]>();
  for (const option of options) {
    const item: AiModelComboItem = {
      value: option.modelName,
      label: option.displayName,
      providerId: option.providerId,
      contextWindow: option.contextWindow,
      supportedModalities: option.supportedModalities,
      supportsTools: option.supportsTools,
      isDefault: option.isDefault,
    };
    const list = byProvider.get(option.providerId) ?? [];
    list.push(item);
    byProvider.set(option.providerId, list);
  }
  if (currentValue !== '' && !options.some((option) => option.modelName === currentValue)) {
    const unknown: AiModelComboItem = {
      value: currentValue,
      label: `${currentValue} (tidak di katalog)`,
      providerId: '',
      contextWindow: 0,
      supportedModalities: [],
      supportsTools: false,
      isDefault: false,
    };
    const list = byProvider.get('') ?? [];
    list.push(unknown);
    byProvider.set('', list);
  }
  return [...byProvider.entries()]
    .map(([providerId, items]) => ({
      value: providerId,
      label: providerId === '' ? 'Lainnya' : (names.get(providerId) ?? providerId),
      items: [...items].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Searchable model picker grouped by provider with capability badges.
 *
 * @param id - Input id for label association.
 * @param label - Visible field label.
 * @param value - Selected model name, or empty for unset.
 * @param options - Active catalog models.
 * @param providers - Provider directory for group labels.
 * @param placeholder - Hint shown while empty.
 * @param ariaLabel - Accessible name for the input.
 * @param disabled - Lock the picker.
 * @param onValueChange - Called with the next model name (empty when cleared).
 * @returns Grouped combobox bound to a model name string.
 */
export function AiModelCombobox({
  id,
  label,
  value,
  options,
  providers,
  placeholder,
  ariaLabel,
  disabled = false,
  onValueChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly AiModelComboOption[];
  readonly providers: readonly { readonly id: string; readonly name: string }[];
  readonly placeholder: string;
  readonly ariaLabel: string;
  readonly disabled?: boolean | undefined;
  readonly onValueChange: (next: string) => void;
}) {
  const groups = useMemo(() => groupModelOptions(options, providers, value), [options, providers, value]);
  const selected = useMemo(() => {
    for (const group of groups) {
      const found = group.items.find((item) => item.value === value);
      if (found !== undefined) return found;
    }
    return null;
  }, [groups, value]);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">{label}</Label>
      <Combobox
        items={groups}
        value={selected}
        onValueChange={(next) => onValueChange(next?.value ?? '')}
        isItemEqualToValue={(a, b) => (a?.value ?? null) === (b?.value ?? null)}
      >
        <ComboboxInput id={id} placeholder={placeholder} aria-label={ariaLabel} disabled={disabled} showTrigger showClear />
        <ComboboxContent>
          <ComboboxEmpty>Tidak ada model yang cocok.</ComboboxEmpty>
          <ComboboxList>
            {(group: AiModelComboGroup) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel>{group.label}</ComboboxLabel>
                <ComboboxCollection>
                  {(item: AiModelComboItem) => (
                    <ComboboxItem key={item.value} value={item}>
                      <span className="min-w-0 flex-1 truncate font-sans text-xs text-paper">{item.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.value.endsWith(':free') ? <Badge variant="outline" className="font-mono text-[9px] uppercase text-signal">free</Badge> : null}
                        {item.contextWindow > 0 ? <Badge variant="outline" className="font-mono text-[9px] text-paper-faint">{formatModelCtx(item.contextWindow)}</Badge> : null}
                        {item.supportsTools ? <Badge variant="outline" className="font-mono text-[9px] uppercase text-paper-faint">tools</Badge> : null}
                        {modelSupportsVision(item.supportedModalities) ? <Badge variant="outline" className="font-mono text-[9px] uppercase text-paper-faint">vision</Badge> : null}
                        {item.isDefault ? <Badge variant="outline" className="font-mono text-[9px] uppercase text-brass">default</Badge> : null}
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

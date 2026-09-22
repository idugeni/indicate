'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';

import {
  createSuggestionCache,
  filterLabeledOptions,
  type LabeledOption,
} from '@/modules/dashboard/components/shared/suggestion-cache';
import { useDebouncedValue } from '@/modules/dashboard/components/shared/use-debounced-value';

/**
 * Find the visible label for a submitted value.
 *
 * @param options - Full option list.
 * @param value - Submitted option id.
 * @returns Matching label, or empty when unselected or unknown. The empty
 * value never resolves to the clear-option label, so the input keeps its
 * placeholder until the user picks something real.
 */
function labelOf(options: readonly LabeledOption[], value: string): string {
  if (value === '') return '';
  return options.find((option) => option.value === value)?.label ?? '';
}

/**
 * Single-select autosuggest input over Base UI Combobox.
 *
 * @remarks The root `name` renders the hidden submitted input, so parents
 * keep reading `FormData` exactly like a native select. Typing filters the
 * popup; closing without picking reverts the text to the selected label,
 * which keeps the submitted id honest. Uncontrolled mode follows native
 * `form.reset()` and late-arriving options until the user picks.
 * @param id - Input id for label association.
 * @param name - Form field name; omitted for fully controlled selects.
 * @param value - Controlled selected id; omit for uncontrolled use.
 * @param defaultValue - Initial uncontrolled id; defaults to empty.
 * @param required - Native required validation on the hidden input.
 * @param disabled - Lock the input.
 * @param placeholder - Hint shown while empty.
 * @param ariaLabel - Accessible name when no visible label is associated.
 * @param options - Selectable id/label pairs.
 * @param allowEmpty - Prepend a clearable empty option.
 * @param emptyLabel - Label of the empty option; defaults to a generic prompt.
 * @param noResultsLabel - Empty-list text; defaults to an Indonesian prompt.
 * @param limit - Maximum visible options; defaults to 50.
 * @param onValueChange - Called with the next id (null when cleared).
 * @returns Themed autosuggest matching the control-room surface.
 */
export function SearchCombobox({
  id,
  name,
  value,
  defaultValue = '',
  required = false,
  disabled = false,
  placeholder,
  ariaLabel,
  options,
  allowEmpty = false,
  emptyLabel = '— kosongkan —',
  noResultsLabel = 'Tidak ada hasil yang cocok.',
  limit = 50,
  onValueChange,
}: {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly value?: string | undefined;
  readonly defaultValue?: string | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly placeholder: string;
  readonly ariaLabel?: string | undefined;
  readonly options: readonly LabeledOption[];
  readonly allowEmpty?: boolean | undefined;
  readonly emptyLabel?: string | undefined;
  readonly noResultsLabel?: string | undefined;
  readonly limit?: number | undefined;
  readonly onValueChange?: ((value: string | null) => void) | undefined;
}) {
  const controlled = value !== undefined;
  const allOptions = useMemo(
    () =>
      allowEmpty && !options.some((option) => option.value === '')
        ? [{ value: '', label: emptyLabel }, ...options]
        : options,
    [allowEmpty, emptyLabel, options],
  );
  const cache = useMemo(() => createSuggestionCache<readonly LabeledOption[]>(), []);
  const touched = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internal, setInternal] = useState(defaultValue);
  const selected = controlled ? (value as string) : internal;
  const optionsRef = useRef(allOptions);
  useEffect(() => {
    optionsRef.current = allOptions;
  }, [allOptions]);
  const [query, setQuery] = useState(() => labelOf(allOptions, controlled ? (value as string) : defaultValue));
  const debouncedQuery = useDebouncedValue(query);
  const previousValue = useRef(selected);

  const valuesKey = useMemo(() => allOptions.map((option) => option.value).join('|'), [allOptions]);
  const filtered = useMemo(
    () => cache.get(`${valuesKey}\n${debouncedQuery.trim().toLowerCase()}`, () => filterLabeledOptions(allOptions, debouncedQuery, limit)),
    [cache, valuesKey, debouncedQuery, allOptions, limit],
  );

  useEffect(() => {
    if (!controlled && !touched.current) {
      setInternal(defaultValue);
      setQuery(labelOf(allOptions, defaultValue));
    }
  }, [controlled, defaultValue, allOptions]);

  useEffect(() => {
    if (controlled && previousValue.current !== value) {
      previousValue.current = value as string;
      setQuery(labelOf(allOptions, value as string));
    }
  }, [controlled, value, allOptions]);

  useEffect(() => {
    if (!touched.current) setQuery(labelOf(allOptions, selected));
  }, [allOptions, selected]);

  useEffect(() => {
    if (controlled) return;
    const form = inputRef.current?.closest('form');
    if (!form) return;
    const handleReset = () => {
      touched.current = false;
      setInternal(defaultValue);
      setQuery(labelOf(allOptions, defaultValue));
    };
    form.addEventListener('reset', handleReset);
    return () => form.removeEventListener('reset', handleReset);
  }, [controlled, defaultValue, allOptions]);

  const handleValueChange = (next: string | null) => {
    touched.current = true;
    if (!controlled) setInternal(next ?? '');
    setQuery(labelOf(allOptions, next ?? ''));
    onValueChange?.(next);
  };

  return (
    <Combobox.Root<string, false, LabeledOption>
      items={allOptions}
      filteredItems={filtered}
      value={selected}
      inputValue={query}
      onValueChange={handleValueChange}
      onInputValueChange={(next, details) => {
        setQuery(next);
        if (details.reason === 'input-change' && next === '' && selected !== '') {
          touched.current = true;
          if (!controlled) setInternal('');
          onValueChange?.(null);
        }
      }}
      autoHighlight
      itemToStringLabel={(itemValue: string) => labelOf(optionsRef.current, itemValue ?? '')}
      required={required}
      disabled={disabled}
      {...(name === undefined ? {} : { name })}
    >
      <div className="relative">
        <Combobox.Input
          ref={inputRef}
          {...(id === undefined ? {} : { id })}
          {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
          placeholder={placeholder}
          disabled={disabled}
          className="h-8 w-full rounded border border-hairline-strong bg-bg py-1 pr-8 pl-2.5 font-sans text-xs text-paper transition-colors outline-none placeholder:text-paper-faint hover:border-hairline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-paper-faint" aria-hidden="true" />
      </div>
      <Combobox.Portal>
        <Combobox.Positioner className="z-50" sideOffset={4}>
          <Combobox.Popup className="max-h-64 w-(--anchor-width) min-w-36 overflow-y-auto rounded-lg border border-hairline bg-bg-raised p-1 text-paper shadow-md outline-none">
            <Combobox.Empty className="px-2 py-1.5 font-sans text-xs text-paper-faint">
              {noResultsLabel}
            </Combobox.Empty>
            <Combobox.List>
              {(item: LabeledOption) => (
                <Combobox.Item
                  key={item.value === '' ? '__empty__' : item.value}
                  value={item.value}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 font-sans text-xs text-paper-dim outline-none select-none data-highlighted:bg-bg-raised-2 data-highlighted:text-paper data-selected:text-paper"
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  <Combobox.ItemIndicator
                    render={
                      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                    }
                  >
                    <CheckIcon className="pointer-events-none size-3.5" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { XIcon } from 'lucide-react';

import {
  createSuggestionCache,
  filterLabeledOptions,
  type LabeledOption,
} from '@/modules/dashboard/components/shared/suggestion-cache';
import { useDebouncedValue } from '@/modules/dashboard/components/shared/use-debounced-value';

const EMPTY_TAGS: readonly string[] = [];

/**
 * Multi-chip tag input with autosuggest over Base UI Combobox.
 *
 * @remarks Tags submit as one comma-joined hidden field, matching the
 * existing `tags` form contract (`get('tags').split(',')`). The root stays
 * nameless so Base UI emits no competing per-value inputs. Typing filters
 * ranked suggestions; Enter or comma adds the typed tag when nothing is
 * highlighted, Backspace on an empty query drops the last chip, and Escape
 * closes the popup. Uncontrolled mode follows native `form.reset()`.
 * @param id - Input id for label association.
 * @param name - Hidden field name carrying comma-joined tags.
 * @param value - Controlled tags; omit for uncontrolled use.
 * @param defaultValue - Initial uncontrolled tags; defaults to empty.
 * @param suggestions - Ranked suggestion pool, most-used first.
 * @param placeholder - Hint shown while empty.
 * @param ariaLabel - Accessible name when no visible label is associated.
 * @param disabled - Lock the input.
 * @param maxItems - Maximum tags kept; defaults to 10.
 * @param normalizeValue - Canonicalize raw text; defaults to trimming.
 * @param noResultsLabel - Empty-list text; defaults to an Indonesian prompt.
 * @param onValueChange - Called with the next tag list.
 * @returns Chip input matching the control-room surface.
 */
export function TagCombobox({
  id,
  name,
  value,
  defaultValue = EMPTY_TAGS,
  suggestions,
  placeholder,
  ariaLabel,
  disabled = false,
  maxItems = 10,
  normalizeValue = (raw: string) => raw.trim(),
  noResultsLabel = 'Tekan Enter untuk menambah tag baru.',
  onValueChange,
}: {
  readonly id?: string | undefined;
  readonly name: string;
  readonly value?: readonly string[] | undefined;
  readonly defaultValue?: readonly string[] | undefined;
  readonly suggestions: readonly string[];
  readonly placeholder: string;
  readonly ariaLabel?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly maxItems?: number | undefined;
  readonly normalizeValue?: ((raw: string) => string) | undefined;
  readonly noResultsLabel?: string | undefined;
  readonly onValueChange?: ((tags: readonly string[]) => void) | undefined;
}) {
  const controlled = value !== undefined;
  const cache = useMemo(() => createSuggestionCache<readonly LabeledOption[]>(), []);
  const touched = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internal, setInternal] = useState<readonly string[]>(defaultValue);
  const tags = controlled ? value : internal;
  const tagsArray = useMemo(() => [...tags], [tags]);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);

  const pool = useMemo(
    () =>
      suggestions
        .filter((tag) => !tags.includes(tag))
        .map((tag) => ({ value: tag, label: tag })),
    [suggestions, tags],
  );
  const poolKey = useMemo(() => pool.map((item) => item.value).join('|'), [pool]);
  const filtered = useMemo(
    () => cache.get(`${poolKey}\n${debouncedQuery.trim().toLowerCase()}`, () => filterLabeledOptions(pool, debouncedQuery, 8)),
    [cache, poolKey, debouncedQuery, pool],
  );

  useEffect(() => {
    if (!controlled && !touched.current) setInternal(defaultValue);
  }, [controlled, defaultValue]);

  useEffect(() => {
    if (controlled) return;
    const form = inputRef.current?.closest('form');
    if (!form) return;
    const handleReset = () => {
      touched.current = false;
      setInternal(defaultValue);
      setQuery('');
    };
    form.addEventListener('reset', handleReset);
    return () => form.removeEventListener('reset', handleReset);
  }, [controlled, defaultValue]);

  const commit = (next: readonly string[]) => {
    touched.current = true;
    if (!controlled) setInternal(next);
    onValueChange?.(next);
  };

  const addRaw = (raw: string) => {
    const clean = normalizeValue(raw);
    if (clean === '' || tags.includes(clean) || tags.length >= maxItems) return false;
    commit([...tags, clean]);
    setQuery('');
    return true;
  };

  return (
    <Combobox.Root<string, true, LabeledOption>
      multiple
      items={pool}
      filteredItems={filtered}
      value={tagsArray}
      inputValue={query}
      onValueChange={(next) => {
        if (next !== null) commit(next.slice(0, maxItems));
      }}
      onInputValueChange={(next) => setQuery(next)}
      itemToStringLabel={(itemValue: string) => itemValue ?? ''}
      disabled={disabled}
    >
      <Combobox.Chips className="flex min-h-8 flex-wrap items-center gap-1.5 rounded border border-hairline-strong bg-bg px-2 py-1 transition-colors focus-within:border-ring hover:border-hairline has-disabled:cursor-not-allowed has-disabled:opacity-50 [&_input]:flex-1 [&_input]:w-24 [&_input]:min-w-16 [&_input]:bg-transparent [&_input]:font-sans [&_input]:text-xs [&_input]:text-paper [&_input]:outline-none [&_input]:placeholder:text-paper-faint">
        <Combobox.Value>
          {(selected: readonly string[]) => (
            <>
              {selected.map((tag) => (
                <Combobox.Chip
                  key={tag}
                  className="inline-flex max-w-full items-center gap-1 rounded border border-brass/60 bg-brass/10 py-0.5 pr-1 pl-2 font-mono text-[11px] text-paper"
                >
                  <span className="truncate">{tag}</span>
                  <Combobox.ChipRemove
                    aria-label={`Hapus tag ${tag}`}
                    className="flex size-4 items-center justify-center rounded text-paper-dim outline-none hover:text-paper focus-visible:ring-2 focus-visible:ring-brass"
                  >
                    <XIcon className="size-3" aria-hidden="true" />
                  </Combobox.ChipRemove>
                </Combobox.Chip>
              ))}
            </>
          )}
        </Combobox.Value>
        <Combobox.Input
          ref={inputRef}
          {...(id === undefined ? {} : { id })}
          {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              const highlighted = event.currentTarget.getAttribute('aria-activedescendant');
              if (highlighted !== null && event.key === 'Enter') return;
              event.preventDefault();
              addRaw(event.currentTarget.value);
            } else if (event.key === 'Backspace' && event.currentTarget.value === '' && tags.length > 0) {
              event.preventDefault();
              commit(tags.slice(0, -1));
            }
          }}
        />
      </Combobox.Chips>
      <input type="hidden" name={name} value={tags.join(',')} disabled={disabled} />
      <Combobox.Portal>
        <Combobox.Positioner className="z-50" sideOffset={4}>
          <Combobox.Popup className="max-h-64 w-(--anchor-width) min-w-36 overflow-y-auto rounded-lg border border-hairline bg-bg-raised p-1 text-paper shadow-md outline-none">
            <Combobox.Empty className="px-2 py-1.5 font-sans text-xs text-paper-faint">
              {noResultsLabel}
            </Combobox.Empty>
            <Combobox.List>
              {(item: LabeledOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item.value}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-2 pl-1.5 font-mono text-xs text-paper-dim outline-none select-none data-highlighted:bg-bg-raised-2 data-highlighted:text-paper data-selected:text-paper"
                >
                  <span className="flex-1 truncate">{item.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

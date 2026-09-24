'use client';

import { useMemo, useRef, useState } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { PlusIcon, XIcon } from 'lucide-react';

import {
  createSuggestionCache,
  type LabeledOption,
} from '@/modules/dashboard/components/shared/suggestion-cache';
import { useDebouncedValue } from '@/modules/dashboard/components/shared/use-debounced-value';
import { normalizeCategoryKey } from '@/modules/dashboard/components/shared/form-utils';

/**
 * Ranah kategori tenant untuk pemilih cerdas.
 */
export interface CategoryChoice {
  readonly id: string;
  readonly name: string;
}

const MAX_ITEMS = 10;

function smartFilter(
  options: readonly LabeledOption[],
  query: string,
  limit = 8,
): readonly LabeledOption[] {
  const needle = normalizeCategoryKey(query);
  if (needle === '') return options.slice(0, limit);
  return options
    .filter(
      (option) =>
        normalizeCategoryKey(option.label).includes(needle) || option.value.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

/**
 * Pemilih multi-kategori chip dengan pencocokan pintar dan tombol tambah inline.
 *
 * @remarks Mengetik menyaring dengan kunci normalisasi (`&` dibaca "dan",
 * abaikan huruf/baca dan tanda baca), jadi "politik dan hukum" menemukan
 * "Politik & Hukum". Bila tidak ada yang cocok persis, popup menampilkan
 * tombol `Tambah "X" sebagai kategori baru`; Enter tanpa sorotan berperilaku
 * sama. Chip pertama adalah kategori primer (badge ★). Nilai terkirim
 * sebagai hidden input `categoryIds` terurut.
 * @param id - Id input untuk asosiasi label.
 * @param categories - Ranah kategori aktif tenant.
 * @param value - Id terpilih terurut; pertama adalah primer.
 * @param onValueChange - Dipanggil dengan daftar id berikutnya.
 * @param onCreateCategory - Membuat kategori dari nama bebas; kembalikan id baru atau null bila gagal.
 * @param placeholder - Petunjuk saat kosong.
 * @param disabled - Kunci input.
 * @returns Pemilih kategori chip ala control-room.
 */
export function CategoryCombobox({
  id,
  categories,
  value,
  onValueChange,
  onCreateCategory,
  placeholder,
  disabled = false,
}: {
  readonly id?: string | undefined;
  readonly categories: readonly CategoryChoice[];
  readonly value: readonly string[];
  readonly onValueChange: (ids: readonly string[]) => void;
  readonly onCreateCategory: (name: string) => Promise<string | null>;
  readonly placeholder?: string | undefined;
  readonly disabled?: boolean | undefined;
}) {
  const cache = useMemo(() => createSuggestionCache<readonly LabeledOption[]>(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);

  const nameOf = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name] as const));
    return (categoryId: string): string => map.get(categoryId) ?? 'Kategori dihapus';
  }, [categories]);

  const pool = useMemo(
    () =>
      categories
        .filter((category) => !value.includes(category.id))
        .map((category) => ({ value: category.id, label: category.name })),
    [categories, value],
  );
  const poolKey = useMemo(() => pool.map((item) => item.value).join('|'), [pool]);
  const filtered = useMemo(
    () => cache.get(`${poolKey}\n${normalizeCategoryKey(debouncedQuery)}`, () => smartFilter(pool, debouncedQuery)),
    [cache, poolKey, debouncedQuery, pool],
  );

  const trimmedQuery = query.trim();
  const exactMatch =
    trimmedQuery === ''
      ? null
      : (categories.find(
          (category) => !value.includes(category.id) && normalizeCategoryKey(category.name) === normalizeCategoryKey(trimmedQuery),
        ) ?? null);

  const commit = (next: readonly string[]) => {
    onValueChange(next.slice(0, MAX_ITEMS));
  };

  const selectId = (categoryId: string) => {
    if (value.includes(categoryId) || value.length >= MAX_ITEMS) return;
    commit([...value, categoryId]);
    setQuery('');
  };

  const createFromQuery = async () => {
    const name = query.trim();
    if (name === '') return;
    const matched =
      categories.find((category) => !value.includes(category.id) && normalizeCategoryKey(category.name) === normalizeCategoryKey(name)) ??
      null;
    if (matched !== null) {
      selectId(matched.id);
      return;
    }
    const createdId = await onCreateCategory(name);
    if (createdId !== null) selectId(createdId);
  };

  return (
    <Combobox.Root<string, true, LabeledOption>
      multiple
      items={pool}
      filteredItems={filtered}
      value={[...value]}
      inputValue={query}
      onValueChange={(next) => {
        if (next !== null) commit(next);
      }}
      onInputValueChange={(next) => setQuery(next)}
      itemToStringLabel={(itemValue: string) => nameOf(itemValue ?? '')}
      disabled={disabled}
    >
      <Combobox.Chips className="flex min-h-8 flex-wrap items-center gap-1.5 rounded border border-hairline-strong bg-bg px-2 py-1 transition-colors focus-within:border-ring hover:border-hairline has-disabled:cursor-not-allowed has-disabled:opacity-50 [&_input]:flex-1 [&_input]:w-24 [&_input]:min-w-16 [&_input]:bg-transparent [&_input]:font-sans [&_input]:text-xs [&_input]:text-paper [&_input]:outline-none [&_input]:placeholder:text-paper-faint">
        <Combobox.Value>
          {(selected: readonly string[]) => (
            <>
              {selected.map((categoryId, index) => (
                <Combobox.Chip
                  key={categoryId}
                  className="inline-flex max-w-full items-center gap-1 rounded border border-brass/60 bg-brass/10 py-0.5 pr-1 pl-2 font-mono text-[11px] text-paper"
                >
                  <span className="truncate">{nameOf(categoryId)}</span>
                  {index === 0 ? (
                    <span className="text-[10px] tracking-wider text-brass uppercase">★ Primer</span>
                  ) : null}
                  <Combobox.ChipRemove
                    aria-label={`Hapus kategori ${nameOf(categoryId)}`}
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
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const highlighted = event.currentTarget.getAttribute('aria-activedescendant');
              if (highlighted !== null) return;
              event.preventDefault();
              void createFromQuery();
            } else if (event.key === 'Backspace' && event.currentTarget.value === '' && value.length > 0) {
              event.preventDefault();
              commit(value.slice(0, -1));
            }
          }}
        />
      </Combobox.Chips>
      {value.map((categoryId) => (
        <input key={categoryId} type="hidden" name="categoryIds" value={categoryId} disabled={disabled} />
      ))}
      <Combobox.Portal>
        <Combobox.Positioner className="z-50" sideOffset={4}>
          <Combobox.Popup className="max-h-64 w-(--anchor-width) min-w-36 overflow-y-auto rounded-lg border border-hairline bg-bg-raised p-1 text-paper shadow-md outline-none">
            <Combobox.Empty className="px-2 py-1.5 font-sans text-xs text-paper-faint">
              Ketik untuk mencari atau menambah kategori.
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
            {trimmedQuery !== '' && exactMatch === null ? (
              <button
                type="button"
                onClick={() => void createFromQuery()}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-xs text-paper outline-none hover:bg-bg-raised-2 focus-visible:ring-2 focus-visible:ring-brass"
              >
                <PlusIcon className="size-3.5 flex-none text-brass" aria-hidden="true" />
                <span className="truncate">Tambah &quot;{trimmedQuery}&quot; sebagai kategori baru</span>
              </button>
            ) : null}
          </Combobox.Popup>
        </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
  );
}

'use client';

import {
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FolderKanban,
  GitMerge,
  Hash,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';
import { useDashboardPage } from '@/modules/dashboard/components/shared/use-dashboard-query';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { slugify } from '@/modules/site/slugify';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AiTagSuggest } from '@/modules/ai/components/ai-tag-suggest';
import { AppTooltip } from '@/ui/app-tooltip';

interface TaxonomyCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly version: number;
  readonly articleCount: number;
}

interface TaxonomyTag {
  readonly tag: string;
  readonly count: number;
}

interface TaxonomyManagerProps {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
  readonly organizationId?: string | undefined;
}

const MANAGER_PAGE_SIZE = 12;

const CATEGORY_STATUS_META: Readonly<
  Record<
    string,
    {
      readonly label: string;
      readonly className: string;
    }
  >
> = {
  active: {
    label: 'Aktif',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  inactive: {
    label: 'Nonaktif',
    className: 'border-hairline-strong bg-bg text-paper-dim',
  },
  archived: {
    label: 'Arsip',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
};

const FALLBACK_CATEGORY_STATUS_META = {
  label: 'Aktif',
  className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
};

function ManagerPagination({
  total,
  page,
  pageCount,
  noun,
  onPageChange,
}: {
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
  readonly noun: string;
  readonly onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="mt-3 border-t border-hairline/60 pt-3">
      <DashboardPager
        startIndex={(page - 1) * MANAGER_PAGE_SIZE}
        visibleCount={Math.min(MANAGER_PAGE_SIZE, total - (page - 1) * MANAGER_PAGE_SIZE)}
        total={total}
        page={page}
        pageCount={pageCount}
        noun={noun}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export function TaxonomyManager({
  data,
  command,
  organizationId,
}: TaxonomyManagerProps) {
  const model = data as {
    readonly categories?: readonly TaxonomyCategory[];
    readonly tags?: readonly TaxonomyTag[];
  } | null;

  const categories = useMemo(() => model?.categories ?? [], [model]);
  const tags = useMemo(() => model?.tags ?? [], [model]);

  const categoryNameId = useId();
  const categorySlugId = useId();
  const renameFromId = useId();
  const renameToId = useId();
  const categorySearchId = useId();
  const categoryStatusId = useId();
  const tagSearchId = useId();

  const editNameId = useId();
  const editSlugId = useId();
  const editStatusId = useId();

  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);

  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');

  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('');
  const [categoryPage, setCategoryPage] = useDashboardPage('categoryPage');

  const [tagQuery, setTagQuery] = useState('');
  const [tagPage, setTagPage] = useDashboardPage('tagPage');

  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isRenaming, startRenameTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();

  const [editing, setEditing] = useState<TaxonomyCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editStatus, setEditStatus] = useState('active');

  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<TaxonomyCategory | null>(null);
  const [pendingTagRemove, setPendingTagRemove] = useState<TaxonomyTag | null>(null);

  const isTagMerging = useMemo(() => {
    const cleanTo = renameTo.trim().toLowerCase();
    if (!cleanTo || cleanTo === renameFrom.toLowerCase()) return false;
    return tags.some((item) => item.tag.toLowerCase() === cleanTo);
  }, [tags, renameFrom, renameTo]);

  const handleNameChange = (value: string) => {
    setCreateName(value);
    if (!isSlugManual) {
      setCreateSlug(slugify(value));
    }
  };

  const handleCreateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = createName.trim();
    const cleanSlug = (createSlug.trim() || slugify(cleanName)).toLowerCase();

    if (cleanName === '') {
      toast.error('Nama kategori wajib diisi.');
      return;
    }
    if (cleanSlug === '') {
      toast.error('Kode slug kategori wajib diisi.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      toast.error('Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).');
      return;
    }

    startCreateTransition(async () => {
      try {
        await command('category.create', { name: cleanName, slug: cleanSlug });
        toast.success(`Kategori “${cleanName}” berhasil dibuat.`);
        setCreateName('');
        setCreateSlug('');
        setIsSlugManual(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal membuat kategori baru.';
        toast.error(message);
      }
    });
  };

  const openEditCategory = (category: TaxonomyCategory) => {
    setEditing(category);
    setEditName(category.name);
    setEditSlug(category.slug);
    setEditStatus(category.status);
  };

  const handleUpdateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    const cleanName = editName.trim();
    const cleanSlug = editSlug.trim().toLowerCase();

    if (cleanName === '') {
      toast.error('Nama kategori tidak boleh kosong.');
      return;
    }
    if (cleanSlug === '') {
      toast.error('Kode slug kategori tidak boleh kosong.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      toast.error('Slug hanya boleh huruf kecil, angka, dan tanda hubung (-).');
      return;
    }

    const target = editing;
    startUpdateTransition(async () => {
      try {
        await command('category.update', {
          id: target.id,
          expectedVersion: target.version,
          name: cleanName,
          slug: cleanSlug,
          status: editStatus,
        });
        toast.success(`Kategori “${cleanName}” berhasil diperbarui.`);
        setEditing(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memperbarui kategori.';
        toast.error(message);
      }
    });
  };

  const confirmDeleteCategory = () => {
    const target = pendingCategoryDelete;
    setPendingCategoryDelete(null);
    if (!target) return;

    startDeleteTransition(async () => {
      try {
        await command('category.delete', { id: target.id, expectedVersion: target.version });
        toast.success(`Kategori “${target.name}” berhasil dihapus.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal menghapus kategori.';
        toast.error(message);
      }
    });
  };

  const handleRenameTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanFrom = renameFrom.trim();
    const cleanTo = slugify(renameTo.trim());

    if (cleanFrom === '') {
      toast.error('Pilih tag asal terlebih dahulu.');
      return;
    }
    if (cleanTo === '') {
      toast.error('Tentukan nama tag tujuan.');
      return;
    }
    if (cleanFrom === cleanTo) {
      toast.info('Nama tag asal dan tujuan identik.');
      return;
    }

    startRenameTransition(async () => {
      try {
        await command('tag.rename', { from: cleanFrom, to: cleanTo });
        toast.success(
          isTagMerging
            ? `Tag #${cleanFrom} berhasil digabungkan ke #${cleanTo}.`
            : `Tag #${cleanFrom} diubah menjadi #${cleanTo}.`,
        );
        setRenameFrom('');
        setRenameTo('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal mengubah nama tag.';
        toast.error(message);
      }
    });
  };

  const confirmRemoveTag = () => {
    const target = pendingTagRemove;
    setPendingTagRemove(null);
    if (!target) return;

    startRemoveTransition(async () => {
      try {
        await command('tag.remove', { tag: target.tag });
        toast.success(`Tag #${target.tag} berhasil dihapus dari seluruh artikel.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal menghapus tag.';
        toast.error(message);
      }
    });
  };

  const visibleCategories = useMemo(() => {
    const needle = categoryQuery.trim().toLowerCase();
    return categories.filter((category) => {
      if (categoryStatus !== '' && category.status !== categoryStatus) return false;
      return needle === '' || `${category.name} ${category.slug}`.toLowerCase().includes(needle);
    });
  }, [categories, categoryQuery, categoryStatus]);

  const categoryPageCount = Math.max(1, Math.ceil(visibleCategories.length / MANAGER_PAGE_SIZE));
  const safeCategoryPage = Math.min(categoryPage, categoryPageCount);
  const pagedCategories = visibleCategories.slice(
    (safeCategoryPage - 1) * MANAGER_PAGE_SIZE,
    safeCategoryPage * MANAGER_PAGE_SIZE,
  );

  const visibleTags = useMemo(() => {
    const needle = tagQuery.trim().toLowerCase();
    return needle === '' ? tags : tags.filter((item) => item.tag.includes(needle));
  }, [tags, tagQuery]);

  const tagPageCount = Math.max(1, Math.ceil(visibleTags.length / MANAGER_PAGE_SIZE));
  const safeTagPage = Math.min(tagPage, tagPageCount);
  const pagedTags = visibleTags.slice(
    (safeTagPage - 1) * MANAGER_PAGE_SIZE,
    safeTagPage * MANAGER_PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <SectionCard
          icon={FolderKanban}
          title="Kategori Baru"
          eyebrow="Tambah Kanal Portal"
        >
          <form noValidate onSubmit={handleCreateCategory} className="flex flex-col gap-3.5">
            <div className="space-y-1.5">
              <Label
                htmlFor={categoryNameId}
                className="font-mono text-xs uppercase tracking-wider text-paper-dim"
              >
                Nama Kategori
              </Label>
              <Input
                id={categoryNameId}
                name="name"
                value={createName}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="cth: Politik & Pemerintahan"
                maxLength={120}
                required
                disabled={isCreating}
                className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-sans text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={categorySlugId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Slug URL
                </Label>
                {isSlugManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSlugManual(false);
                      setCreateSlug(slugify(createName));
                    }}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-brass hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reset Otomatis</span>
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 font-mono text-xs text-paper-dim">
                  /
                </span>
                <Input
                  id={categorySlugId}
                  name="slug"
                  value={createSlug}
                  onChange={(event) => {
                    setIsSlugManual(true);
                    setCreateSlug(event.target.value.toLowerCase());
                  }}
                  placeholder="politik-pemerintahan"
                  maxLength={100}
                  disabled={isCreating}
                  className="h-9 rounded-md border-hairline-strong bg-bg pl-6 pr-3 font-mono text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isCreating}
              className="mt-1 w-full gap-2 font-sans text-xs font-medium"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Daftarkan Kategori</span>
            </Button>
          </form>
        </SectionCard>

        <SectionCard
          icon={Hash}
          title="Tata Kelola Tag"
          eyebrow="Restrukturisasi Topik"
        >
          <div className="mb-3 rounded-md border border-hairline bg-bg/50 p-2.5">
            <AiTagSuggest
              organizationId={organizationId}
              title={categoryQuery}
              body={tags.map((item) => item.tag).join(', ')}
              onApply={(suggestion) => {
                toast.info(
                  suggestion.tags.length > 0
                    ? `Saran tag AI: ${suggestion.tags.join(', ')}`
                    : 'AI tidak menemukan anomali atau rekomendasi tag baru.',
                );
              }}
            />
          </div>

          <form noValidate onSubmit={handleRenameTag} className="flex flex-col gap-3.5">
            <div className="space-y-1.5">
              <Label
                htmlFor={renameFromId}
                className="font-mono text-xs uppercase tracking-wider text-paper-dim"
              >
                Tag Asal
              </Label>
              <SearchCombobox
                id={renameFromId}
                name="from"
                value={renameFrom}
                onValueChange={(val) => setRenameFrom(val ?? '')}
                disabled={isRenaming}
                placeholder="Pilih tag yang akan diganti..."
                options={tags.map((item) => ({
                  value: item.tag,
                  label: `#${item.tag} (${item.count} artikel)`,
                }))}
                noResultsLabel="Tag tidak ditemukan dalam repositori."
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={renameToId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Tag Tujuan
                </Label>
                {isTagMerging && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                    <GitMerge className="h-3 w-3" />
                    <span>Akan Digabungkan</span>
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 font-mono text-xs text-paper-dim">
                  #
                </span>
                <Input
                  id={renameToId}
                  name="to"
                  value={renameTo}
                  onChange={(event) => setRenameTo(slugify(event.target.value))}
                  placeholder="logam-mulia"
                  maxLength={60}
                  required
                  disabled={isRenaming}
                  className="h-9 rounded-md border-hairline-strong bg-bg pl-7 pr-3 font-mono text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="outline"
              disabled={isRenaming || !renameFrom || !renameTo}
              className="mt-1 w-full gap-2 font-sans text-xs font-medium"
            >
              {isRenaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isTagMerging ? (
                <GitMerge className="h-4 w-4 text-amber-400" />
              ) : (
                <ArrowRight className="h-4 w-4 text-brass" />
              )}
              <span>{isTagMerging ? 'Gabungkan Tag Terkait' : 'Perbarui Nama Tag'}</span>
            </Button>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        icon={Layers}
        title="Daftar Kanal Kategori"
        eyebrow={`Total ${visibleCategories.length} dari ${categories.length} Kanal`}
      >
        <div className="grid gap-3 pb-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor={categorySearchId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Cari Kategori
            </Label>
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-paper-dim" />
              <Input
                id={categorySearchId}
                value={categoryQuery}
                onChange={(event) => {
                  setCategoryQuery(event.target.value);
                  setCategoryPage(1);
                }}
                placeholder="Cari nama atau slug..."
                className="h-9 rounded-md border-hairline-strong bg-bg pl-9 pr-8 font-sans text-xs text-paper placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
              />
              {categoryQuery !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryQuery('');
                    setCategoryPage(1);
                  }}
                  className="absolute right-2.5 rounded p-0.5 text-paper-dim hover:text-paper"
                  aria-label="Bersihkan pencarian"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor={categoryStatusId}
              className="font-mono text-xs uppercase tracking-wider text-paper-dim"
            >
              Status Kanal
            </Label>
            <DashboardSelect
              id={categoryStatusId}
              value={categoryStatus}
              onValueChange={(next) => {
                setCategoryStatus(next ?? '');
                setCategoryPage(1);
              }}
              placeholder="Semua Status"
            >
              <DashboardSelectItem value="">Semua Status</DashboardSelectItem>
              <DashboardSelectItem value="active">Aktif</DashboardSelectItem>
              <DashboardSelectItem value="inactive">Nonaktif</DashboardSelectItem>
              <DashboardSelectItem value="archived">Arsip</DashboardSelectItem>
            </DashboardSelect>
          </div>
        </div>

        {pagedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hairline bg-bg p-8 text-center">
            <FolderKanban className="h-8 w-8 text-paper-dim/40" />
            <p className="mt-2 font-sans text-xs font-medium text-paper">
              {categories.length === 0
                ? 'Belum ada kanal kategori yang dibuat'
                : 'Tidak ada kategori yang cocok dengan filter'}
            </p>
            <p className="mt-0.5 font-sans text-[11px] text-paper-dim">
              Gunakan formulir Kategori Baru di atas atau ubah parameter pencarian.
            </p>
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pagedCategories.map((category) => {
              const statusMeta =
                CATEGORY_STATUS_META[category.status] ??
                CATEGORY_STATUS_META.active ??
                FALLBACK_CATEGORY_STATUS_META;
              return (
                <li
                  key={category.id}
                  className="group flex flex-col justify-between rounded-md border border-hairline bg-bg p-3 transition duration-150 hover:border-hairline-strong hover:bg-bg-raised-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="m-0 truncate font-sans text-xs font-semibold text-paper">
                        {category.name}
                      </p>
                      <span
                        className={`inline-flex shrink-0 rounded px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-paper-dim">
                      /{category.slug}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-hairline/60 pt-2">
                    <span className="font-mono text-[10px] tabular-nums text-paper-dim">
                      {category.articleCount.toLocaleString('id-ID')} artikel
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => openEditCategory(category)}
                        aria-label={`Ubah kategori ${category.name}`}
                        className="h-6 w-6 p-0 text-paper-dim hover:text-paper"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={isDeleting}
                        onClick={() => setPendingCategoryDelete(category)}
                        aria-label={`Hapus kategori ${category.name}`}
                        className="h-6 w-6 p-0 text-paper-dim hover:text-rose-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <ManagerPagination
          total={visibleCategories.length}
          page={safeCategoryPage}
          pageCount={categoryPageCount}
          noun="kanal"
          onPageChange={setCategoryPage}
        />
      </SectionCard>

      <SectionCard
        icon={Tag}
        title="Daftar Tag Topik"
        eyebrow={`Total ${visibleTags.length} dari ${tags.length} Tag Terdaftar`}
      >
        <div className="pb-3 sm:max-w-xs">
          <Label
            htmlFor={tagSearchId}
            className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-paper-dim"
          >
            Cari Tag Topik
          </Label>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-paper-dim" />
            <Input
              id={tagSearchId}
              value={tagQuery}
              onChange={(event) => {
                setTagQuery(event.target.value);
                setTagPage(1);
              }}
              placeholder="Ketik nama tag..."
              className="h-9 rounded-md border-hairline-strong bg-bg pl-9 pr-8 font-mono text-xs text-paper placeholder:font-sans placeholder:text-paper-dim/50 hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
            />
            {tagQuery !== '' && (
              <button
                type="button"
                onClick={() => {
                  setTagQuery('');
                  setTagPage(1);
                }}
                className="absolute right-2.5 rounded p-0.5 text-paper-dim hover:text-paper"
                aria-label="Bersihkan pencarian tag"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {pagedTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hairline bg-bg p-8 text-center">
            <Hash className="h-8 w-8 text-paper-dim/40" />
            <p className="mt-2 font-sans text-xs font-medium text-paper">
              {tags.length === 0
                ? 'Belum ada tag yang digunakan dalam artikel'
                : 'Tidak ada tag yang sesuai pencarian'}
            </p>
            <p className="mt-0.5 font-sans text-[11px] text-paper-dim">
              Tag akan dibuat secara otomatis saat editor mempublikasikan artikel dengan label tag.
            </p>
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pagedTags.map((item) => (
              <li
                key={item.tag}
                className="group flex items-center justify-between rounded-md border border-hairline bg-bg px-3 py-2 transition duration-150 hover:border-hairline-strong hover:bg-bg-raised-2"
              >
                <div className="min-w-0 pr-2">
                  <AppTooltip label="Klik untuk memilih sebagai tag asal di form rename" side="top">
                    <button
                      type="button"
                      onClick={() => {
                        setRenameFrom(item.tag);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="truncate text-left font-mono text-xs font-medium text-paper transition hover:text-brass"
                    >
                      #{item.tag}
                    </button>
                  </AppTooltip>
                  <p className="m-0 font-mono text-[10px] tabular-nums text-paper-dim">
                    {item.count.toLocaleString('id-ID')} artikel terkait
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={isRemoving}
                    onClick={() => setPendingTagRemove(item)}
                    aria-label={`Hapus tag ${item.tag}`}
                    className="h-6 w-6 p-0 text-paper-dim hover:text-rose-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <ManagerPagination
          total={visibleTags.length}
          page={safeTagPage}
          pageCount={tagPageCount}
          noun="tag"
          onPageChange={setTagPage}
        />
      </SectionCard>

      <AlertDialog
        open={pendingCategoryDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCategoryDelete(null);
        }}
      >
        <AlertDialogContent className="border-hairline bg-bg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle className="font-sans text-sm font-semibold text-paper">
                Hapus Kategori “{pendingCategoryDelete?.name}”?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-sans text-xs text-paper-dim">
              {pendingCategoryDelete && pendingCategoryDelete.articleCount > 0
                ? `${pendingCategoryDelete.articleCount} artikel yang terhubung akan dilepas status kategorinya (menjadi tanpa kategori). Tindakan ini tidak dapat dibatalkan.`
                : 'Kategori akan dihapus secara permanen dari taksonomi sistem.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-sans text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              className="bg-rose-600 font-sans text-xs text-white hover:bg-rose-700"
            >
              Ya, Hapus Kategori
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingTagRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTagRemove(null);
        }}
      >
        <AlertDialogContent className="border-hairline bg-bg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle className="font-sans text-sm font-semibold text-paper">
                Hapus Tag #{pendingTagRemove?.tag}?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-sans text-xs text-paper-dim">
              Tag akan dilepas dari seluruh{' '}
              <strong className="text-paper">{pendingTagRemove?.count} artikel</strong> yang saat ini
              menggunakannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-sans text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveTag}
              className="bg-rose-600 font-sans text-xs text-white hover:bg-rose-700"
            >
              Ya, Hapus Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="border-hairline bg-bg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans text-sm font-semibold text-paper">
              Ubah Kategori: {editing?.name}
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-paper-dim">
              Perbarui identitas kanal, tautan URL slug, dan status publikasi.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <form noValidate onSubmit={handleUpdateCategory} className="flex flex-col gap-3.5 py-1">
              <div className="space-y-1.5">
                <Label
                  htmlFor={editNameId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Nama Kategori
                </Label>
                <Input
                  id={editNameId}
                  name="name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={120}
                  required
                  disabled={isUpdating}
                  className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-sans text-xs text-paper hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={editSlugId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Slug URL
                </Label>
                <Input
                  id={editSlugId}
                  name="slug"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value.toLowerCase())}
                  maxLength={100}
                  pattern="[a-z0-9-]+"
                  required
                  disabled={isUpdating}
                  className="h-9 rounded-md border-hairline-strong bg-bg px-3 font-mono text-xs text-paper hover:border-hairline focus-visible:ring-1 focus-visible:ring-brass"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={editStatusId}
                  className="font-mono text-xs uppercase tracking-wider text-paper-dim"
                >
                  Status Kanal
                </Label>
                <DashboardSelect
                  id={editStatusId}
                  name="status"
                  value={editStatus}
                  onValueChange={(val) => setEditStatus(val ?? 'active')}
                  disabled={isUpdating}
                  placeholder="Pilih status"
                >
                  <DashboardSelectItem value="active">Aktif</DashboardSelectItem>
                  <DashboardSelectItem value="inactive">Nonaktif</DashboardSelectItem>
                  <DashboardSelectItem value="archived">Arsip</DashboardSelectItem>
                </DashboardSelect>
              </div>

              <DialogFooter className="mt-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(null)}
                  disabled={isUpdating}
                  className="font-sans text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating}
                  className="gap-1.5 font-sans text-xs font-medium"
                >
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Simpan Perubahan</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
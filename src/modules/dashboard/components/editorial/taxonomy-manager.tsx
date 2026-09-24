'use client';

import { useId, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { FolderKanban, Hash, Pencil, Plus, Trash2 } from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import { slugify } from '@/modules/dashboard/components/shared/form-utils';
import { Badge } from '@/components/ui/badge';
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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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

const MANAGER_PAGE_SIZE = 12;

/**
 * Kelola kanal kategori dan rapikan tag topik dalam satu layar.
 *
 * @param data - Proyeksi `taxonomy.list` (kategori + hitungan artikel, tag + hitungan pakai).
 * @param command - Dispatcher aksi workspace (`category.*`, `tag.*`).
 * @returns Manajer taksonomi: buat/hapus kategori, ubah-nama/hapus tag massal.
 * @remarks Hapus kategori melepas artikel terkait menjadi tanpa kategori
 * (bukan blokir); ubah-nama tag menggabung bila nama tujuan sudah dipakai.
 */
export function TaxonomyManager({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
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
  const createFormRef = useRef<HTMLFormElement | null>(null);
  const renameFormRef = useRef<HTMLFormElement | null>(null);

  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('');
  const [categoryPage, setCategoryPage] = useState(1);
  const [tagQuery, setTagQuery] = useState('');
  const [tagPage, setTagPage] = useState(1);

  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isRenaming, startRenameTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();
  const [editing, setEditing] = useState<TaxonomyCategory | null>(null);
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<TaxonomyCategory | null>(null);
  const [pendingTagRemove, setPendingTagRemove] = useState<TaxonomyTag | null>(null);
  const editNameId = useId();
  const editSlugId = useId();
  const editStatusId = useId();

  const handleCreateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    const slug = String(formData.get('slug') ?? '').trim() || slugify(name);
    if (name === '') {
      toast.error('Isi nama kategori dulu.');
      return;
    }
    if (slug === '') {
      toast.error('Isi kode kategori dulu.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error('Kode kategori hanya boleh huruf kecil, angka, dan strip.');
      return;
    }
    startCreateTransition(async () => {
      await command('category.create', { name, slug });
      form.reset();
    });
  };

  const confirmDeleteCategory = () => {
    const target = pendingCategoryDelete;
    setPendingCategoryDelete(null);
    if (target === null) return;
    startDeleteTransition(async () => {
      await command('category.delete', { id: target.id, expectedVersion: target.version });
    });
  };

  const handleUpdateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing === null) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const slug = String(formData.get('slug') ?? '').trim();
    const status = String(formData.get('status') ?? editing.status);
    if (name === '') {
      toast.error('Isi nama kategori dulu.');
      return;
    }
    if (slug === '') {
      toast.error('Isi kode kategori dulu.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error('Kode kategori hanya boleh huruf kecil, angka, dan strip.');
      return;
    }
    const target = editing;
    startUpdateTransition(async () => {
      await command('category.update', { id: target.id, expectedVersion: target.version, name, slug, status });
      setEditing(null);
    });
  };

  const handleRenameTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const from = String(formData.get('from') ?? '').trim();
    const to = String(formData.get('to') ?? '').trim();
    if (from === '') {
      toast.error('Pilih tag asal dulu.');
      return;
    }
    if (to === '') {
      toast.error('Isi tag tujuan dulu.');
      return;
    }
    startRenameTransition(async () => {
      await command('tag.rename', { from, to });
      form.reset();
    });
  };

  const confirmRemoveTag = () => {
    const target = pendingTagRemove;
    setPendingTagRemove(null);
    if (target === null) return;
    startRemoveTransition(async () => {
      await command('tag.remove', { tag: target.tag });
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
  const pagedCategories = visibleCategories.slice((safeCategoryPage - 1) * MANAGER_PAGE_SIZE, safeCategoryPage * MANAGER_PAGE_SIZE);

  const visibleTags = useMemo(() => {
    const needle = tagQuery.trim().toLowerCase();
    return needle === '' ? tags : tags.filter((item) => item.tag.includes(needle));
  }, [tags, tagQuery]);
  const tagPageCount = Math.max(1, Math.ceil(visibleTags.length / MANAGER_PAGE_SIZE));
  const safeTagPage = Math.min(tagPage, tagPageCount);
  const pagedTags = visibleTags.slice((safeTagPage - 1) * MANAGER_PAGE_SIZE, safeTagPage * MANAGER_PAGE_SIZE);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard icon={FolderKanban} title="Kategori baru" eyebrow="Tambah kanal">
        <form ref={createFormRef} noValidate onSubmit={handleCreateCategory} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={categoryNameId}>Nama kategori</Label>
            <Input id={categoryNameId} name="name" placeholder="Politik" maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={categorySlugId}>Kode kategori (opsional)</Label>
            <Input id={categorySlugId} name="slug" placeholder="politik" maxLength={100} pattern="[a-z0-9-]+" />
            <p className="m-0 font-sans text-xs text-paper-faint">Kosongkan untuk mengisi otomatis dari nama.</p>
          </div>
          <Button type="submit" disabled={isCreating} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isCreating ? 'Menyimpan…' : 'Tambah kategori'}
          </Button>
        </form>
      </SectionCard>

      <SectionCard icon={Hash} title="Rapikan tag" eyebrow="Gabung & hapus">
        <form ref={renameFormRef} noValidate onSubmit={handleRenameTag} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={renameFromId}>Tag asal</Label>
            <SearchCombobox
              id={renameFromId}
              name="from"
              placeholder="Pilih tag yang ada"
              options={tags.map((item) => ({ value: item.tag, label: item.tag }))}
              noResultsLabel="Pilih dari daftar agar tepat sasaran."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={renameToId}>Tag tujuan</Label>
            <Input id={renameToId} name="to" placeholder="logam-mulia" maxLength={60} required />
            <p className="m-0 font-sans text-xs text-paper-faint">Bila tujuan sudah dipakai, keduanya bergabung menjadi satu.</p>
          </div>
          <Button type="submit" disabled={isRenaming} className="inline-flex items-center gap-2">
            {isRenaming ? 'Memproses…' : 'Ubah nama di semua artikel'}
          </Button>
        </form>
      </SectionCard>

      </div>

      <SectionCard icon={FolderKanban} title={`Kanal kategori (${visibleCategories.length}/${categories.length})`} eyebrow="Hapus lepas otomatis">
        <div className="grid gap-3 pb-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={categorySearchId}>Cari kanal</Label>
            <Input id={categorySearchId} value={categoryQuery} onChange={(event) => { setCategoryQuery(event.target.value); setCategoryPage(1); }} placeholder="politik" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={categoryStatusId}>Status</Label>
            <SearchCombobox
              id={categoryStatusId}
              value={categoryStatus}
              onValueChange={(next) => { setCategoryStatus(next ?? ''); setCategoryPage(1); }}
              placeholder="Semua status"
              options={[
                { value: 'active', label: 'Aktif' },
                { value: 'inactive', label: 'Nonaktif' },
                { value: 'archived', label: 'Arsip' },
              ]}
            />
          </div>
        </div>
        {pagedCategories.length === 0 ? (
          <p className="m-0 font-sans text-sm text-paper-faint">Tidak ada kanal yang cocok. Longgarkan saringan atau buat dari formulir di atas.</p>
        ) : (
          <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {pagedCategories.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-2 rounded-md border border-hairline px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="m-0 truncate font-sans text-[13px] font-medium text-paper">{category.name}</p>
                  <p className="m-0 flex items-center gap-1 truncate font-mono text-[10px] text-paper-faint">
                    <span className="truncate">{category.slug}</span>
                    <Badge variant={category.status === 'active' ? 'secondary' : 'outline'} className="h-4 px-1 font-mono text-[9px]">{category.status}</Badge>
                    <Badge variant="outline" className="h-4 px-1 font-mono text-[9px] tabular-nums">{category.articleCount}</Badge>
                  </p>
                </div>
                <div className="flex flex-none items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setEditing(category)}
                  aria-label={`Ubah kategori ${category.name}`}
                  className="text-paper-faint hover:text-paper"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isDeleting}
                  onClick={() => setPendingCategoryDelete(category)}
                  aria-label={`Hapus kategori ${category.name}`}
                  className="text-paper-faint hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span role="status" aria-live="polite" aria-atomic="true" className="font-mono text-[11px] tabular-nums text-paper-faint">
            {visibleCategories.length === 0 ? 0 : (safeCategoryPage - 1) * MANAGER_PAGE_SIZE + 1}–{Math.min(safeCategoryPage * MANAGER_PAGE_SIZE, visibleCategories.length)} dari {visibleCategories.length}
          </span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent className="gap-4">
              <PaginationItem>
                <PaginationPrevious
                  text="Sebelumnya"
                  href="#"
                  aria-label="Ke halaman kanal sebelumnya"
                  aria-disabled={safeCategoryPage <= 1}
                  tabIndex={safeCategoryPage <= 1 ? -1 : 0}
                  onClick={(event) => {
                    event.preventDefault();
                    if (safeCategoryPage > 1) setCategoryPage(safeCategoryPage - 1);
                  }}
                  className={`px-0 font-sans text-xs text-paper transition-colors hover:text-brass ${safeCategoryPage <= 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="font-mono text-[11px] tabular-nums text-paper-faint">
                  {safeCategoryPage} / {categoryPageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  text="Berikutnya"
                  href="#"
                  aria-label="Ke halaman kanal berikutnya"
                  aria-disabled={safeCategoryPage >= categoryPageCount}
                  tabIndex={safeCategoryPage >= categoryPageCount ? -1 : 0}
                  onClick={(event) => {
                    event.preventDefault();
                    if (safeCategoryPage < categoryPageCount) setCategoryPage(safeCategoryPage + 1);
                  }}
                  className={`px-0 font-sans text-xs text-paper transition-colors hover:text-brass ${safeCategoryPage >= categoryPageCount ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </SectionCard>

      <SectionCard icon={Hash} title={`Tag topik (${visibleTags.length}/${tags.length})`} eyebrow="Hitungan pakai">
        <div className="grid gap-3 pb-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={tagSearchId}>Cari tag</Label>
            <Input id={tagSearchId} value={tagQuery} onChange={(event) => { setTagQuery(event.target.value); setTagPage(1); }} placeholder="emas" />
          </div>
        </div>
        {pagedTags.length === 0 ? (
          <p className="m-0 font-sans text-sm text-paper-faint">Tidak ada tag yang cocok. Tag muncul setelah artikel memakai kolom tag.</p>
        ) : (
          <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {pagedTags.map((item) => (
              <li key={item.tag} className="flex items-center justify-between gap-2 rounded-md border border-hairline px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="m-0 truncate font-sans text-[13px] font-medium text-paper">#{item.tag}</p>
                  <p className="m-0 truncate font-mono text-[10px] text-paper-faint">
                    <Badge variant="outline" className="h-4 px-1 font-mono text-[9px] tabular-nums">{item.count} artikel</Badge>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isRemoving}
                  onClick={() => setPendingTagRemove(item)}
                  aria-label={`Hapus tag ${item.tag}`}
                  className="flex-none text-paper-faint hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span role="status" aria-live="polite" aria-atomic="true" className="font-mono text-[11px] tabular-nums text-paper-faint">
            {visibleTags.length === 0 ? 0 : (safeTagPage - 1) * MANAGER_PAGE_SIZE + 1}–{Math.min(safeTagPage * MANAGER_PAGE_SIZE, visibleTags.length)} dari {visibleTags.length}
          </span>
          <Pagination className="mx-0 w-auto">
            <PaginationContent className="gap-4">
              <PaginationItem>
                <PaginationPrevious
                  text="Sebelumnya"
                  href="#"
                  aria-label="Ke halaman tag sebelumnya"
                  aria-disabled={safeTagPage <= 1}
                  tabIndex={safeTagPage <= 1 ? -1 : 0}
                  onClick={(event) => {
                    event.preventDefault();
                    if (safeTagPage > 1) setTagPage(safeTagPage - 1);
                  }}
                  className={`px-0 font-sans text-xs text-paper transition-colors hover:text-brass ${safeTagPage <= 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="font-mono text-[11px] tabular-nums text-paper-faint">
                  {safeTagPage} / {tagPageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  text="Berikutnya"
                  href="#"
                  aria-label="Ke halaman tag berikutnya"
                  aria-disabled={safeTagPage >= tagPageCount}
                  tabIndex={safeTagPage >= tagPageCount ? -1 : 0}
                  onClick={(event) => {
                    event.preventDefault();
                    if (safeTagPage < tagPageCount) setTagPage(safeTagPage + 1);
                  }}
                  className={`px-0 font-sans text-xs text-paper transition-colors hover:text-brass ${safeTagPage >= tagPageCount ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </SectionCard>

      <AlertDialog open={pendingCategoryDelete !== null} onOpenChange={(open) => { if (!open) setPendingCategoryDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori{pendingCategoryDelete === null ? '' : ` ${pendingCategoryDelete.name}`}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCategoryDelete !== null && pendingCategoryDelete.articleCount > 0
                ? `${pendingCategoryDelete.articleCount} artikel terkait akan dilepas menjadi tanpa kategori.`
                : 'Kanal dihapus dari daftar taksonomi.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteCategory}>
              Ya, hapus kategori
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingTagRemove !== null} onOpenChange={(open) => { if (!open) setPendingTagRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tag{pendingTagRemove === null ? '' : ` ${pendingTagRemove.tag}`}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTagRemove === null ? '' : `Tag dilepas dari ${pendingTagRemove.count} artikel.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRemoveTag}>
              Ya, hapus tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Ubah kategori{editing === null ? '' : ` ${editing.name}`}</DialogTitle>
          {editing === null ? null : (
            <form key={editing.id} noValidate onSubmit={handleUpdateCategory} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor={editNameId}>Ubah nama</Label>
                <Input id={editNameId} name="name" defaultValue={editing.name} maxLength={120} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor={editSlugId}>Ubah kode</Label>
                <Input id={editSlugId} name="slug" defaultValue={editing.slug} maxLength={100} pattern="[a-z0-9-]+" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor={editStatusId}>Ubah status</Label>
                <DashboardSelect id={editStatusId} name="status" defaultValue={editing.status} placeholder="Pilih status">
                  <DashboardSelectItem value="active">Aktif</DashboardSelectItem>
                  <DashboardSelectItem value="inactive">Nonaktif</DashboardSelectItem>
                  <DashboardSelectItem value="archived">Arsip</DashboardSelectItem>
                </DashboardSelect>
              </div>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Menyimpan…' : 'Simpan perubahan'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

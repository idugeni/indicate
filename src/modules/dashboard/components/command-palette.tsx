'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CornerDownLeft,
  CreditCard,
  FileText,
  FolderKanban,
  Globe,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings,
  Share2,
  Users,
  X,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CommandAction {
  id: string;
  label: string;
  category: 'Redaksi' | 'Infrastruktur' | 'Sistem';
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

const COMMAND_ACTIONS: readonly CommandAction[] = [
  { id: 'overview', label: 'Ringkasan Dashboard', category: 'Redaksi', href: '/dashboard', icon: LayoutDashboard },
  { id: 'editorial', label: 'Manajemen Artikel & Konten', category: 'Redaksi', href: '/dashboard?view=editorial', icon: FileText },
  { id: 'publishing', label: 'Antrean Penerbitan', category: 'Redaksi', href: '/dashboard?view=publishing', icon: Share2 },
  { id: 'media', label: 'Penyimpanan Aset Media', category: 'Redaksi', href: '/dashboard?view=media', icon: FolderKanban },
  { id: 'domains', label: 'Routing Domain & Wilayah Regional', category: 'Infrastruktur', href: '/dashboard?view=configuration', icon: Globe },
  { id: 'publishers', label: 'Direktori Penerbit & Media Terafiliasi', category: 'Infrastruktur', href: '/dashboard?view=publishers', icon: Users },
  { id: 'analytics', label: 'Metrik & Throughput Jaringan', category: 'Infrastruktur', href: '/dashboard?view=analytics', icon: BarChart3 },
  { id: 'settings', label: 'Kunci API & Integrasi Edge Gateway', category: 'Sistem', href: '/dashboard?view=settings', icon: KeyRound },
  { id: 'billing', label: 'Langganan', category: 'Sistem', href: '/dashboard?view=billing', icon: CreditCard },
  { id: 'auth', label: 'Autentikasi & Sesi Pengguna', category: 'Sistem', href: '/sign-in', icon: Settings },
];

/**
 * Render palet perintah navigasi dashboard.
 *
 * @remarks Defensive: Base UI scroll-lock can stick when the dialog unmounts mid-exit (e.g. selecting an item that navigates to another layout).
 */
export function CommandPalette({ showTrigger = true }: { readonly showTrigger?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const router = useRouter();
  const listRef = React.useRef<HTMLDivElement>(null);
  const scrolledOnce = React.useRef(false);

  React.useEffect(() => () => {
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.body.removeAttribute('data-scroll-locked');
    document.documentElement.removeAttribute('data-scroll-locked');
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = React.useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return COMMAND_ACTIONS;
    return COMMAND_ACTIONS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(cleanQuery) ||
        cmd.category.toLowerCase().includes(cleanQuery)
    );
  }, [query]);

  const [prevQuery, setPrevQuery] = React.useState('');
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  const handleSelect = React.useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router]
  );

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[selectedIndex];
      if (target) handleSelect(target.href);
    }
  };

  React.useEffect(() => {
    if (open) scrolledOnce.current = false;
  }, [open]);

  React.useEffect(() => {
    if (!listRef.current) return;
    if (!scrolledOnce.current) {
      scrolledOnce.current = true;
      return;
    }
    const activeElement = listRef.current.querySelector<HTMLElement>('[data-selected="true"]');
    if (activeElement) {
      activeElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const activeOption = filtered[selectedIndex];
  const activeDescendantId = activeOption ? `cmd-palette-option-${activeOption.id}` : undefined;

  return (
    <>
      {showTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Buka navigasi cepat"
          title="Navigasi cepat (Ctrl+K)"
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-hairline bg-bg-raised text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper"
        >
          <Search className="h-4 w-4 text-brass" aria-hidden="true" />
        </button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl overflow-hidden rounded border border-hairline bg-bg-raised p-0 shadow-none">
          <DialogTitle className="sr-only">Navigasi Perintah Redaksi</DialogTitle>

          <div className="flex items-center border-b border-hairline bg-bg px-3.5">
            <Search className="h-4 w-4 flex-none text-brass" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ketik rute tujuan, modul, atau perintah..."
              aria-label="Cari perintah atau rute Dashboard"
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls="cmd-palette-listbox"
              aria-activedescendant={activeDescendantId}
              className="h-11 w-full border-0 bg-transparent px-3 font-mono text-xs text-paper placeholder:text-paper-faint focus:outline-none"
              autoFocus
            />
            {query ? (
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  onClick={() => setQuery('')}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded text-paper-faint hover:text-paper"
                  aria-label="Bersihkan pencarian"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent className="rounded border border-hairline bg-bg-raised p-2 font-mono text-xs text-paper">
                  Bersihkan kata kunci pencarian
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          <p className="sr-only" role="status">
            {filtered.length === 0
              ? 'Tidak ada hasil yang cocok.'
              : `${filtered.length} hasil tersedia.`}
          </p>
          <div
            ref={listRef}
            id="cmd-palette-listbox"
            role="listbox"
            aria-label="Hasil perintah"
            className="max-h-72 space-y-1 overflow-y-auto p-2 font-mono text-xs"
          >
            {filtered.length === 0 ? (
              <div className="py-8 text-center font-sans text-xs text-paper-faint">
                Tidak ada perintah atau rute yang cocok dengan kata kunci.
              </div>
            ) : (
              filtered.map((cmd, index) => {
                const Icon = cmd.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    id={`cmd-palette-option-${cmd.id}`}
                    role="option"
                    aria-selected={isSelected}
                    data-selected={isSelected}
                    type="button"
                    tabIndex={-1}
                    onClick={() => handleSelect(cmd.href)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition-colors duration-180 ${
                      isSelected
                        ? 'border border-hairline-strong bg-bg-raised-2 text-paper'
                        : 'border border-transparent bg-transparent text-paper-dim hover:text-paper'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded border ${
                          isSelected
                            ? 'border-brass/40 bg-bg text-brass-soft'
                            : 'border-hairline bg-bg text-paper-faint'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <span className="font-sans text-xs font-medium text-paper">
                        {cmd.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded border border-hairline bg-bg px-1.5 py-0.5 font-mono text-[10px] text-paper-faint">
                        {cmd.category}
                      </span>
                      {isSelected ? (
                        <CornerDownLeft className="h-3 w-3 text-brass" aria-hidden="true" />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-hairline bg-bg px-3.5 py-2 font-mono text-[10px] text-paper-faint">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigasi</span>
              <span>↵ Pilih</span>
              <span>ESC Tutup</span>
            </div>
            <span>INDICATE Command Mesh</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
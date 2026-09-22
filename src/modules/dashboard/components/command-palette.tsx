'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  BarChart3,
  Building2,
  CornerDownLeft,
  CreditCard,
  FileText,
  Flag,
  FolderKanban,
  Globe,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  { id: 'overview', label: 'Beranda', category: 'Redaksi', href: '/dashboard', icon: LayoutDashboard },
  { id: 'editorial', label: 'Manajemen Artikel & Konten', category: 'Redaksi', href: '/dashboard?view=editorial', icon: FileText },
  { id: 'publishing', label: 'Antrean Penerbitan', category: 'Redaksi', href: '/dashboard?view=publishing', icon: Share2 },
  { id: 'media', label: 'Media', category: 'Redaksi', href: '/dashboard?view=media', icon: FolderKanban },
  { id: 'content', label: 'Konten Website', category: 'Redaksi', href: '/dashboard?view=content', icon: Megaphone },
  { id: 'domains', label: 'Domain & Wilayah', category: 'Infrastruktur', href: '/dashboard?view=configuration', icon: Globe },
  { id: 'publishers', label: 'Daftar Lembaga Penerbit', category: 'Infrastruktur', href: '/dashboard?view=publishers', icon: Users },
  { id: 'analytics', label: 'Statistik & Grafik', category: 'Infrastruktur', href: '/dashboard?view=analytics', icon: BarChart3 },
  { id: 'settings', label: 'Koneksi & Kunci Akses', category: 'Sistem', href: '/dashboard?view=settings', icon: KeyRound },
  { id: 'billing', label: 'Langganan', category: 'Sistem', href: '/dashboard?view=billing', icon: CreditCard },
  { id: 'audit', label: 'Riwayat Keamanan', category: 'Sistem', href: '/dashboard?view=audit', icon: ShieldAlert },
  { id: 'operations', label: 'Tugas Latar Belakang', category: 'Sistem', href: '/dashboard?view=operations', icon: RefreshCw },
  { id: 'moderation', label: 'Laporan & Data Pengguna', category: 'Sistem', href: '/dashboard?view=moderation', icon: Flag },
  { id: 'customers', label: 'Kelola Pelanggan', category: 'Sistem', href: '/dashboard?view=customers', icon: Building2 },
  { id: 'auth', label: 'Masuk & Sesi Pengguna', category: 'Sistem', href: '/sign-in', icon: Settings },
];

/**
 * Render palet perintah navigasi dashboard.
 *
 * @remarks Defensive: Base UI scroll-lock can stick when the dialog unmounts mid-exit (e.g. selecting an item that navigates to another layout).
 */
export function CommandPalette({ showTrigger = true }: { readonly showTrigger?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const router = useRouter();

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

  const handleSelect = React.useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router]
  );

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Buka navigasi cepat"
          title="Navigasi cepat (Ctrl+K)"
        >
          <Search className="h-4 w-4 text-brass" aria-hidden="true" />
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto rounded border border-hairline bg-bg-raised p-0 shadow-none sm:max-w-xl">
          <DialogTitle className="sr-only">Navigasi Perintah Redaksi</DialogTitle>

          <Command
            label="Navigasi Perintah Redaksi"
            shouldFilter={false}
            className="flex size-full flex-col overflow-hidden bg-transparent text-paper"
          >
            <div className="flex items-center border-b border-hairline bg-bg px-3.5">
              <Search className="h-4 w-4 flex-none text-brass" aria-hidden="true" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Ketik rute tujuan, modul, atau perintah..."
                aria-label="Cari perintah atau rute Dashboard"
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
            <Command.List
              aria-label="Hasil perintah"
              className="max-h-72 space-y-1 overflow-y-auto p-2 font-mono text-xs"
            >
              <Command.Empty className="py-8 text-center font-sans text-xs text-paper-faint">
                Tidak ada perintah atau rute yang cocok dengan kata kunci.
              </Command.Empty>
              {filtered.map((cmd) => {
                const Icon = cmd.icon;

                return (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.id}
                    keywords={[cmd.label, cmd.category]}
                    onSelect={() => handleSelect(cmd.href)}
                    aria-label={cmd.label}
                    className="group/cmd-item flex w-full cursor-pointer items-center justify-between gap-2 rounded border border-transparent bg-transparent px-3 py-2 text-left text-paper-dim transition-colors duration-180 hover:text-paper data-[selected=true]:border-hairline-strong data-[selected=true]:bg-bg-raised-2 data-[selected=true]:text-paper"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-6 w-6 flex-none items-center justify-center rounded border border-hairline bg-bg text-paper-faint group-data-[selected=true]/cmd-item:border-brass/40 group-data-[selected=true]/cmd-item:bg-bg group-data-[selected=true]/cmd-item:text-brass-soft">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <span className="truncate font-sans text-xs font-medium text-paper">
                        {cmd.label}
                      </span>
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      <span className="rounded border border-hairline bg-bg px-1.5 py-0.5 font-mono text-[10px] text-paper-faint">
                        {cmd.category}
                      </span>
                      <CornerDownLeft className="h-3 w-3 text-brass opacity-0 group-data-[selected=true]/cmd-item:opacity-100" aria-hidden="true" />
                    </div>
                  </Command.Item>
                );
              })}
            </Command.List>

            <div className="flex items-center justify-between border-t border-hairline bg-bg px-3.5 py-2 font-mono text-[10px] text-paper-faint">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigasi</span>
                <span>↵ Pilih</span>
                <span>ESC Tutup</span>
              </div>
              <span>INDICATE Command Mesh</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

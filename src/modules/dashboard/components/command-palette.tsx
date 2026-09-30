'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { CornerDownLeft, Search, Settings, Sparkles, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { groupTitle, VIEW_REGISTRY, visibleNavGroups, type View } from '@/modules/dashboard/components/view-registry';
import { AiAssistantDialog } from '@/modules/ai/components/ai-assistant-dialog';

interface CommandAction {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

/** Sign-in lives outside the workspace, so it stays an explicit entry rather than a registry view. */
const AUTH_ACTION: CommandAction = {
  id: 'auth',
  label: 'Masuk & Sesi Pengguna',
  category: groupTitle('system'),
  href: '/sign-in',
  icon: Settings,
};

function viewAction(view: View, group: string): CommandAction {
  const { label, icon } = VIEW_REGISTRY[view];
  return { id: view, label, category: group, href: view === 'dashboard' ? '/dashboard' : `/dashboard?view=${view}`, icon };
}

/**
 * Build the palette entries for the active organization.
 *
 * @param permissions - Union of org and platform permissions; gates the entries the sidebar hides.
 * @returns One command per reachable view, in sidebar order, plus the sign-in route.
 */
function buildActions(permissions: ReadonlySet<string>): readonly CommandAction[] {
  return [
    ...visibleNavGroups(permissions).flatMap((group) => group.views.map((view) => viewAction(view, group.title))),
    AUTH_ACTION,
  ];
}

/**
 * Render palet perintah navigasi dashboard.
 *
 * @remarks Entries are derived from the view registry and gated by the same
 * permission set as the sidebar, so the palette can never offer a route the
 * navigation hides. Defensive: Base UI scroll-lock can stick when the dialog
 * unmounts mid-exit (e.g. selecting an item that navigates to another layout).
 */
export function CommandPalette({
  showTrigger = true,
  permissions,
  organizationId,
}: {
  readonly showTrigger?: boolean;
  readonly permissions: ReadonlySet<string>;
  readonly organizationId?: string | undefined;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [assistantOpen, setAssistantOpen] = React.useState(false);

  const router = useRouter();

  const actions = React.useMemo(() => buildActions(permissions), [permissions]);

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
    if (!cleanQuery) return actions;
    return actions.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(cleanQuery) ||
        cmd.category.toLowerCase().includes(cleanQuery)
    );
  }, [query, actions]);

  const assistantVisible = React.useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery === '') return true;
    return ['tanya asisten ai redaksi', 'ai', 'asisten ai', 'tanya redaksi', 'kopilot', 'bantuan ai'].some((text) =>
      text.includes(cleanQuery),
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-label="Buka navigasi cepat"
              >
                <Search className="h-4 w-4 text-brass" aria-hidden="true" />
              </Button>
            }
          />
          <TooltipContent className="border border-hairline bg-bg-raised p-2 font-mono text-xs text-paper">
            Navigasi cepat (Ctrl+K)
          </TooltipContent>
        </Tooltip>
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
                className="h-11 flex-1 border-0 bg-transparent px-3 font-mono text-xs text-paper placeholder:text-paper-faint focus:outline-none"
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
              {assistantVisible ? (
              <Command.Item
                value="assistant-chat"
                keywords={['asisten ai', 'tanya redaksi', 'kopilot', 'bantuan ai']}
                onSelect={() => { setOpen(false); setQuery(''); setAssistantOpen(true); }}
                aria-label="Tanya Asisten AI Redaksi"
                className="group/cmd-item flex w-full cursor-pointer items-center justify-between gap-2 rounded border border-transparent bg-transparent px-3 py-2 text-left text-paper-dim transition-colors duration-180 hover:text-paper data-[selected=true]:border-hairline-strong data-[selected=true]:bg-bg-raised-2 data-[selected=true]:text-paper"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-6 w-6 flex-none items-center justify-center rounded border border-hairline bg-bg text-paper-faint group-data-[selected=true]/cmd-item:border-brass/40 group-data-[selected=true]/cmd-item:bg-bg group-data-[selected=true]/cmd-item:text-brass-soft">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <span className="truncate font-sans text-xs font-medium text-paper">
                    Tanya Asisten AI Redaksi
                  </span>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Badge variant="outline" className="border-hairline bg-bg px-1.5 py-0.5 font-mono text-[10px] text-paper-faint">
                    AI
                  </Badge>
                  <CornerDownLeft className="h-3 w-3 text-brass opacity-0 group-data-[selected=true]/cmd-item:opacity-100" aria-hidden="true" />
                </div>
              </Command.Item>
              ) : null}
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
                      <Badge variant="outline" className="border-hairline bg-bg px-1.5 py-0.5 font-mono text-[10px] text-paper-faint">
                        {cmd.category}
                      </Badge>
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
      <AiAssistantDialog organizationId={organizationId} open={assistantOpen} onOpenChange={setAssistantOpen} />
    </>
  );
}

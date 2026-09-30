'use client';

import { LogOut } from 'lucide-react';
import type { ReactElement } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AppTooltip } from '@/ui/app-tooltip';

/**
 * Logout runs a destructive POST only after explicit confirm.
 *
 * @param mode - `icon` renders the compact rail trigger, `button` the labelled form trigger.
 * @param trigger - Element that opens the confirmation, replacing the built-in icon button.
 *   Use it when the surrounding UI already offers a richer affordance, such as the sidebar profile row.
 * @returns The confirmation dialog, opened by its trigger.
 */
export function SignOutDialog({ mode, trigger }: { readonly mode: 'icon' | 'button'; readonly trigger?: ReactElement }) {
  const iconTrigger = trigger ?? (
    <button
      type="button"
      aria-label="Keluar dari workspace"
      className="flex h-7 w-7 items-center justify-center rounded-md text-paper-dim transition-colors duration-150 hover:bg-bg-raised-2 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );

  return (
    <AlertDialog>
      {mode === 'icon' ? (
        <AppTooltip label="Keluar dari workspace" side="right">
          <AlertDialogTrigger render={iconTrigger} />
        </AppTooltip>
      ) : (
        <AlertDialogTrigger className="inline-flex items-center justify-center rounded border border-hairline-strong bg-transparent px-5 py-2.5 font-sans text-sm font-medium text-paper-dim transition-colors duration-180 hover:text-paper">
          Keluar
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <LogOut aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Keluar dari workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            Sesi Anda di perangkat ini akan diakhiri. Masuk kembali untuk melanjutkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <form action="/auth/sign-out" method="post" className="contents">
            <AlertDialogAction type="submit" variant="destructive">
              Ya, keluar
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

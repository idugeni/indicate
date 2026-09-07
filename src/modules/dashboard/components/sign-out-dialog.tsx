'use client';

import { LogOut } from 'lucide-react';

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Logout runs a destructive POST only after explicit confirm. */
export function SignOutDialog({ mode }: { readonly mode: 'icon' | 'button' }) {
  return (
    <AlertDialog>
      {mode === 'icon' ? (
        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <AlertDialogTrigger
                  aria-label="Keluar dari workspace"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-paper-dim transition-colors duration-150 hover:bg-bg-raised-2 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                </AlertDialogTrigger>
              }
            />
            <TooltipContent side="right" className="border border-hairline bg-bg-raised font-sans text-xs text-paper [&>div]:bg-bg-raised">
              Keluar dari workspace
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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

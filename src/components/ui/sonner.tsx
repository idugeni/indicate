'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';

/**
 * Notifikasi dashboard memakai "status strip": rail warna semantik di kiri, chip
 * ikon ber-tint, lalu pesannya dalam Plex Sans (bukan Plex Mono — mono dicadangkan
 * untuk angka persis, bukan kalimat).
 *
 * Tiga trap sonner yang membentuk keputusan di sini:
 *
 * - `unstyled` wajib, bukan sekadar gaya. Aturan kotak sonner menempel pada
 *   `[data-sonner-toast][data-styled=true]` — spesifisitas (0,2,0) yang mengalahkan
 *   utility Tailwind (0,1,0) di elemen yang sama, jadi tanpa `unstyled` token di
 *   bawah ini tidak pernah sampai ke layar. Posisi, tumpukan, dan geser-tutup
 *   hidup pada selector yang mengabaikan `data-styled`, jadi tetap jalan.
 * - `theme` sengaja dibiarkan kosong. Aturan `[data-sonner-theme=dark]` berspesifisitas
 *   (0,4,0) dan memaksa tombol tutup jadi putih di atas lingkaran hitam serta
 *   memaksa `description` jadi putih. Dashboard ini gelap-murni dan memiliki penuh
 *   setiap warna di sini, jadi membiarkan atribut itu `light` membuat aturan tsb
 *   tidak aktif.
 * - Bayangan toast butuh `!important` pada `:focus-visible` karena sonner menimpanya
 *   dengan cincin hitam yang tidak terlihat di atas permukaan gelap.
 *
 * Setiap tipe hanya mengatur `--toast-accent`; rail, tint chip, dan warna ikon
 * semuanya turunan darinya, jadi menambah tipe cukup satu baris.
 */
const TOAST_CLASS_NAMES = {
  toast: [
    'group/toast relative flex w-[22rem] items-center gap-2.5 rounded border border-hairline-strong',
    'border-l-[3px] [border-left-color:var(--toast-accent)] bg-bg-raised-2 py-2.5 pr-8 pl-3.5 font-sans',
    '[--toast-tint:color-mix(in_oklab,var(--toast-accent)_14%,transparent)]',
    'shadow-[0_14px_34px_-14px_rgb(0_0_0/0.85),0_2px_8px_-4px_rgb(0_0_0/0.6)]',
    'focus-visible:[box-shadow:0_14px_34px_-14px_rgb(0_0_0/0.85),0_2px_8px_-4px_rgb(0_0_0/0.6)]!',
    '[&[data-expanded=false][data-front=false]>*]:opacity-0',
  ].join(' '),
  icon: [
    'relative grid size-[1.375rem] shrink-0 place-items-center rounded-[3px]',
    '[background-color:var(--toast-tint)] [color:var(--toast-accent)] [&_svg]:size-[0.875rem]',
  ].join(' '),
  loader: '[color:var(--toast-accent)]',
  content: 'flex min-w-0 flex-1 flex-col gap-1',
  title: 'text-[13px] leading-[1.35] text-pretty text-paper',
  description: 'text-[12px] leading-[1.4] text-pretty text-paper-dim',
  closeButton: [
    'absolute top-2 right-2 grid size-5 place-items-center rounded-[3px] text-paper-faint opacity-0',
    'hover:bg-bg-raised-3 hover:text-paper focus-visible:opacity-100 group-hover/toast:opacity-100',
    // Tanpa hover tidak ada cara menemukan tombol tutup, jadi di sentuh ia selalu tampil.
    '[@media(hover:none)]:opacity-100 [&>svg]:size-3',
    '[transition:opacity_var(--motion-fast)_var(--easing-standard),color_var(--motion-fast)_var(--easing-standard),background-color_var(--motion-fast)_var(--easing-standard)]',
  ].join(' '),
  actionButton: [
    'h-6 shrink-0 self-center rounded border border-brass/40 bg-brass/10 px-2 text-[11px] font-medium text-brass-soft',
    'hover:bg-brass/20 [transition:background-color_var(--motion-fast)_var(--easing-standard)]',
  ].join(' '),
  cancelButton: [
    'h-6 shrink-0 self-center rounded border border-hairline-strong bg-bg-raised px-2 text-[11px] text-paper-dim',
    'hover:bg-bg-raised-3 hover:text-paper [transition:color_var(--motion-fast)_var(--easing-standard),background-color_var(--motion-fast)_var(--easing-standard)]',
  ].join(' '),
  default: '[--toast-accent:var(--paper-dim)]',
  success: '[--toast-accent:var(--signal)]',
  loading: '[--toast-accent:var(--brass-soft)]',
  info: '[--toast-accent:var(--info)]',
  warning: '[--toast-accent:var(--warning)]',
  // Galat butuh perhatian: pesan ditebalkan dan tombolnya tidak disembunyikan,
  // jadi bisa ditutup tanpa memburu toast yang sudah menghilang.
  error: '[--toast-accent:var(--error)] [&_[data-title]]:font-medium [&_[data-close-button]]:opacity-100',
} as const;

/** Satu akar notifikasi gelap untuk seluruh aplikasi, dipasang di root layout. */
export function Toaster(props: Readonly<ToasterProps>) {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={10}
      visibleToasts={4}
      closeButton
      duration={5000}
      containerAriaLabel="Notifikasi"
      icons={{
        success: <CircleCheckIcon />,
        error: <CircleXIcon />,
        warning: <TriangleAlertIcon />,
        info: <InfoIcon />,
        loading: <Loader2Icon className="animate-spin motion-reduce:animate-none" />,
        close: <XIcon />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: TOAST_CLASS_NAMES,
        // Hanya `toastOptions` yang diteruskan ke tiap toast; properti
        // `closeButtonAriaLabel` di level Toaster ada di tipenya tapi diabaikan.
        closeButtonAriaLabel: 'Tutup notifikasi',
      }}
      {...props}
    />
  );
}

'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

export interface PricingPackage {
  readonly id: string;
  readonly name: string;
  readonly plan: string;
  readonly priceIdr: number;
  readonly maxDomains: number | null;
  readonly maxSites: number | null;
  readonly maxMembers: number | null;
  readonly maxApiKeys: number | null;
}

/** Dipakai saat DB tak terjangkau — angkanya harus sama dengan tabel packages. */
export const FALLBACK_PACKAGES: readonly PricingPackage[] = Object.freeze([
  { id: 'starter', name: 'Starter', plan: 'starter', priceIdr: 149000, maxDomains: 10, maxSites: 10, maxMembers: 1, maxApiKeys: 1 },
  { id: 'growth', name: 'Growth', plan: 'growth', priceIdr: 299000, maxDomains: 50, maxSites: 50, maxMembers: 1, maxApiKeys: 3 },
  { id: 'pro', name: 'Pro', plan: 'pro', priceIdr: 550000, maxDomains: 100, maxSites: 100, maxMembers: 10, maxApiKeys: 30 },
  { id: 'enterprise', name: 'Enterprise', plan: 'enterprise', priceIdr: 0, maxDomains: 100, maxSites: 100, maxMembers: 10, maxApiKeys: 30 },
]);

const formatIdr = (value: number) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;

function quotaFeatures(pkg: PricingPackage): readonly string[] {
  switch (pkg.plan) {
    case 'starter':
      return Object.freeze([
        `${pkg.maxDomains ?? 'Banyak'} website berita siap tayang`,
        'Dikelola sendiri, bantuan lewat email',
      ]);
    case 'growth':
      return Object.freeze([
        `${pkg.maxDomains ?? 'Banyak'} website berita siap tayang`,
        'Terbit sekali, tayang di mana-mana',
        'Nyaman dikelola sendiri',
        'Bantuan prioritas yang cepat tanggap',
      ]);
    case 'pro':
      return Object.freeze([
        `${pkg.maxDomains ?? 'Banyak'} website berita siap tayang`,
        `Bisa dipakai ${pkg.maxMembers ?? 'banyak'} orang sekaligus`,
        'Terbit sekali, tayang di mana-mana',
        'Pindahan dari sistem lama kami bantu',
        'Kelola dari HP, kerja dari mana saja',
        'Didampingi sampai jalan',
      ]);
    default:
      return Object.freeze([
        'Cakupan disesuaikan kebutuhan Anda',
        'Sesi perancangan solusi bersama tim kami',
        'Migrasi dan onboarding didampingi penuh',
        'Kontak khusus yang siap dihubungi',
      ]);
  }
}

export function PricingCards({ packages }: { readonly packages: readonly PricingPackage[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
      {packages.map((pkg) => {
        const isEnterprise = pkg.plan === 'enterprise';
        const isFeatured = pkg.plan === 'pro';
        return (
          <article
            key={pkg.id}
            className={`flex flex-col rounded-lg border bg-bg-raised p-5 transition-colors duration-180 sm:p-6 ${isFeatured ? 'border-brass' : 'border-hairline hover:border-hairline-strong'}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="m-0 font-sans text-base font-semibold tracking-tight text-paper">
                {pkg.name}
              </h3>
              {isFeatured ? (
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-brass">
                  Paling laris
                </span>
              ) : null}
            </div>
            <p className="m-0 mt-1 font-sans text-xs text-paper-faint">
              {isEnterprise ? 'Ada kebutuhan khusus? Mari duduk bersama' : 'Per bulan, terima beres'}
            </p>

            <p className="m-0 mt-4 font-mono tabular-nums">
              <span className="text-3xl font-bold tracking-tight text-paper">
                {pkg.priceIdr === 0 ? 'Kustom' : formatIdr(pkg.priceIdr)}
              </span>
              {pkg.priceIdr === 0 ? null : (
                <span className="ml-1 text-xs text-paper-faint">/bln</span>
              )}
            </p>

            <ul className="m-0 mt-5 grid list-none gap-2.5 border-t border-hairline p-0 pt-5 font-sans text-sm leading-relaxed text-paper-dim">
              {quotaFeatures(pkg).map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <Check className="mt-1 h-3.5 w-3.5 flex-none text-signal" aria-hidden="true" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-1">
              {isEnterprise ? (
                <a
                  href="https://wa.me/6285641159405?text=Halo%20Indicate%2C%20saya%20tertarik%20paket%20Enterprise%20(100%20domain).%20Mohon%20jadwal%20peninjauan%20kebutuhan."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center bg-brass px-5 py-2.5 font-sans text-sm font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft"
                >
                  Hubungi via WhatsApp
                </a>
              ) : (
                <Link
                  href="/sign-up"
                  className={`inline-flex w-full items-center justify-center px-5 py-2.5 font-sans text-sm font-semibold transition-colors duration-180 ${
                    isFeatured
                      ? 'bg-brass text-bg hover:bg-brass-soft'
                      : 'border border-hairline-strong text-paper hover:border-paper-faint hover:text-paper'
                  }`}
                >
                  {pkg.plan === 'pro' ? 'Ambil yang Pro' : 'Mulai Sekarang'}
                </Link>
              )}
              <p className="m-0 mt-3 font-sans text-xs leading-relaxed text-paper-faint">
                {isEnterprise
                  ? 'Ceritakan kebutuhan Anda — kami susun penawaran yang pas.'
                  : 'Pesan hari ini, bayar, unggah bukti — tim kami aktifkan untuk Anda.'}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

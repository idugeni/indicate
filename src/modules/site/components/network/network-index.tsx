import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { normalizeTemplateId } from '@/modules/site/components/network/templates/listing-shared';
import { Container } from '@/modules/site/components/network/ui/container';
import type { CategoryNavItem } from '@/modules/site/components/network/ui/nav';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { GlassyBlueShell } from '@/modules/site/components/network/templates/glassy-blue/chrome/shell';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { PurpleEditorialShell } from '@/modules/site/components/network/templates/purple-editorial/chrome/shell';
import { RedEditorialShell } from '@/modules/site/components/network/templates/red-editorial/chrome/shell';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';

export interface IndexPageProps {
  readonly site: NetworkSiteData;
  readonly categories: readonly CategoryNavItem[];
  readonly path?: string | undefined;
}

/**
 * Daftar kanal A–Z penuh, memakai cangkang template tenant yang aktif.
 *
 * @param props - Situs tenant, kanal terurut nama, dan path halaman.
 * @returns Halaman indeks dengan grup huruf.
 */
export function IndexPage({ site, categories, path = '/indeks' }: IndexPageProps) {
  switch (normalizeTemplateId(site.settings.colors.templateId)) {
    case 'black-lime':
      return (
        <BlackLimeShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </BlackLimeShell>
      );
    case 'dark-navy':
      return (
        <DarkNavyShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </DarkNavyShell>
      );
    case 'glassy-blue':
      return (
        <GlassyBlueShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </GlassyBlueShell>
      );
    case 'green-minimal':
      return (
        <GreenMinimalShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </GreenMinimalShell>
      );
    case 'orange-modern':
      return (
        <OrangeModernShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </OrangeModernShell>
      );
    case 'purple-editorial':
      return (
        <PurpleEditorialShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </PurpleEditorialShell>
      );
    case 'red-editorial':
      return (
        <RedEditorialShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </RedEditorialShell>
      );
    case 'soft-blue':
      return (
        <SoftBlueShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </SoftBlueShell>
      );
    case 'warm-editorial':
      return (
        <WarmEditorialShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </WarmEditorialShell>
      );
    case 'clean-blue':
      return (
        <CleanBlueShell site={site} path={path}>
          <IndexContent site={site} categories={categories} />
        </CleanBlueShell>
      );
    default:
      throw new Error('Template site tidak dikenal.');
  }
}

/**
 * Isi daftar kanal A–Z (tanpa cangkang template) agar dapat diuji langsung.
 *
 * @param props - Situs tenant dan kanal terurut nama.
 * @returns Grup huruf kanal berisi artikel beserta catatan sisanya.
 */
/**
 * Daftar kanal A–Z. Sengaja tidak menyaring atau menghitung artikel: `site.articles`
 * hanya memuat artikel halaman Beranda, sehingga kanal yang artikelnya ada di luar
 * halaman itu akan tersembunyi dan jumlah yang tampil bisa jauh di bawah kenyataan.
 * Kanal aktif sudah dibatasi operator lewat `categories.status`.
 */
export function IndexContent({
  site,
  categories,
}: {
  readonly site: NetworkSiteData;
  readonly categories: readonly CategoryNavItem[];
}) {
  const groups = new Map<string, readonly CategoryNavItem[]>();
  for (const item of categories) {
    const letter = (item.label.charAt(0) || '#').toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), item]);
  }
  const letters = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'id'));
  return (
    <Container className="space-y-8 py-6 md:py-8">
      <div>
        <p className="m-0 inline-block rounded-full bg-[var(--tpl-primary-soft,var(--tpl-faint))] px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-[var(--tpl-primary)]">
          Indeks kanal
        </p>
        <h1 className="m-0 mt-3 font-sans text-2xl font-extrabold tracking-tight text-[var(--tpl-ink)] sm:text-3xl">
          Semua kanal liputan
        </h1>
        <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[var(--tpl-muted)]">
          {categories.length === 0
            ? `Belum ada kanal ${site.settings.name} yang diterbitkan.`
            : `Jelajahi ${categories.length} kanal liputan ${site.settings.name}, diurutkan dari A sampai Z.`}
        </p>
      </div>
      {categories.length === 0 ? (
        <p className="m-0 font-sans text-sm text-[var(--tpl-muted)]">Belum ada kanal yang diterbitkan.</p>
      ) : (
        letters.map((letter) => (
          <section key={letter} aria-label={`Kanal huruf ${letter}`}>
            <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-[var(--tpl-ink)]">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tpl-primary-soft,var(--tpl-faint))] font-sans text-sm font-extrabold text-[var(--tpl-primary)]">
                {letter}
              </span>
              <span className="sr-only">Kanal huruf {letter}</span>
            </h2>
            <ul className="m-0 mt-4 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {(groups.get(letter) ?? []).map((item) => (
                <li key={`${item.href}:${item.label}`} className="m-0 p-0">
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-xl bg-[var(--tpl-card)] px-4 py-3 font-sans text-sm font-semibold text-[var(--tpl-ink)] ring-1 ring-[var(--tpl-ring)] transition-colors hover:text-[var(--tpl-primary)]"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Container>
  );
}

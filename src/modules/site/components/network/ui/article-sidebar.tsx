import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ArticleListItem } from '@/modules/delivery/models';
import type { ContactChannel } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import type { SidebarChannel, SidebarTopic } from '@/modules/site/components/network/ui/article-sidebar-data';
import { NewsletterForm } from '@/modules/site/components/network/ui/newsletter-form';
import { articleImage, formatCompactViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/ui/format';

/**
 * Seksi rail editorial: kicker aksen + hairline, tanpa kotak kartu.
 *
 * @param label - Label aria seksi.
 * @param title - Judul tampil seksi.
 * @param children - Isi seksi.
 * @returns Seksi sidebar bertema `--tpl-*`.
 */
function SidebarSection({ label, title, children }: { readonly label: string; readonly title: string; readonly children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="border-t border-[var(--tpl-ring,#e2e8f0)] pt-6 first:border-t-0 first:pt-0"
    >
      <p className="m-0 flex items-center gap-2.5 font-sans text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--tpl-ink,#0f172a)]">
        <span aria-hidden="true" className="h-1 w-7 rounded-full bg-[var(--tpl-primary,#1a5fd0)]" />
        {title}
      </p>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

/**
 * Daftar baca-juga satu kategori untuk rail artikel.
 *
 * @param articles - Artikel terkait yang sudah dipartisi.
 * @returns Null saat kosong.
 */
export function ArticleSidebarBacaJuga({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  if (articles.length === 0) return null;
  return (
    <SidebarSection label="Baca juga" title="Baca Juga">
      <ul className="m-0 list-none divide-y divide-[var(--tpl-ring,#e2e8f0)] p-0">
        {articles.map((item) => {
          const src = articleImage(item);
          return (
            <li key={item.id} className="m-0 flex gap-3.5 py-5 first:pt-0 last:pb-0">
              <Link href={item.href} aria-label={item.title} className="group block flex-none overflow-hidden rounded-lg transition-shadow duration-300 ease-out hover:shadow-md hover:ring-1 hover:ring-black/10 motion-reduce:transition-none">
                <Image
                  unoptimized={!isLocalImageSrc(src)}
                  src={src}
                  alt=""
                  loading="lazy"
                  width={192}
                  height={192}
                  sizes="96px"
                  className="h-24 w-24 object-cover transition-all duration-300 ease-out group-hover:brightness-[1.06] motion-reduce:transition-none"
                />
              </Link>
              <div className="min-w-0 flex-1">
                {item.categoryName === null ? null : (
                  <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-wider text-[var(--tpl-primary,#1a5fd0)]">
                    {item.categoryName}
                  </p>
                )}
                <h3 className="m-0 mt-1 line-clamp-3 font-sans text-[15px] font-bold leading-snug text-[var(--tpl-ink,#0f172a)]">
                  <Link href={item.href} className="transition-colors hover:text-[var(--tpl-primary,#1a5fd0)]">
                    {item.title}
                  </Link>
                </h3>
                <p className="m-0 mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-sans text-xs tabular-nums text-[var(--tpl-muted,#475569)]">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatDate(item.publishedAt, 'short')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {readingMinutes(item)} mnt baca
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </SidebarSection>
  );
}

/**
 * Daftar terpopuler bernomor besar untuk rail artikel.
 *
 * @param articles - Artikel terpopuler yang sudah dipartisi.
 * @returns Null saat kosong.
 */
export function ArticleSidebarTerpopuler({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  if (articles.length === 0) return null;
  return (
    <SidebarSection label="Paling banyak dibaca" title="Terpopuler">
      <ol className="m-0 list-none space-y-5 p-0">
        {articles.map((item, position) => (
          <li key={item.id} className="m-0 flex items-start gap-4 p-0">
            <span
              aria-hidden="true"
              className={`w-10 flex-none font-sans text-4xl font-extrabold tabular-nums leading-none tracking-tight ${position === 0 ? 'text-[var(--tpl-primary,#1a5fd0)]' : 'text-[var(--tpl-faint,#94a3b8)]'}`}
            >
              {position + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="m-0 line-clamp-2 font-sans text-[15px] font-bold leading-snug text-[var(--tpl-ink,#0f172a)]">
                <Link href={item.href} className="transition-colors hover:text-[var(--tpl-primary,#1a5fd0)]">
                  {item.title}
                </Link>
              </h3>
              <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-sans text-xs tabular-nums text-[var(--tpl-muted,#475569)]">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                  {formatCompactViews(item.viewCount)} pembaca
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SidebarSection>
  );
}

/**
 * Daftar terbaru ringkas untuk rail artikel.
 *
 * @param articles - Artikel terbaru yang sudah dipartisi.
 * @returns Null saat kosong.
 */
export function ArticleSidebarTerbaru({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  if (articles.length === 0) return null;
  return (
    <SidebarSection label="Artikel terbaru" title="Terbaru">
      <ul className="m-0 list-none divide-y divide-[var(--tpl-ring,#e2e8f0)] p-0">
        {articles.map((item) => (
          <li key={item.id} className="m-0 min-w-0 p-0 py-3.5 first:pt-0 last:pb-0">
            <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-wider text-[var(--tpl-primary,#1a5fd0)]">
              {item.categoryName ?? formatDate(item.publishedAt, 'short')}
            </p>
            <h3 className="m-0 mt-1 line-clamp-2 font-sans text-sm font-semibold leading-snug text-[var(--tpl-ink,#0f172a)]">
              <Link href={item.href} className="transition-colors hover:text-[var(--tpl-primary,#1a5fd0)]">
                {item.title}
              </Link>
            </h3>
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}

/**
 * Kartu newsletter ringkas untuk rail artikel.
 *
 * @returns Formulir nonaktif hingga backend newsletter tersedia.
 */
export function ArticleSidebarNewsletter() {
  return (
    <section
      aria-label="Berlangganan newsletter"
      className="overflow-hidden rounded-2xl bg-[var(--tpl-primary,#1a5fd0)]/[0.07] p-5 ring-1 ring-[var(--tpl-primary,#1a5fd0)]/15"
    >
      <p className="m-0 font-sans text-base font-extrabold tracking-tight text-[var(--tpl-ink,#0f172a)]">
        Jangan lewatkan kabar penting
      </p>
      <p className="m-0 mt-1 font-sans text-[13px] leading-relaxed text-[var(--tpl-muted,#475569)]">
        Ringkasan berita dikirim ke email setiap pagi.
      </p>
      <NewsletterForm
        inputId="article-sidebar-newsletter-email"
        formClassName="mt-4 flex flex-col gap-2"
        inputClassName="h-10 w-full rounded-xl px-3 font-sans text-sm"
        buttonClassName="h-10 w-full rounded-xl px-4 font-sans text-sm"
      />
    </section>
  );
}

/**
 * Awan topik dari agregat tag situs.
 *
 * @param topics - Topik teratas beserta jumlahnya.
 * @returns Null saat kosong.
 */
export function ArticleSidebarTopik({ topics }: { readonly topics: readonly SidebarTopic[] }) {
  if (topics.length === 0) return null;
  return (
    <SidebarSection label="Topik populer" title="Topik">
      <p className="m-0 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.tag}
            href={`/tags/${encodeURIComponent(topic.tag)}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tpl-primary,#1a5fd0)]/[0.06] px-3 py-1.5 font-sans text-xs font-semibold text-[var(--tpl-ink,#0f172a)] transition-colors hover:bg-[var(--tpl-primary,#1a5fd0)] hover:text-white"
          >
            #{topic.tag}
          </Link>
        ))}
      </p>
    </SidebarSection>
  );
}

/**
 * Daftar kanal beserta jumlah artikelnya.
 *
 * @param channels - Kanal teratas beserta jumlahnya.
 * @returns Null saat kosong.
 */
export function ArticleSidebarKanal({ channels }: { readonly channels: readonly SidebarChannel[] }) {
  if (channels.length === 0) return null;
  return (
    <SidebarSection label="Kanal berita" title="Kanal">
      <ul className="m-0 list-none divide-y divide-[var(--tpl-ring,#e2e8f0)] p-0">
        {channels.map((channel) => (
          <li key={channel.slug} className="m-0 p-0">
            <Link
              href={`/categories/${channel.slug}`}
              className="group flex items-center justify-between gap-3 py-2.5"
            >
              <span className="min-w-0 truncate font-sans text-sm font-semibold text-[var(--tpl-ink,#0f172a)] transition-colors group-hover:text-[var(--tpl-primary,#1a5fd0)]">
                {channel.name}
              </span>
              <span className="inline-flex flex-none items-center gap-1.5 font-sans text-xs tabular-nums text-[var(--tpl-muted,#475569)]">
                {channel.count}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}

/**
 * Tautan ikuti situs dan penerbit untuk rail artikel.
 *
 * @param channels - Kanal kontak yang sudah di-resolve.
 * @returns Null saat kosong.
 */
export function ArticleSidebarIkutiKami({ channels }: { readonly channels: readonly ContactChannel[] }) {
  if (channels.length === 0) return null;
  return (
    <SidebarSection label="Ikuti kami" title="Ikuti Kami">
      <p className="m-0 flex flex-wrap gap-2">
        {channels.slice(0, 8).map((channel) => {
          const Icon = channelIcon(channel.key);
          return (
            <a
              key={channel.key}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={channel.label}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tpl-primary,#1a5fd0)]/[0.06] text-[var(--tpl-ink,#0f172a)] transition-colors hover:bg-[var(--tpl-primary,#1a5fd0)] hover:text-white"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </a>
          );
        })}
      </p>
    </SidebarSection>
  );
}

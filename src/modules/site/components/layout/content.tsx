import type { HTMLAttributes, ReactNode } from 'react';
import { Fragment } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  Copy,
  DatabaseBackup,
  DoorOpen,
  Globe,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lock,
  Mail,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Palette,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  ScrollText,
  Tag,
  Zap,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { NavigationLink } from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';

/** Single public content width (max-w-6xl); text rhythm lives in typography. */
export function Container({
  className,
  children,
  ...props
}: {
  readonly className?: string;
  readonly children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-6', className)} {...props}>
      {children}
    </div>
  );
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

export const CARD_CLASS =
  'group flex flex-col gap-4 rounded-[3px] border border-[#e2ded2] bg-[#f4f2ec] p-6 transition-colors duration-180 hover:border-[#b88d3a]/70 hover:bg-white sm:p-7';

export const ICON_BOX_CLASS = 'flex h-10 w-10 flex-none items-center justify-center rounded-[3px] border border-[#b88d3a]/40 bg-[#b88d3a]/[0.08] text-[#8a5f1c] transition-colors duration-180 group-hover:border-[#b88d3a]/70 group-hover:bg-[#b88d3a]/[0.14]';

export function NumberMark({ index, className }: { readonly index: number; readonly className?: string }) {
  return (
    <span className={cn('font-mono text-[11px] font-semibold tracking-[0.12em] text-[#8a5f1c] tabular-nums', className)}>
      {String(index + 1).padStart(2, '0')}
    </span>
  );
}

export function PrimaryCta({
  href,
  children,
  className,
}: {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[3px] bg-[#1a2430] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-180 hover:bg-[#2b3a4b]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
  className,
}: {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[3px] border border-[#1a2430]/15 bg-white/70 px-5 py-2.5 font-sans text-sm font-semibold text-[#1a2430] transition-colors duration-180 hover:border-[#1a2430]/30 hover:bg-white',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function HeaderPrimaryCta({
  href,
  children,
  className,
}: {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[3px] bg-[#b88d3a] px-5 py-2.5 font-sans text-sm font-bold text-[#1a2430] transition-colors duration-180 hover:bg-[#e8c87a]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function HeaderSecondaryCta({
  href,
  children,
  className,
}: {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[3px] border border-white/25 bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-[#f4f2ec] transition-colors duration-180 hover:border-white/50 hover:bg-white/10',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Prose rhythm + typography; width always belongs to the container, never max-w here. */
export function Prose({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <div className={cn('grid w-full gap-5 font-sans text-[15px] leading-[1.85] text-[#4c5b6b] [&_a]:text-[#8a5f1c] [&_a]:underline [&_a]:decoration-[#b88d3a]/60 [&_a]:underline-offset-4 hover:[&_a]:text-[#1a2430] [&_li::marker]:text-[#8a5f1c]', className)}>{children}</div>;
}

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  readonly title?: string;
  readonly description?: string;
  readonly eyebrow?: string;
  readonly children?: ReactNode;
  /** Vertical rhythm variant for long pages. */
  readonly tone?: 'default' | 'raised' | 'soft' | 'warm' | 'band';
}

/**
 * Public page section: vertical rhythm (py-16 md:py-24) + optional tone
 * background/border + exactly one inner Container.
 *
 * Bare usage (no title/description/eyebrow, e.g. /contact WhatsAppCard,
 * /privacy + /terms LegalDocument): renders Container + children with no
 * header. Rhythm then comes from the section padding alone — pass
 * aria-label in that case so the section stays labelled for AT.
 *
 * Titled sections auto-number via the `site-section` CSS counter reset by
 * PublicPage; the number is decorative (aria-hidden), DOM order carries AT.
 * Tone `band` is the ink break band (dark); all other tones stay on paper.
 */
export function Section({
  title,
  description,
  eyebrow,
  children,
  tone = 'default',
  className,
  id,
  ...props
}: SectionProps) {
  const resolvedId = id ?? (title ? slugify(title) : undefined);
  const headingId = title && resolvedId ? `${resolvedId}-heading` : undefined;
  const hasEyebrow = Boolean(eyebrow);
  const isDark = tone === 'band';

  return (
    <section
      id={resolvedId}
      aria-labelledby={headingId}
      className={cn(
        'py-16 md:py-24',
        title && '[counter-increment:site-section]',
        tone === 'raised' && 'border-y border-[#e2ded2] bg-[#faf9f5]',
        tone === 'soft' && 'bg-white/70',
        tone === 'warm' && 'bg-[#b88d3a]/[0.07]',
        tone === 'band' && 'border-y border-[#1a2430] bg-[#1a2430]',
        className,
      )}
      {...props}
    >
      <Container>
        {title || description || eyebrow ? (
          <header className="mb-10 grid gap-6 md:mb-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:items-end">
            <div>
              {title ? (
                <div aria-hidden="true" className="mb-4 flex items-center gap-3">
                  <span
                    className={cn(
                      'font-mono text-[11px] font-semibold tracking-[0.18em] tabular-nums before:content-[counter(site-section,decimal-leading-zero)]',
                      isDark ? 'text-[#e8c87a]' : 'text-[#8a5f1c]',
                    )}
                  />
                  <span aria-hidden="true" className={cn('h-px w-8', isDark ? 'bg-[#e8c87a]/60' : 'bg-[#b88d3a]/70')} />
                </div>
              ) : null}
              {eyebrow ? (
                <p
                  className={cn(
                    'm-0 inline-flex items-center rounded-[3px] border px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase',
                    isDark
                      ? 'border-[#e8c87a]/50 bg-[#e8c87a]/10 text-[#e8c87a]'
                      : 'border-[#b88d3a]/50 bg-[#b88d3a]/[0.08] text-[#8a5f1c]',
                  )}
                >
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <div className={cn('flex items-stretch gap-4', hasEyebrow && 'mt-4')}>
                  <span aria-hidden="true" className={cn('w-1 flex-none', isDark ? 'bg-[#e8c87a]/70' : 'bg-[#b88d3a]/70')} />
                  <h2
                    id={headingId}
                    className={cn(
                      'm-0 max-w-xl font-sans text-3xl font-extrabold leading-[1.08] tracking-tight text-balance sm:text-4xl',
                      isDark ? 'text-[#f4f2ec]' : 'text-[#1a2430]',
                    )}
                  >
                    {title}
                  </h2>
                </div>
              ) : null}
            </div>
            {description ? (
              <p
                className={cn(
                  'm-0 max-w-xl font-sans text-base leading-relaxed text-pretty lg:justify-self-end',
                  isDark ? 'text-[#f4f2ec]/75' : 'text-[#4c5b6b]',
                )}
              >
                {description}
              </p>
            ) : null}
          </header>
        ) : null}
        {children}
      </Container>
    </section>
  );
}

export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {  readonly title: string;
  readonly description?: string | undefined;
  readonly eyebrow?: string | undefined;
  readonly actions?: ReactNode | undefined;
  readonly meta?: readonly string[] | undefined;
  /** Breadcrumb trail above the title; page title becomes the last crumb. */
  readonly crumbs?: readonly NavigationLink[] | undefined;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
  crumbs,
  className,
  ...props
}: PageHeaderProps) {
  const hasEyebrow = Boolean(eyebrow);
  return (
    <header
      className={cn('relative overflow-hidden bg-[#1a2430] pt-10 pb-14 text-[#f4f2ec] md:pt-14 md:pb-20', className)}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(52rem_30rem_at_50%_-12rem,rgba(184,141,58,0.22),transparent_70%),linear-gradient(rgba(244,242,236,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(244,242,236,0.05)_1px,transparent_1px)] bg-[size:auto,3rem_3rem,3rem_3rem] [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]"
      />
      <Container className="relative">
        {crumbs && crumbs.length > 0 ? (
          <Breadcrumb className="mb-8">
            <BreadcrumbList className="font-mono text-[11px]">
              {crumbs.map((crumb) => (
                <Fragment key={crumb.href}>
                  <BreadcrumbItem>
                    <Link href={crumb.href} className="text-[#f4f2ec]/55 transition-colors hover:text-[#e8c87a]">
                      {crumb.label}
                    </Link>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-[#f4f2ec]/30" />
                </Fragment>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[#f4f2ec]/85">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            {eyebrow ? (
              <p className="m-0 inline-flex items-center rounded-[3px] border border-[#e8c87a]/50 bg-[#e8c87a]/10 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e8c87a]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className={cn(
              'm-0 max-w-3xl font-sans text-4xl font-extrabold leading-[1.02] tracking-tight text-balance text-[#f4f2ec] sm:text-6xl',
              hasEyebrow && 'mt-4',
            )}>
              {title}
            </h1>
            <span aria-hidden="true" className="mt-6 block h-1 w-16 bg-[#b88d3a]" />
            {description ? (
              <p className="m-0 mt-6 max-w-2xl font-sans text-base leading-relaxed text-[#f4f2ec]/75">
                {description}
              </p>
            ) : null}
          </div>
          {(meta && meta.length > 0) || actions ? (
            <aside aria-label="Ringkasan halaman" className="lg:col-span-5">
              <div className="rounded-[3px] border border-white/10 bg-white/[0.04] p-6 sm:p-7">
                {meta && meta.length > 0 ? (
                  <ul className="m-0 grid list-none p-0 font-mono text-[11px] uppercase tracking-[0.08em] text-[#f4f2ec]/70">
                    {meta.map((item, index) => (
                      <li
                        key={item}
                        className="flex items-center gap-3 border-b border-white/10 py-2.5 first:pt-0 last:border-0 last:pb-0"
                      >
                        <span aria-hidden="true" className="font-semibold tabular-nums text-[#b88d3a]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {actions ? <div className="mt-6 grid gap-3">{actions}</div> : null}
              </div>
            </aside>
          ) : null}
        </div>
      </Container>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-[#b88d3a]" />
    </header>
  );
}

export interface FeatureItemLike {
  readonly title?: string;
  readonly term?: string;
  readonly description?: string;
  readonly detail?: string;
  readonly icon?: ReactNode;
  readonly href?: string;
}

export interface FeatureGridProps extends HTMLAttributes<HTMLDivElement> {
  readonly items?: readonly FeatureItemLike[];
  readonly columns?: 2 | 3 | 4;
  readonly children?: ReactNode;
}

export function FeatureGrid({
  items,
  columns = 3,
  children,
  className,
  ...props
}: FeatureGridProps) {
  const colClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  if (items && items.length > 0) {
    return (
      <div
        className={cn(
          'grid gap-px overflow-hidden rounded-[3px] border border-[#e2ded2] bg-[#e2ded2]',
          colClass,
          className,
        )}
        {...props}
      >
        {items.map((item, idx) => {
          const heading = item.title ?? item.term;
          const text = item.description ?? item.detail;
          const isExternal = item.href !== undefined && /^https?:/.test(item.href);

          const row = (
            <div className="flex h-full flex-col gap-3">
              <div className="flex items-center gap-3">
                {item.icon ? <span className={ICON_BOX_CLASS}>{item.icon}</span> : null}
                <NumberMark index={idx} className="tabular-nums" />
                {item.href ? (
                  <ArrowUpRight
                    aria-hidden="true"
                    className="ml-auto h-4 w-4 flex-none text-[#5f6b7a] transition-all duration-180 group-hover:translate-x-0.5 group-hover:text-[#8a5f1c]"
                  />
                ) : null}
              </div>

              {heading ? (
                <h3 className="m-0 font-sans text-[15px] font-bold tracking-tight text-[#1a2430]">
                  {heading}
                </h3>
              ) : null}

              {text ? (
                <p className="m-0 font-sans text-sm leading-relaxed text-[#4c5b6b]">
                  {text}
                </p>
              ) : null}
            </div>
          );

          return item.href ? (
            <a
              key={heading ?? idx}
              href={item.href}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="group bg-white p-6 transition-colors duration-180 hover:bg-[#faf9f5] sm:p-7"
            >
              {row}
            </a>
          ) : (
            <div key={heading ?? idx} className="group bg-white p-6 transition-colors duration-180 hover:bg-[#faf9f5] sm:p-7">
              {row}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', colClass, className)} {...props}>
      {children}
    </div>
  );
}

export interface DocSectionItem {
  readonly heading: string;
  readonly body: string;
}

/**
 * Legal document rendering for /terms + /privacy: a flowing ruled document,
 * not cards. The TOC is a compact index with hairline rules and the sections
 * stack full-width with dividers. Body copy is justified for a formal legal feel.
 */
export function LegalDocument({ items }: { readonly items: readonly DocSectionItem[] }) {
  return (
    <div className="mx-auto w-full">
      <nav
        aria-label="Daftar isi"
        className="rounded-[3px] border border-[#e2ded2] bg-white px-4 py-4 sm:px-5"
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-[#5f6b7a]">
            Daftar Isi
          </p>
          <p className="m-0 font-mono text-[11px] tabular-nums tracking-wide text-[#5f6b7a]">
            {items.length} bagian
          </p>
        </div>
        <ol className="m-0 mt-3 grid list-none gap-x-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((section, index) => (
            <li key={section.heading} className="border-b border-[#e2ded2]/60">
              <a
                href={`#${slugify(section.heading)}`}
                className="group flex items-baseline gap-2.5 py-2 font-sans text-[13px] leading-snug text-[#4c5b6b] transition-colors hover:text-[#1a2430]"
              >
                <span className="flex-none font-mono text-[10px] tabular-nums text-[#8a5f1c]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="decoration-[#b88d3a]/60 underline-offset-4 group-hover:underline">
                  {section.heading}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-12 md:mt-16">
        {items.map((section, index) => (
          <article
            key={section.heading}
            id={slugify(section.heading)}
            className={cn(
              'scroll-mt-28',
              index > 0 && 'mt-10 border-t border-[#e2ded2] pt-10 md:mt-12 md:pt-12',
            )}
          >
            <p className="m-0 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tabular-nums tracking-[0.14em] text-[#8a5f1c]">
              <span aria-hidden="true" className="h-1.5 w-1.5 flex-none bg-[#b88d3a]" />
              Bagian {String(index + 1).padStart(2, '0')}
            </p>
            <h2 className="m-0 mt-2 font-sans text-xl font-bold leading-[1.25] tracking-tight text-balance text-[#1a2430] md:text-2xl">
              {section.heading}
            </h2>
            <p className="m-0 mt-3.5 text-justify font-sans text-[15px] leading-[1.9] text-[#4c5b6b] hyphens-auto">
              {section.body}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

export interface StatBandItem {
  readonly value: string;
  readonly label: string;
}

export function StatBand({ items }: { readonly items: readonly StatBandItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-[#1a2430] bg-[#f4f2ec]/20 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-[#1a2430] p-6 sm:p-8">
          <span aria-hidden="true" className="mb-4 block h-0.5 w-8 bg-[#b88d3a]" />
          <dd className="m-0 font-sans text-4xl font-extrabold tabular-nums tracking-tight text-[#f4f2ec] sm:text-5xl">
            {item.value}
          </dd>
          <dt className="mt-2 font-mono text-[11px] uppercase leading-snug tracking-[0.14em] text-[#e8c87a]">
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

export interface FaqGridItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category: string;
}

export interface FaqGroup {
  readonly category: string;
  readonly items: readonly FaqGridItem[];
}

/** Kategori fallback untuk FAQ lama yang `category`-nya masih NULL. */
export const DEFAULT_FAQ_CATEGORY = 'Umum';

/** Normalize raw FAQ items (static/DB) to grid form; shared by /faq and /pricing. */
export function toFaqGridItems(
  items: readonly { readonly id?: string | null; readonly question: string; readonly answer: string; readonly category?: string | null }[],
  limit?: number,
): FaqGridItem[] {
  const sliced = typeof limit === 'number' ? items.slice(0, limit) : items;
  return sliced.map((item, index) => ({
    id: item.id ?? `faq-${index + 1}`,
    question: item.question,
    answer: item.answer,
    category: item.category?.trim() === '' || item.category == null ? DEFAULT_FAQ_CATEGORY : item.category.trim(),
  }));
}

/**
 * Groups FAQ items by category, preserving first-seen order.
 *
 * @param items - Normalized FAQ items in display order.
 * @returns Non-empty groups in first-seen category order.
 */
export function groupFaqItems(items: readonly FaqGridItem[]): FaqGroup[] {
  const order: string[] = [];
  const byCategory = new Map<string, FaqGridItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category);
    if (list === undefined) {
      order.push(item.category);
      byCategory.set(item.category, [item]);
    } else {
      list.push(item);
    }
  }
  return order.map((category) => ({ category, items: byCategory.get(category) ?? [] }));
}

/** Interactive FAQ variant; `hiddenUntilFound` keeps answers findable and crawlable. */
export function FaqAccordion({ items }: { readonly items: readonly FaqGridItem[] }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Accordion hiddenUntilFound className="grid w-full gap-4">
        {items.map((faq, index) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            id={faq.id}
            className="scroll-mt-24 rounded-[3px] border border-[#e2ded2] bg-white px-5 transition-colors duration-180 hover:border-[#b88d3a]/60 sm:px-6"
          >
            <AccordionTrigger className="gap-4 py-5 text-left hover:no-underline">
              <NumberMark index={index} className="flex-none tabular-nums" />
              <span className="m-0 flex-1 font-sans text-sm font-bold tracking-tight text-[#1a2430] sm:text-base">
                {faq.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pl-10">
              <p className="m-0 max-w-2xl border-l-2 border-[#b88d3a]/50 pl-4 font-sans text-sm leading-relaxed text-[#4c5b6b]">
                {faq.answer}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/** Single icon authority for public card grids; raw data stays text-only. */
export function withIcons<T extends FeatureItemLike>(
  items: readonly T[],
  icons: readonly LucideIcon[],
): (T & { readonly icon: ReactNode })[] {
  return items.map((item, index) => {
    const Icon = icons[index % icons.length];
    if (!Icon) return { ...item, icon: undefined };
    return { ...item, icon: <Icon className="h-4 w-4" aria-hidden="true" /> };
  });
}

export const USE_CASE_ICONS: readonly LucideIcon[] = [Building2, Landmark, Briefcase, GraduationCap];

export const CAPABILITY_ICONS: readonly LucideIcon[] = [
  Newspaper,
  Send,
  Lock,
  Palette,
  Search,
  MessageCircle,
  Globe,
  ScrollText,
  HeartHandshake,
];

export const VALUE_ICONS: readonly LucideIcon[] = [
  Copy,
  LayoutDashboard,
  ShieldCheck,
  Smartphone,
  KeyRound,
  Tag,
];

export const GUARANTEE_ICONS: readonly LucideIcon[] = [Zap, DatabaseBackup, ArrowLeftRight, DoorOpen];

export const PRINCIPLE_ICONS: readonly LucideIcon[] = [
  BadgeCheck,
  Tag,
  KeyRound,
  MessagesSquare,
  Scale,
  ClipboardCheck,
];

export const CHANNEL_ICONS: readonly LucideIcon[] = [Mail, MessageCircle, Send, CalendarCheck];

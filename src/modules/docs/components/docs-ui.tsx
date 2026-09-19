import Link from 'next/link';
import type { ReactNode } from 'react';

import { CopyButton } from '@/modules/docs/components/copy-button';
import { DocsNav } from '@/modules/docs/components/docs-nav';

export function DocsShell({ host, children }: { readonly host: string; readonly children: ReactNode }) {
  return (
    <div className="min-h-screen supports-[min-height:100svh]:min-h-svh bg-white font-sans text-slate-900 antialiased">
      <a
        href="#docs-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a5fd0] font-sans text-sm font-extrabold text-white">
              i
            </span>
            <span className="font-sans text-base font-extrabold tracking-tight text-slate-900">
              Indicate <span className="font-medium text-slate-500">Docs</span>
            </span>
          </Link>
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] text-slate-600 sm:inline">v1</span>
          <span className="flex-1" />
          <Link href="/openapi.json" className="rounded-lg px-3 py-1.5 font-mono text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
            openapi.json
          </Link>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <DocsNav />
          <p className="m-0 mt-6 hidden rounded-xl bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-500 lg:block">
            Host: {host}
          </p>
        </div>
        <main id="docs-content" tabIndex={-1} className="min-w-0">
          {children}
        </main>
      </div>
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 font-sans text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="m-0">Dokumentasi API Indicate — kontrak mengikuti skema server; bila berbeda, perilaku server yang menang.</p>
          <p className="m-0">
            <Link href="/openapi.json" className="font-medium text-[#1a5fd0] hover:underline">openapi.json</Link>
            {' · '}
            <Link href="/errors" className="font-medium text-[#1a5fd0] hover:underline">Error & rate limit</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

export function DocTitle({ title, description }: { readonly title: string; readonly description: string }) {
  return (
    <div>
      <h1 className="m-0 font-sans text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      <p className="m-0 mt-3 max-w-2xl font-sans text-[17px] leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

export function DocH2({ children }: { readonly children: ReactNode }) {
  return <h2 className="m-0 mb-3 mt-10 font-sans text-xl font-bold tracking-tight text-slate-900">{children}</h2>;
}

export function DocP({ children }: { readonly children: ReactNode }) {
  return <p className="m-0 mt-3 max-w-3xl font-sans text-[15px] leading-[1.8] text-slate-700">{children}</p>;
}

export function DocCode({ language, code }: { readonly language: string; readonly code: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
        <span className="font-mono text-[11px] text-slate-400">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="m-0 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-slate-100">{code}</pre>
    </div>
  );
}

export function DocTable({ head, rows }: { readonly head: readonly string[]; readonly rows: readonly (readonly ReactNode[])[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-slate-200">
      <table className="w-full border-collapse bg-white font-sans text-sm">
        <thead>
          <tr className="bg-slate-50">
            {head.map((cell) => (
              <th key={cell} scope="col" className="border-b border-slate-200 px-4 py-2.5 text-left font-sans text-xs font-bold uppercase tracking-wider text-slate-500">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-100 last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2.5 align-top text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocCallout({ tone, children }: { readonly tone: 'info' | 'warn'; readonly children: ReactNode }) {
  const styles = tone === 'info' ? 'border-[#1a5fd0]/30 bg-[#1a5fd0]/5' : 'border-amber-300 bg-amber-50';
  return <div className={`mt-4 rounded-xl border p-4 font-sans text-sm leading-relaxed text-slate-700 ${styles}`}>{children}</div>;
}

export function InlineCode({ children }: { readonly children: ReactNode }) {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">{children}</code>;
}

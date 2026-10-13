import type { Viewport } from 'next';
import type { ReactNode } from 'react';

import { TemplateMemory } from '@/modules/site/components/template-memory';
import { LOCKED_ZOOM_VIEWPORT } from '@/ui/locked-viewport';

/** Neutral fallback; the tenant bootstrap synchronizes browser chrome with the rendered template. */
export const viewport: Viewport = {
  ...LOCKED_ZOOM_VIEWPORT,
  themeColor: '#ffffff',
  colorScheme: 'light',
};

/**
 * Synchronously reconcile the document canvas and browser chrome with the
 * rendered tenant template before the first paint.
 *
 * @remarks Keep this allowlist aligned with TEMPLATE_CANVAS in template-memory.
 * Updating only the root CSS property left the color-scheme meta tag stale;
 * on mobile browsers that can make toolbar/canvas transitions expose a strip
 * with the default color while the browser chrome collapses during scrolling.
 */
const TEMPLATE_CHROME_BOOTSTRAP = `try{var e=document.querySelector('[data-template]'),t=e&&e.getAttribute('data-template'),c={'clean-blue':'#f5f8fd','black-lime':'#0a0c07','dark-navy':'#070f22','glassy-blue':'#edf4ff','green-minimal':'#f7faf7','orange-modern':'#fff9f4','purple-editorial':'#f8f7ff','red-editorial':'#fffafa','soft-blue':'#f1f6ff','warm-editorial':'#fdf7f0'},r=c[t],d=t==='black-lime'||t==='dark-navy',s=d?'dark':'light';if(r){document.documentElement.style.backgroundColor=r;document.body.style.backgroundColor=r;document.documentElement.style.colorScheme=s;document.body.style.colorScheme=s;var m=document.querySelector('meta[name="theme-color"]');m&&(m.content=r);var q=document.querySelector('meta[name="color-scheme"]');q&&(q.content=s)}}catch(e){ }`;

/**
 * Tenant layout. The script is synchronous so browser chrome is aligned with
 * the rendered tenant before the first paint; TemplateMemory mirrors it after
 * hydration and persists the host-scoped template cookie.
 */
export default function NetworkLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <TemplateMemory />
      {children}
      <script id="__indicateTenantChrome" dangerouslySetInnerHTML={{ __html: TEMPLATE_CHROME_BOOTSTRAP }} />
    </>
  );
}

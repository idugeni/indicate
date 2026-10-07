import type { Viewport } from 'next';
import type { ReactNode } from 'react';

import { TemplateMemory } from '@/modules/site/components/template-memory';
import { LOCKED_ZOOM_VIEWPORT } from '@/ui/locked-viewport';

/** Light tenant default; the synchronous bootstrap below corrects dark chrome after the template shell is present. */
export const viewport: Viewport = {
  ...LOCKED_ZOOM_VIEWPORT,
  themeColor: '#ffffff',
  colorScheme: 'light',
};

/**
 * Synchronously reconcile browser chrome with the rendered tenant template.
 *
 * @remarks This runs after the template shell markup, unlike useEffect.
 * That closes the cold-load race where Android Chrome can capture the static
 * light theme-color before TemplateMemory mounts. The allowlist is local and
 * only maps known template ids to colours.
 */
const TEMPLATE_CHROME_BOOTSTRAP = `try{var e=document.querySelector('[data-template]'),t=e&&e.getAttribute('data-template'),c={'clean-blue':'#f5f8fd','black-lime':'#0a0c07','dark-navy':'#070f22','glassy-blue':'#edf4ff','green-minimal':'#f7faf7','orange-modern':'#fff9f4','purple-editorial':'#f8f7ff','red-editorial':'#fffafa','soft-blue':'#f1f6ff','warm-editorial':'#fdf7f0'},r=c[t];if(r){document.documentElement.style.backgroundColor=r;document.body.style.backgroundColor=r;var m=document.querySelector('meta[name="theme-color"]');m&&(m.content=r);document.documentElement.style.colorScheme=({'black-lime':1,'dark-navy':1}[t]?'dark':'light')}}catch(e){ }`;

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
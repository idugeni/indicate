'use client';

import { useEffect } from 'react';

export const TEMPLATE_CANVAS_FALLBACK = '#f5f8fd';

/**
 * Canvas background per portal template, mirroring the `body:has()` rules in
 * `globals.css` so the loading overlay can pre-paint the right canvas.
 */
const TEMPLATE_CANVAS: Readonly<Record<string, string>> = {
  'clean-blue': '#f5f8fd',
  'black-lime': '#0a0c07',
  'dark-navy': '#070f22',
  'glassy-blue': '#edf4ff',
  'green-minimal': '#f7faf7',
  'orange-modern': '#fff9f4',
  'purple-editorial': '#f8f7ff',
  'red-editorial': '#fffafa',
  'soft-blue': '#f1f6ff',
  'warm-editorial': '#fdf7f0',
};

/**
 * Resolve the loading overlay background for a remembered template.
 *
 * @param templateId - Template id from the `indicate-template` cookie, if any.
 * @returns Canvas hex from the allowlist, or the neutral fallback for unknown values.
 */
export function overlayForTemplate(templateId: string | null): string {
  if (templateId === null) return TEMPLATE_CANVAS_FALLBACK;
  return TEMPLATE_CANVAS[templateId] ?? TEMPLATE_CANVAS_FALLBACK;
}

/**
 * Templates whose canvas is dark. Browser chrome (the Android Chrome toolbar,
 * the iOS status bar) is painted from `theme-color`, and the network layout
 * declares a light `#ffffff` for every portal, so on these templates the
 * toolbar shows as a white strip, most visibly when it sits at the bottom.
 */
const DARK_TEMPLATES: ReadonlySet<string> = new Set(['black-lime', 'dark-navy']);

/**
 * Browser chrome colours for a rendered template.
 *
 * @param templateId - Template id read from the DOM, if any.
 * @returns `theme-color` plus `color-scheme` for a dark template, or `null`
 * to leave the layout's light default untouched.
 */
export function chromeForTemplate(templateId: string | null): { readonly themeColor: string; readonly colorScheme: 'dark' } | null {
  if (templateId === null || !DARK_TEMPLATES.has(templateId)) return null;
  const themeColor = TEMPLATE_CANVAS[templateId];
  return themeColor === undefined ? null : { themeColor, colorScheme: 'dark' };
}

/**
 * Remember the rendered portal template in a host-scoped cookie.
 *
 * @returns Nothing rendered; writes `indicate-template` once per mount.
 * @remarks Cookie stays host-scoped (no `Domain`), Lax, and value-checked
 * against the canvas allowlist on read, so a forged value can only select a
 * background color, never content or a destination.
 */
export function TemplateMemory() {
  useEffect(() => {
    const templateId = document.querySelector('[data-template]')?.getAttribute('data-template') ?? null;
    if (templateId === null || templateId === '' || TEMPLATE_CANVAS[templateId] === undefined) return;
    document.cookie = `indicate-template=${templateId}; path=/; max-age=31536000; SameSite=Lax`;
    const chrome = chromeForTemplate(templateId);
    if (chrome === null) return;
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = chrome.themeColor;
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="color-scheme"]')) meta.content = chrome.colorScheme;
  }, []);
  return null;
}

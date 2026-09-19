'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ORG_KEY = 'tg-org';

type ColorScheme = 'light' | 'dark';
type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

interface MiniAppBackButton {
  show(): void;
  hide(): void;
  onClick(fn: () => void): void;
  offClick(fn: () => void): void;
}

interface MiniAppMainButton {
  show(): void;
  hide(): void;
  onClick(fn: () => void): void;
  offClick(fn: () => void): void;
  setParams(params: Record<string, unknown>): void;
  showProgress?: (leaveActive?: boolean) => void;
  hideProgress?: () => void;
}

interface MiniAppHaptic {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(kind: 'error' | 'success' | 'warning'): void;
}

interface MiniAppCloudStorage {
  getItem(key: string, callback: (error: unknown, value?: string) => void): void;
  setItem(key: string, value: string, callback?: (error: unknown, stored?: boolean) => void): void;
}

interface MiniAppInsets {
  readonly top?: number;
  readonly bottom?: number;
}

interface MiniAppWebApp {
  readonly colorScheme?: ColorScheme | string;
  readonly BackButton?: MiniAppBackButton;
  readonly MainButton?: MiniAppMainButton;
  readonly HapticFeedback?: MiniAppHaptic;
  readonly CloudStorage?: MiniAppCloudStorage;
  readonly contentSafeAreaInset?: MiniAppInsets;
  readonly safeAreaInset?: MiniAppInsets;
  ready(): void;
  expand(): void;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
}

function getWebApp(): MiniAppWebApp | null {
  if (typeof window === 'undefined') return null;
  const telegram = (window as unknown as { readonly Telegram?: { readonly WebApp?: MiniAppWebApp } }).Telegram;
  return telegram?.WebApp ?? null;
}

function readScheme(webApp: MiniAppWebApp | null): ColorScheme {
  return webApp?.colorScheme === 'light' ? 'light' : 'dark';
}

function readInsetTop(webApp: MiniAppWebApp | null): number {
  return webApp?.contentSafeAreaInset?.top ?? webApp?.safeAreaInset?.top ?? 0;
}

function readInsetBottom(webApp: MiniAppWebApp | null): number {
  return webApp?.contentSafeAreaInset?.bottom ?? webApp?.safeAreaInset?.bottom ?? 0;
}

/**
 * Track Telegram Mini App readiness, theme, buttons, haptics, and org choice.
 *
 * Org persistence writes through to Telegram CloudStorage while keeping a
 * synchronous localStorage mirror so loadOrg never blocks on a callback.
 *
 * @returns Telegram platform bindings safe to call outside Telegram.
 */
export function useTelegram() {
  const [ready, setReady] = useState(() => getWebApp() !== null);
  const [failed, setFailed] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorScheme>('dark');
  const [safeTop, setSafeTop] = useState(0);
  const [safeBottom, setSafeBottom] = useState(0);
  const backHandlerRef = useRef<(() => void) | null>(null);
  const mainHandlerRef = useRef<(() => void) | null>(null);
  const activatedRef = useRef(false);

  useEffect(() => {
    if (ready) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (getWebApp() !== null) {
        clearInterval(timer);
        setReady(true);
      } else if (tries >= 40) {
        clearInterval(timer);
        setFailed(true);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (!ready || activatedRef.current) return;
    activatedRef.current = true;
    const webApp = getWebApp();
    webApp?.ready();
    webApp?.expand();
    setColorScheme(readScheme(webApp));
    setSafeTop(readInsetTop(webApp));
    setSafeBottom(readInsetBottom(webApp));
    webApp?.CloudStorage?.getItem(ORG_KEY, (error, value) => {
      if (error || typeof value !== 'string' || value === '' || typeof window === 'undefined') return;
      window.localStorage.setItem(ORG_KEY, value);
    });
    const handleTheme = () => {
      const current = getWebApp();
      setColorScheme(readScheme(current));
      setSafeTop(readInsetTop(current));
      setSafeBottom(readInsetBottom(current));
    };
    webApp?.onEvent?.('themeChanged', handleTheme);
    return () => {
      webApp?.offEvent?.('themeChanged', handleTheme);
    };
  }, [ready]);

  useEffect(
    () => () => {
      const webApp = getWebApp();
      const back = backHandlerRef.current;
      const main = mainHandlerRef.current;
      if (back !== null) webApp?.BackButton?.offClick(back);
      if (main !== null) webApp?.MainButton?.offClick(main);
    },
    [],
  );

  const showBack = useCallback((onClick: () => void): void => {
    const button = getWebApp()?.BackButton;
    if (!button) return;
    const previous = backHandlerRef.current;
    if (previous !== null) button.offClick(previous);
    backHandlerRef.current = onClick;
    button.onClick(onClick);
    button.show();
  }, []);

  const hideBack = useCallback((): void => {
    const button = getWebApp()?.BackButton;
    const previous = backHandlerRef.current;
    backHandlerRef.current = null;
    if (previous !== null) button?.offClick(previous);
    button?.hide();
  }, []);

  const showMain = useCallback((text: string, onClick: () => void): void => {
    const button = getWebApp()?.MainButton;
    if (!button) return;
    const previous = mainHandlerRef.current;
    if (previous !== null) button.offClick(previous);
    mainHandlerRef.current = onClick;
    button.setParams({ text });
    button.onClick(onClick);
    button.show();
  }, []);

  const hideMain = useCallback((): void => {
    const button = getWebApp()?.MainButton;
    const previous = mainHandlerRef.current;
    mainHandlerRef.current = null;
    if (previous !== null) button?.offClick(previous);
    button?.hide();
  }, []);

  const setMainLoading = useCallback((loading: boolean): void => {
    const button = getWebApp()?.MainButton;
    if (!button) return;
    if (loading) {
      if (typeof button.showProgress === 'function') button.showProgress();
      else button.setParams({ is_progress_visible: true });
    } else if (typeof button.hideProgress === 'function') button.hideProgress();
    else button.setParams({ is_progress_visible: false });
  }, []);

  const haptic = useCallback((kind: HapticKind): void => {
    const feedback = getWebApp()?.HapticFeedback;
    if (!feedback) return;
    if (kind === 'success' || kind === 'error') feedback.notificationOccurred(kind);
    else feedback.impactOccurred(kind);
  }, []);

  const loadOrg = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ORG_KEY);
  }, []);

  const saveOrg = useCallback((id: string): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ORG_KEY, id);
    getWebApp()?.CloudStorage?.setItem(ORG_KEY, id);
  }, []);

  return {
    ready,
    failed,
    colorScheme,
    showBack,
    hideBack,
    showMain,
    hideMain,
    setMainLoading,
    haptic,
    safeTop,
    safeBottom,
    loadOrg,
    saveOrg,
  };
}

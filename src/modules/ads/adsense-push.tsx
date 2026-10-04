'use client';

import Script from 'next/script';
import { useEffect } from 'react';

/** AdSense loader URL allowlisted in edge CSP script-src. */
const ADSENSE_LOADER_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

/**
 * Loads the AdSense library and pushes the queued unit.
 *
 * @returns AdSense loader script.
 */
export function AdSensePush() {
  useEffect(() => {
    const registry = window as unknown as { adsbygoogle?: unknown[] };
    registry.adsbygoogle = registry.adsbygoogle ?? [];
    registry.adsbygoogle.push({});
  }, []);
  return <Script src={ADSENSE_LOADER_SRC} strategy="afterInteractive" crossOrigin="anonymous" />;
}

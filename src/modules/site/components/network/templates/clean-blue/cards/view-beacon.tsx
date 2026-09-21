'use client';

import { useEffect, useRef } from 'react';
import { getPageviewEndpoint } from '@/core/config/edge-hosts';
import { serializePageviewBeacon } from '@/modules/site/pageview-contract';

/**
 * Beacon pageview via Cloudflare Worker → Upstash INCR.
 * Records ALL views including edge-cache serves, with ZERO
 * Vercel execution. Fire-and-forget once per mount; failures stay silent.
 */
const ENDPOINT = getPageviewEndpoint();

export function CleanBlueViewBeacon({
  organizationId,
  siteId,
  articleSiteId,
}: {
  readonly organizationId: string;
  readonly siteId: string;
  readonly articleSiteId: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    const fire = () => {
      try {
        const body = serializePageviewBeacon({ o: organizationId, s: siteId, a: articleSiteId });
        if (body === null) return;
        const queued = navigator.sendBeacon(ENDPOINT, body);
        if (!queued) {
          void fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {
            /* counts may be lost */
          });
        }
      } catch {
        /* counts may be lost */
      }
    };
    if (typeof document !== 'undefined' && (document as Document & { readonly prerendering?: boolean }).prerendering === true) {
      const activate = () => {
        if (sent.current) return;
        sent.current = true;
        fire();
      };
      document.addEventListener('prerenderingchange', activate, { once: true });
      return () => document.removeEventListener('prerenderingchange', activate);
    }
    sent.current = true;
    fire();
  }, [organizationId, siteId, articleSiteId]);

  return null;
}

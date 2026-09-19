'use client';

import { useEffect, useRef } from 'react';
import { getPageviewEndpoint } from '@/core/config/edge-hosts';
import { serializePageviewBeacon } from '@/modules/site/pageview-contract';

/**
 * Beacon pageview via Cloudflare Worker → Upstash INCR.
 * Mencatat SEMUA view termasuk yang diserve edge-cache, dengan NOL
 * execution Vercel. Fire-and-forget sekali per mount; kegagalan diam.
 */
const ENDPOINT = getPageviewEndpoint();

export function PurpleEditorialViewBeacon({
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
    sent.current = true;
    try {
      const body = serializePageviewBeacon({ o: organizationId, s: siteId, a: articleSiteId });
      if (body === null) return;
      const queued = navigator.sendBeacon(ENDPOINT, body);
      if (!queued) {
        void fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {
          /* hitungan boleh hilang */
        });
      }
    } catch {
      /* hitungan boleh hilang */
    }
  }, [organizationId, siteId, articleSiteId]);

  return null;
}

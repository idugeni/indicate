'use client';

import { useEffect, useRef } from 'react';
import { getPageviewEndpoint } from '@/core/config/edge-hosts';

/**
 * Beacon pageview via Cloudflare Worker → Upstash INCR.
 * Mencatat SEMUA view termasuk yang diserve edge-cache, dengan NOL
 * execution Vercel. Fire-and-forget sekali per mount; kegagalan diam.
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
    sent.current = true;
    try {
      const payload = JSON.stringify({ o: organizationId, s: siteId, a: articleSiteId });
      const queued = navigator.sendBeacon(ENDPOINT, payload);
      if (!queued) {
        void fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true }).catch(() => {
          /* hitungan boleh hilang */
        });
      }
    } catch {
      /* hitungan boleh hilang */
    }
  }, [organizationId, siteId, articleSiteId]);

  return null;
}

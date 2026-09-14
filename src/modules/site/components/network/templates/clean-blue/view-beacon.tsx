'use client';

import { useEffect, useRef } from 'react';

/**
 * Beacon pageview via Cloudflare Worker (pv.indicate.web.id) → Upstash INCR.
 * Mencatat SEMUA view termasuk yang diserve edge-cache, dengan NOL
 * execution Vercel. Fire-and-forget sekali per mount; kegagalan diam.
 */
const ENDPOINT = 'https://pv.indicate.web.id/v';

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

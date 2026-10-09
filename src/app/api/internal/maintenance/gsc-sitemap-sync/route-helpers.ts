/** Decide whether a sitemap URL should be submitted, deleted, or left unchanged. */
export function planSitemapSync(submitted: boolean, liveOk: boolean): 'submit' | 'delete' | 'none' {
  if (liveOk && !submitted) return 'submit';
  if (!liveOk && submitted) return 'delete';
  return 'none';
}

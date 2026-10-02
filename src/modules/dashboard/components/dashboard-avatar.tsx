'use client';

import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/** Umur cache URL avatar presigned di memori klien. */
const AVATAR_CACHE_TTL_MS = 5 * 60_000;

const avatarCache = new Map<string, { readonly url: string; readonly expiresAt: number }>();
const avatarInflight = new Map<string, Promise<string | null>>();

/**
 * Kosongkan cache URL avatar; dipakai test dan saat identitas pemilik berubah.
 */
export function clearAvatarCache(): void {
  avatarCache.clear();
  avatarInflight.clear();
}

/**
 * Render the workspace owner avatar with deferred private-URL resolution.
 *
 * @param displayName - Owner display name seeding the fallback initials.
 * @param avatarRef - Raw avatar reference: public https resolves instantly, private `r2:` resolves via the avatar endpoint, anything else falls back to initials.
 * @returns Avatar showing the photo once available, initials until then.
 * @remarks Private URLs are cached per reference for five minutes and shared
 * across mounts, so repeated renders (sidebar, header) cost one endpoint call
 * instead of one each.
 */
export function DashboardAvatar({ displayName, avatarRef = null }: { readonly displayName: string; readonly avatarRef?: string | null }) {
  const isRemote = avatarRef?.startsWith('https://') === true;
  const isPrivate = avatarRef?.startsWith('r2:') === true;
  const [privateUrl, setPrivateUrl] = useState<string | null>(() => {
    if (!isPrivate || avatarRef === null || avatarRef === undefined) return null;
    const hit = avatarCache.get(avatarRef);
    return hit !== undefined && hit.expiresAt > Date.now() ? hit.url : null;
  });

  useEffect(() => {
    if (!isPrivate || avatarRef === null || avatarRef === undefined) return;
    const ref = avatarRef;
    let cancelled = false;
    const hit = avatarCache.get(ref);
    if (hit !== undefined && hit.expiresAt > Date.now()) {
      const url = hit.url;
      void Promise.resolve().then(() => {
        if (!cancelled) setPrivateUrl(url);
      });
      return () => {
        cancelled = true;
      };
    }
    const ongoing = avatarInflight.get(ref);
    if (ongoing !== undefined) {
      void ongoing.then((url) => {
        if (!cancelled) setPrivateUrl(url);
      });
      return () => {
        cancelled = true;
      };
    }
    const task = fetch(`/api/dashboard/avatar?ref=${encodeURIComponent(ref)}`)
      .then((response) => (response.ok ? (response.json() as Promise<unknown>) : null))
      .then((body) => {
        const next = (body as { readonly url?: unknown } | null)?.url;
        const url = typeof next === 'string' ? next : null;
        if (url !== null) avatarCache.set(ref, { url, expiresAt: Date.now() + AVATAR_CACHE_TTL_MS });
        return url;
      })
      .catch(() => null)
      .finally(() => {
        if (avatarInflight.get(ref) === task) avatarInflight.delete(ref);
      });
    avatarInflight.set(ref, task);
    void task.then((url) => {
      if (!cancelled) setPrivateUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [avatarRef, isPrivate]);

  const url = isRemote && typeof avatarRef === 'string' ? avatarRef : isPrivate ? privateUrl : null;

  return (
    <Avatar className="h-7 w-7 flex-none border border-hairline">
      {url ? <AvatarImage src={url} alt="" /> : null}
      <AvatarFallback className="bg-bg-raised-2 font-mono text-xs font-semibold text-brass">
        {displayName.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

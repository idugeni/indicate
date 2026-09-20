'use client';

import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Render the workspace owner avatar with deferred private-URL resolution.
 *
 * @param displayName - Owner display name seeding the fallback initials.
 * @param avatarRef - Raw avatar reference: public https resolves instantly, private `r2:` resolves via the avatar endpoint, anything else falls back to initials.
 * @returns Avatar showing the photo once available, initials until then.
 */
export function DashboardAvatar({ displayName, avatarRef = null }: { readonly displayName: string; readonly avatarRef?: string | null }) {
  const isRemote = avatarRef?.startsWith('https://') === true;
  const isPrivate = avatarRef?.startsWith('r2:') === true;
  const [privateUrl, setPrivateUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrivate || avatarRef === null || avatarRef === undefined) return;
    let cancelled = false;
    fetch(`/api/dashboard/avatar?ref=${encodeURIComponent(avatarRef)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<unknown>) : null))
      .then((body) => {
        if (cancelled) return;
        const next = (body as { readonly url?: unknown } | null)?.url;
        setPrivateUrl(typeof next === 'string' ? next : null);
      })
      .catch(() => {
        if (!cancelled) setPrivateUrl(null);
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

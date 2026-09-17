'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => undefined;

function formatEditionDate(now: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
}

/** Live edition dateline; the server snapshot stays static so auth pages prerender. */
export function EditionDate() {
  const label = useSyncExternalStore(emptySubscribe, () => formatEditionDate(new Date()), () => 'Memuat…');
  return <span>{label}</span>;
}

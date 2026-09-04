export function safeRedirectPath(value: string | null): string {
  if (value === null || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  const normalized = new URL(value, 'https://indicate.invalid');
  return normalized.origin === 'https://indicate.invalid'
    ? `${normalized.pathname}${normalized.search}${normalized.hash}`
    : '/';
}

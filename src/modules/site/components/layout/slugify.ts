export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

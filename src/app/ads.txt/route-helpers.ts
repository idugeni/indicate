/** Render a comment-only ads.txt until authorized sellers are configured. */
export function adsTxt(host: string, contactUrl: string): string {
  return [`# ads.txt for ${host}`, '# No authorized programmatic sellers yet.', `# Contact ${contactUrl} for partnerships.`, ''].join('\n');
}

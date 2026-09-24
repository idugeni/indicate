import { Fragment } from 'react';
import { splitWordmark, wordmarkColors } from '@/modules/site/components/directory/directory-helpers';

/**
 * Render a portal name as a multi-tone text wordmark.
 *
 * Each portal gets its own coloring scheme (`pattern`) so the board varies:
 * head, tail, full, bookend, or alternate accent placement.
 *
 * @param name - Stored portal name.
 * @param accent - Per-portal accent hex.
 * @param pattern - Coloring scheme from `wordmarkPatternForHostname`.
 */
export function Wordmark({ name, accent, pattern }: { readonly name: string; readonly accent: string; readonly pattern: string }) {
  const tokens = splitWordmark(name);
  const colors = wordmarkColors(tokens.length, accent, pattern);
  return (
    <span className="block font-serif leading-[1.05] font-semibold tracking-tight text-balance">
      {tokens.map((token, index) => (
        <Fragment key={`${token}-${index}`}>
          {index > 0 ? ' ' : null}
          <span style={{ color: colors[index] ?? accent }}>{token}</span>
        </Fragment>
      ))}
    </span>
  );
}

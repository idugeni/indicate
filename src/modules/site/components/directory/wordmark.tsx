import { Fragment } from 'react';
import { splitWordmark } from '@/modules/site/components/directory/directory-helpers';

const INK = '#1a2430';
const MID = '#5f6b7a';

/**
 * Render a portal name as a two/three-tone text wordmark.
 *
 * Single word renders solid ink; two words render ink plus accent; three or
 * more render ink, muted middle, and accent tail.
 *
 * @param name - Stored portal name.
 * @param accent - Per-portal accent hex for the tail word.
 */
export function Wordmark({ name, accent }: { readonly name: string; readonly accent: string }) {
  const tokens = splitWordmark(name);
  return (
    <span className="block font-serif leading-[1.05] font-semibold tracking-tight text-balance">
      {tokens.map((token, index) => {
        const last = index === tokens.length - 1;
        const color = tokens.length === 1 || (!last && index === 0) ? INK : last ? accent : MID;
        return (
          <Fragment key={`${token}-${index}`}>
            {index > 0 ? ' ' : null}
            <span style={{ color }}>{token}</span>
          </Fragment>
        );
      })}
    </span>
  );
}

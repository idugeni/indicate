'use client';

import { useState } from 'react';

export interface FaqGridEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

const INITIAL_VISIBLE = 6;

/** Landing teaser: first items render, the rest behind a load-more toggle. Full index lives on /faq. */
export function FaqGrid({ items }: { readonly items: readonly FaqGridEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);
  const remaining = items.length - visible.length;

  return (
    <div>
      <div id="faq-grid" className="border-t border-hairline">
        {visible.map((faq) => (
          <article
            key={faq.id}
            id={faq.id}
            className="scroll-mt-24 border-b border-hairline py-6"
          >
            <h3 className="m-0 max-w-2xl font-sans text-base font-semibold tracking-tight text-paper">
              {faq.question}
            </h3>
            <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
              {faq.answer}
            </p>
          </article>
        ))}
      </div>
      {items.length > INITIAL_VISIBLE ? (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls="faq-grid"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-hairline-strong bg-transparent px-5 py-2.5 font-sans text-sm font-medium text-paper-dim transition-colors duration-180 hover:bg-bg-raised hover:text-paper"
          >
            {expanded ? 'Tampilkan lebih sedikit' : `Muat lebih banyak (${remaining} lagi)`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

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
      <div id="faq-grid" className="grid gap-4 md:grid-cols-2">
        {visible.map((faq, index) => (
          <article
            key={faq.id}
            id={faq.id}
            className="scroll-mt-24 rounded-lg border border-hairline bg-bg-raised p-5 transition-colors duration-180 hover:border-hairline-strong sm:p-6"
          >
            <h3 className="m-0 flex items-baseline gap-3 font-sans text-sm font-semibold tracking-tight text-paper">
              <span className="font-mono text-[11px] font-normal tabular-nums text-brass">
                {String(index + 1).padStart(2, '0')}
              </span>
              {faq.question}
            </h3>
            <p className="m-0 mt-2 pl-8 font-sans text-sm leading-relaxed text-paper-dim">
              {faq.answer}
            </p>
          </article>
        ))}
      </div>
      {items.length > INITIAL_VISIBLE ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls="faq-grid"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-hairline-strong bg-transparent px-5 py-2.5 font-sans text-sm font-medium text-paper-dim transition-colors duration-180 hover:border-hairline hover:bg-bg-raised hover:text-paper"
          >
            {expanded ? 'Tampilkan lebih sedikit' : `Muat lebih banyak (${remaining} lagi)`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

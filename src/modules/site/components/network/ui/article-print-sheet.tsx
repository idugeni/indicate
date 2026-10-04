/**
 * Print-only masthead and footer shared by every network article template.
 *
 * @remarks Both blocks stay hidden on screen (`article-print-*` classes,
 * revealed by the print stylesheet) and carry `aria-hidden` because they
 * duplicate content already announced by the article header. Every prop is
 * rendered defensively: empty bylines, dates, or URLs collapse their
 * separators instead of printing stray punctuation.
 */

/**
 * Print masthead: publication kop above the article body.
 *
 * @param siteName - Tenant publication name.
 * @param byline - Publisher/author display name, may be empty.
 * @param dateLabel - Pre-formatted publish date, may be empty.
 * @param canonical - Absolute article URL, may be empty.
 * @returns Hidden-until-print kop block.
 */
export function ArticlePrintMasthead({
  siteName,
  byline,
  dateLabel,
  canonical,
}: {
  readonly siteName: string;
  readonly byline: string;
  readonly dateLabel: string;
  readonly canonical: string;
}) {
  const meta = [byline.trim(), dateLabel.trim()].filter((part) => part !== '').join(' · ');
  return (
    <div className="article-print-masthead" aria-hidden="true">
      <p className="article-print-kicker">{siteName}</p>
      {meta === '' ? null : <p className="article-print-meta">{meta}</p>}
      {canonical.trim() === '' ? null : <p className="article-print-source">{canonical.trim()}</p>}
    </div>
  );
}

/**
 * Print footer: source attribution below the article body.
 *
 * @param siteName - Tenant publication name.
 * @param canonical - Absolute article URL, may be empty.
 * @returns Hidden-until-print source block.
 */
export function ArticlePrintFooter({
  siteName,
  canonical,
}: {
  readonly siteName: string;
  readonly canonical: string;
}) {
  const year = new Date().getFullYear();
  const source = canonical.trim();
  return (
    <div className="article-print-footer" aria-hidden="true">
      {source === '' ? null : <p className="article-print-source">Sumber: {source}</p>}
      <p>
        © {year} {siteName} — Dicetak dari halaman artikel.
      </p>
    </div>
  );
}

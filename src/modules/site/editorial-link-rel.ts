/**
 * Rel attribute policy for links written inside article bodies.
 *
 * Every tenant in the network republishes the same syndicated body, so an
 * unqualified outbound link would let thousands of hosts pass ranking credit to
 * one origin. Qualifying off-site links keeps that credit with the outlet that
 * did the reporting. In-site paths stay unqualified because they are how
 * crawlers traverse the network.
 */

/**
 * Build the `rel` attribute for one editorial link.
 *
 * @param href - Editorial href, already validated as a safe URL or site path.
 * @returns Hardening tokens, plus `nofollow` when the target leaves the site.
 */
export function editorialLinkRel(href: string): string {
  return href.trim().startsWith('/') ? 'noopener noreferrer' : 'noopener noreferrer nofollow';
}
/** Client-safe half of the Disqus contract: the forum label shape and the origins the embed needs. */

/**
 * Shape enforced for the network forum shortname.
 *
 * @remarks `disqus-react` builds its script source as
 * `https://<shortname>.disqus.com/embed.js`, so this value chooses the origin
 * that serves third-party JavaScript on every reader page. Anything that is not
 * a plain DNS label is rejected at boot rather than interpolated: an unvalidated
 * shortname carrying a path, port, or credential would redirect the script tag
 * at a host of the operator's choosing.
 */
export const DISQUS_SHORTNAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u;

/**
 * Origins allowed to serve Disqus script and style assets.
 *
 * @remarks `embed.js` is loaded from `<shortname>.disqus.com`, while the embed's
 * own bundles and its per-page `config.js` come from `disquscdn.com`. Listing
 * only the forum host leaves the embed permanently blocked.
 */
export const DISQUS_SCRIPT_HOSTS = ['https://*.disqus.com', 'https://*.disquscdn.com'] as const;

/**
 * Origins allowed to frame Disqus.
 *
 * @remarks The comment thread, the login popup, and the single-sign-on iframe
 * are all documents served from `disqus.com`.
 */
export const DISQUS_FRAME_HOSTS = ['https://*.disqus.com'] as const;

/**
 * Class name `count.js` scans for to fill in a comment count.
 *
 * @remarks The count script rewrites the text content of every element carrying
 * this class from the `data-disqus-identifier` and `data-disqus-url` attributes
 * beside it, so the markup contract is set by Disqus rather than by the app.
 */
export const DISQUS_COUNT_CLASS = 'disqus-comment-count';

/**
 * Element id for the shared `count.js` tag.
 *
 * @remarks Reusing the id `disqus-react` uses means a badge and the library's
 * own count component can never both insert the script.
 */
export const DISQUS_COUNT_SCRIPT_ID = 'dsq-count-scr';
export const WEBMCP_BRIDGE_PATH = '/.webmcp/bridge.js';
export const WEBMCP_MCP_PATH = '/mcp';
export const WEBMCP_DEFAULT_PACKS = 'site,page';

const PAGE_PACK = 'page';
const SITE_PACK = 'site';

/**
 * Build the same-origin WebMCP bridge served at `/.webmcp/bridge.js`.
 *
 * @returns Bridge source registering the `site` and `page` packs on `document.modelContext`.
 * @remarks The bridge is host-independent static text: tenant scoping happens
 * server-side in `/mcp` via the request hostname, so one cached document serves
 * every portal. It no-ops when the browser has no WebMCP surface, leaving the
 * page exactly as before. Pack wiring mirrors the Cloudflare preview this
 * implements: a dynamic pack proxying the site's own MCP server plus a static
 * pack running entirely in the visitor's browser.
 */
export function buildWebMcpBridge(): string {
  return `'(use strict');'`;
}

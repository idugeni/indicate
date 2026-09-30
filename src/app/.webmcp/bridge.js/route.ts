import { withApiAccess } from '@/core/observability/api-access';
import { buildWebMcpBridge } from '@/modules/webmcp/bridge-source';

async function handleGET() {
  return new Response(buildWebMcpBridge(), {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}

/**
 * Serve the host-independent WebMCP bridge injected into tenant pages.
 *
 * @remarks Static text with no tenant read, so it stays edge-cacheable for an
 * hour. Tenant scoping lives server-side in `/mcp`; this document only names
 * the packs and the endpoint, mirroring the edge-served bridge in the
 * Cloudflare preview.
 */
export const GET = withApiAccess('GET /.webmcp/bridge.js', handleGET, { accessLog: 'errors-only' });

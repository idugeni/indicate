import { connection } from 'next/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
import { checkSearchRateLimit } from '@/modules/delivery/search-rate-limit';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { dispatchMcpMessages } from '@/modules/webmcp/mcp-transport';
import { executeWebMcpTool } from '@/modules/webmcp/webmcp-service';
import type { WebMcpThrottle } from '@/modules/webmcp/webmcp-service';
import { WEBMCP_TOOLS } from '@/modules/webmcp/webmcp-tools';

export const maxDuration = 25;

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

async function handlePOST(request: Request) {
  await connection();
  const incoming = await headers();
  const { resolver, content, repository, config } = await deliveryComposition();
  const classification = await resolver.classify(incoming.get('x-forwarded-host') ?? incoming.get('host'));
  if (classification.kind !== 'site') {
    return denied(classification.kind === 'invalid' ? 400 : classification.kind === 'ambiguous' ? 500 : 404);
  }
  const requestId = crypto.randomUUID();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  let integrations: Awaited<ReturnType<typeof createProductionIntegrationsContext>> | null = null;
  const checkSearchThrottle = async (hostname: string, attemptId: string): Promise<WebMcpThrottle> => {
    if (integrations === null) integrations = await createProductionIntegrationsContext();
    return checkSearchRateLimit(integrations.rateLimits, { hostname, policy: config.rateLimits.publicRead, requestId: attemptId });
  };
  const outcome = await dispatchMcpMessages(body, {
    tools: WEBMCP_TOOLS,
    execute: (name, args) =>
      executeWebMcpTool(
        { content, repository, locale: config.seo.defaultLocale, checkSearchThrottle },
        classification.context,
        name,
        args,
        requestId,
      ),
  });
  if (outcome.status === 202) return new Response(null, { status: 202, headers: { ...NO_STORE_HEADERS } });
  return NextResponse.json(outcome.payload, { headers: { ...NO_STORE_HEADERS } });
}

async function handleGET() {
  await connection();
  return NextResponse.json(
    { error: 'Method not allowed. Send a JSON-RPC 2.0 body with POST.' },
    { status: 405, headers: { Allow: 'POST', ...NO_STORE_HEADERS } },
  );
}

/**
 * Tenant MCP endpoint backing the WebMCP `site` pack.
 *
 * @remarks POST-only Streamable-HTTP surface: `initialize`, `ping`,
 * `tools/list`, and `tools/call` over JSON-RPC 2.0 with the request hostname
 * as the tenant scope. Control-plane and unknown hosts get the same
 * non-disclosing denial as every other tenant surface. Responses are never
 * cached; notification-only bodies answer 202 with no payload.
 */
export const POST = withApiAccess('POST /mcp', handlePOST, { accessLog: 'errors-only' });

/**
 * Reject non-POST use of the MCP endpoint.
 *
 * @remarks MCP streams over GET with SSE, which this endpoint does not offer;
 * the 405 names POST as the only supported method.
 */
export const GET = withApiAccess('GET /mcp', handleGET, { accessLog: 'errors-only' });

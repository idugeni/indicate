import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as { readonly initData?: unknown } | null;
  if (body === null) return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  const gate = await requireMiniAppOwner(request, { initData: body.initData, organizationId: '00000000-0000-0000-0000-000000000000' });
  if (!gate.ok) return gate.error;
  const listed = await gate.value.composition.customer.list(gate.value.context.actor);
  if (!listed.ok) return miniAppErrorResponse(listed.error);
  return NextResponse.json(
    {
      telegramUserId: gate.value.context.telegramUserId,
      organizations: listed.value.map(({ customer, subscription }) => ({
        id: customer.id,
        name: customer.name,
        slug: customer.slug,
        status: customer.status,
        subscription: subscription === null ? null : { status: subscription.status },
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/**
 * Verifies Mini App ownership and lists operable organizations.
 *
 * @remarks Accepts no organization: the zero UUID scopes nothing and the
 * platform customer list ignores it. Everything else requires a real org.
 */
export const POST = withApiAccess('POST /api/tg/app/session', handlePOST);

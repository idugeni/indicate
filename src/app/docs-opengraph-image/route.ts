import { createElement } from 'react';
import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';
import { DocsOgCard } from '@/app/docs-opengraph-image/og-card';

async function handleGET() {
  const { resolver } = await deliveryComposition();
  const requestHeaders = await headers();
  const result = await resolver.classify(requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'));
  if (result.kind !== 'control' || result.surface !== 'docs') {
    return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
  }
  return new ImageResponse(createElement(DocsOgCard), { width: 1200, height: 630 });
}

export const GET = withApiAccess('GET /docs-opengraph-image', handleGET);

import { NextResponse } from 'next/server';

import { getRuntimeConfig } from '@/config/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const config = getRuntimeConfig();
  return NextResponse.json(
    {
      service: 'indicate',
      stage: 'foundation',
      status: 'ok',
      configuration: 'valid',
      environment: config.environment,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

import { neonAuth } from '@/integrations/neon-auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, POST } = neonAuth.handler();

import { describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { redirect: (url: string | URL, status?: number) => Response.redirect(url, status) },
}));

vi.mock('@/core/observability/api-access', () => ({
  withApiAccess: (operation: string, handler: (request: Request) => Promise<Response>) => handler,
}));

describe('GET /brand/logo.png', () => {
  it('mengalihkan permanen ke rute logo kanonis pada host yang sama', async () => {
    const { GET } = await import('@/app/brand/logo.png/route');
    const response = await GET(new Request('https://portal.example/brand/logo.png'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://portal.example/logo.png');
  });
});

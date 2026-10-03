import { vi } from 'vitest';

/**
 * `sonner` stand-in for component tests.
 *
 * @remarks Every test that mocked `sonner` by hand wrote its own subset of the
 * API, so adding one method (for example `loading`, used by the single dynamic
 * action toast) broke whichever tests happened to omit it — a failure that looks
 * like a product bug but is really a stale mock. This factory keeps the surface
 * complete and the spies stable across files.
 *
 * `toast.promise` mirrors sonner 2.x: it hands back `{ unwrap }` rather than the
 * resolved value. `toast.loading` returns nothing on purpose — the production
 * helper owns the toast id — so a test can read the id back off the call and
 * assert that progress updates reuse one toast instead of stacking new ones.
 */
export function sonnerStub(): Record<string, unknown> {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
      promise: vi.fn((task: Promise<unknown>) => ({ unwrap: () => task })),
    },
  };
}

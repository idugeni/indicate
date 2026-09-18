import { afterEach, describe, expect, it, vi } from 'vitest';

import { attachProcessSafetyNet } from '@/core/observability/process-safety-net';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('attachProcessSafetyNet', () => {
  it('mendaftarkan handler rejection dan exception tanpa melempar', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const beforeRejection = process.listeners('unhandledRejection');
    const beforeException = process.listeners('uncaughtException');
    await attachProcessSafetyNet();
    const addedRejection = process.listeners('unhandledRejection').filter((listener) => !beforeRejection.includes(listener));
    const addedException = process.listeners('uncaughtException').filter((listener) => !beforeException.includes(listener));
    expect(addedRejection.length).toBe(1);
    expect(addedException.length).toBe(1);
    for (const listener of addedRejection) process.removeListener('unhandledRejection', listener);
    for (const listener of addedException) process.removeListener('uncaughtException', listener);
  });
});

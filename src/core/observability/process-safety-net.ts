/**
 * Attach Node process safety net.
 *
 * @remarks Lazily imported behind `NEXT_RUNTIME === 'nodejs'`; never import from shared/Edge code. Fatal records only; never throws/exits — the runtime owns that.
 */
export async function attachProcessSafetyNet(): Promise<void> {
  const { logEvent } = await import('@/core/observability/logger');
  const { sanitizeError } = await import('@/core/security/redaction');

  logEvent('info', { event: 'lifecycle.start' });

  process.on('unhandledRejection', (reason: unknown) => {
    try {
      logEvent('fatal', { event: 'lifecycle.unhandledRejection', context: sanitizeError(reason) });
    } catch {
      /* logging must never crash the process */
    }
  });
  process.on('uncaughtException', (error: unknown) => {
    try {
      logEvent('fatal', { event: 'lifecycle.uncaughtException', context: sanitizeError(error) });
    } catch {
      /* logging must never crash the process */
    }
  });
}

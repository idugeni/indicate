import fc from 'fast-check';

export const PROPERTY_SEED = Number.parseInt(process.env.PROPERTY_SEED ?? '20260830', 10);

export function assertProperty(
  propertyName: string,
  property: Parameters<typeof fc.assert>[0],
  secretSentinels: readonly string[] = [],
): void {
  try {
    fc.assert(property, {
      numRuns: 100,
      seed: PROPERTY_SEED,
      endOnFailure: true,
      verbose: 2,
    });
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Unknown property failure';
    for (const sentinel of secretSentinels) {
      if (sentinel.length > 0) message = message.replaceAll(sentinel, '[REDACTED]');
    }
    throw new Error(`${propertyName} failed (seed=${PROPERTY_SEED}). Minimized counterexample follows. ${message}`);
  }
}


export async function assertAsyncProperty(
  propertyName: string,
  property: Parameters<typeof fc.assert>[0],
  secretSentinels: readonly string[] = [],
): Promise<void> {
  try {
    await fc.assert(property, {
      numRuns: 100,
      seed: PROPERTY_SEED,
      endOnFailure: true,
      verbose: 2,
    });
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Unknown property failure';
    for (const sentinel of secretSentinels) {
      if (sentinel.length > 0) message = message.replaceAll(sentinel, '[REDACTED]');
    }
    throw new Error(`${propertyName} failed (seed=${PROPERTY_SEED}). Minimized counterexample follows. ${message}`);
  }
}

const RECONCILE_EVERY_MINUTES = 5;

/** Decide whether this UTC-minute tick owes a reconcile pass. */
export function isReconcileDue(now: Date): boolean {
  return now.getUTCMinutes() % RECONCILE_EVERY_MINUTES === 0;
}

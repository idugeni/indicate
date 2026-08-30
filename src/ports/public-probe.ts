export interface PendingHostnameProbePort {
  verifyPendingHostname(hostname: string, attemptId: string): Promise<boolean>;
}

export interface PendingHostnameProbePort {
  verifyPendingHostname(hostname: string, attemptId: string, requestId?: string): Promise<boolean>;
}

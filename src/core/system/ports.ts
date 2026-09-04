export interface HealthCheckResult {
  readonly service: string;
  readonly status: 'healthy' | 'unhealthy';
  readonly category?: string;
}

export interface HealthCheckPort {
  check(): Promise<HealthCheckResult>;
}

export interface IdentifierGenerator {
  create(): string;
}

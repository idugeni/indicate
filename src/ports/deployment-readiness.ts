export interface SharedResourceIdentitySnapshot {
  readonly supabaseAuthProjectRef: string;
  readonly supabaseDatabaseProjectRef: string;
  readonly r2BucketName: string;
  readonly upstashResourceId: string;
  readonly vercelProjectId: string;
}

export interface SharedResourceHealthSnapshot {
  readonly identities: SharedResourceIdentitySnapshot;
  readonly services: Readonly<Record<'supabaseAuth' | 'supabaseDatabase' | 'r2' | 'upstash' | 'cloudflare' | 'vercel', 'healthy' | 'unhealthy'>>;
}

export interface DeploymentReadinessPort {
  inspect(): Promise<SharedResourceHealthSnapshot>;
}

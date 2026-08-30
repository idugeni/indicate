import type { WorkerClaim, PublicationTargetRecord } from '@/domain/stage4/models';
import type { ExactObjectAuthorization, ObjectStoragePort, StoredObjectMetadata } from '@/ports/object-storage';
import type { PublicationTargetPublisherPort, TargetPublicationOutcome } from '@/ports/publication-target-publisher';
import type { QueueClaim, RedisCoordinationPort } from '@/ports/redis';

export class InMemoryObjectStorage implements ObjectStoragePort {
  readonly bucketCount = 1 as const;
  private readonly objects = new Map<string, StoredObjectMetadata>();
  private readonly bodies = new Map<string, Uint8Array>();
  private readonly authorizations = new Map<string, { key: string; operation: 'put' | 'get'; expiresAt: Date; requiredHeaders: Readonly<Record<string, string>> }>();
  readonly deletedKeys: string[] = [];
  failNextAuthorization = false;
  constructor(private readonly now: () => Date = () => new Date('2026-08-30T00:00:00.000Z')) {}
  async check() { return { service: 'memory-r2', status: 'healthy' as const }; }
  putObject(metadata: StoredObjectMetadata): void { this.objects.set(metadata.key, Object.freeze({ ...metadata })); }
  has(key: string): boolean { return this.objects.has(key); }
  async headExact(key: string) { return this.objects.get(key) ?? null; }
  private authorize(key: string, operation: 'put' | 'get', expiresInSeconds: number, requiredHeaders: Readonly<Record<string, string>>): ExactObjectAuthorization {
    if (this.failNextAuthorization) { this.failNextAuthorization = false; throw new Error('Injected object authorization failure'); }
    const token = crypto.randomUUID();
    const expiresAt = new Date(this.now().getTime() + expiresInSeconds * 1_000);
    const url = `https://private-r2.invalid/${operation}/${encodeURIComponent(key)}?token=${token}`;
    const authorization = Object.freeze({ key, url, requiredHeaders: Object.freeze({ ...requiredHeaders }), expiresAt });
    this.authorizations.set(token, { key, operation, expiresAt, requiredHeaders: authorization.requiredHeaders });
    return authorization;
  }
  async authorizeExactPut(key: string, contentType: string, checksumSha256: string, expiresInSeconds: number) {
    return this.authorize(key, 'put', expiresInSeconds, { 'content-type': contentType, 'x-amz-checksum-sha256': checksumSha256 });
  }
  async authorizeExactGet(key: string, expiresInSeconds: number) { return this.authorize(key, 'get', expiresInSeconds, {}); }
  async uploadAuthorized(authorization: ExactObjectAuthorization, headers: Readonly<Record<string, string>>, body: Uint8Array): Promise<void> {
    const token = new URL(authorization.url).searchParams.get('token');
    const grant = token === null ? undefined : this.authorizations.get(token);
    if (grant === undefined || grant.operation !== 'put' || grant.key !== authorization.key || grant.expiresAt <= this.now()) throw new Error('Invalid or expired exact PUT authorization.');
    for (const [name, value] of Object.entries(grant.requiredHeaders)) if (headers[name.toLowerCase()] !== value) throw new Error(`Missing or changed signed header: ${name}`);
    const digestInput = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
    const digest = await crypto.subtle.digest('SHA-256', digestInput);
    const checksum = Buffer.from(digest).toString('base64');
    if (checksum !== grant.requiredHeaders['x-amz-checksum-sha256']) throw new Error('Uploaded checksum does not match the signed checksum.');
    this.objects.set(grant.key, Object.freeze({ key: grant.key, contentType: grant.requiredHeaders['content-type']!, contentLength: body.byteLength, checksum }));
    this.bodies.set(grant.key, new Uint8Array(body));
    this.authorizations.delete(token!);
  }
  async readAuthorized(authorization: ExactObjectAuthorization): Promise<Uint8Array> {
    const token = new URL(authorization.url).searchParams.get('token');
    const grant = token === null ? undefined : this.authorizations.get(token);
    const body = this.bodies.get(authorization.key);
    if (grant === undefined || grant.operation !== 'get' || grant.key !== authorization.key || grant.expiresAt <= this.now() || body === undefined) throw new Error('Invalid or expired exact GET authorization.');
    return new Uint8Array(body);
  }
  anonymousRead(key: string): { readonly status: 403 } { void key; return Object.freeze({ status: 403 as const }); }
  async deleteExact(key: string): Promise<void> { this.objects.delete(key); this.bodies.delete(key); this.deletedKeys.push(key); }
}

export class InMemoryRedisCoordination implements RedisCoordinationPort {
  readonly resourceCount = 1 as const;
  readonly scheduled = new Map<string, number>();
  readonly leased = new Map<string, QueueClaim>();
  readonly mirrors = new Map<string, string>();
  failNextSchedule = false;
  constructor(readonly namespace = 'indicate:test:v1') {}
  async check() { return { service: 'memory-redis', status: 'healthy' as const }; }
  async schedule(logicalId: string, dueAt: Date): Promise<void> { if (this.failNextSchedule) { this.failNextSchedule = false; throw new Error('Injected Redis outage'); } this.scheduled.set(logicalId, dueAt.getTime()); }
  async claimDue(now: Date, limit: number, leaseSeconds: number): Promise<readonly QueueClaim[]> {
    for (const [token, claim] of this.leased) {
      if (claim.leaseExpiresAt <= now) { this.leased.delete(token); this.scheduled.set(claim.logicalId, now.getTime()); }
    }
    const ids = [...this.scheduled.entries()].filter(([, due]) => due <= now.getTime()).sort((a, b) => a[1] - b[1]).slice(0, limit);
    return ids.map(([logicalId]) => { this.scheduled.delete(logicalId); const claim = Object.freeze({ logicalId, claimToken: `${crypto.randomUUID()}:${logicalId}`, leaseExpiresAt: new Date(now.getTime() + leaseSeconds * 1_000) }); this.leased.set(claim.claimToken, claim); return claim; });
  }
  async acknowledge(claim: QueueClaim): Promise<void> { this.leased.delete(claim.claimToken); }
  async mirrorState(organizationId: string, logicalId: string, state: string): Promise<void> { this.mirrors.set(`${organizationId}:${logicalId}`, state); }
}

export class DeterministicPublicationTargetPublisher implements PublicationTargetPublisherPort {
  private readonly outcomes = new Map<string, TargetPublicationOutcome[]>();
  setOutcomes(siteId: string, outcomes: readonly TargetPublicationOutcome[]): void { this.outcomes.set(siteId, [...outcomes]); }
  async publish(_claim: WorkerClaim, target: PublicationTargetRecord): Promise<TargetPublicationOutcome> {
    const configured = this.outcomes.get(target.siteId); const outcome = configured?.shift();
    return outcome ?? { kind: 'published', url: `https://${target.siteId}.published.invalid/articles/${target.articleSiteId}` };
  }
}

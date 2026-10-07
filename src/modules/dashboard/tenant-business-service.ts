import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { PublicationStatusProjection } from '@/modules/publishing/models';
import type { PublishingRepository } from '@/modules/publishing/ports';
import type { DashboardCommand } from '@/modules/dashboard/command';

export class TenantBusinessService {
  constructor(
    private readonly repository: PublishingRepository,
  ) {}

  async getPublicationStatus(
    actor: AuthorizedTenantActorContext,
    jobId: string,
  ): Promise<PublicationStatusProjection | readonly PublicationStatusProjection[] | null> {
    // Jika ID mengandung titik dua, itu adalah batch ID
    if (jobId.includes(':')) {
      const [baseKey] = jobId.split(':');
      const publications = await this.repository.listPublications(actor, 20);
      const related = publications.filter((p) => p.job.id === jobId || (p.job.id.startsWith(baseKey!) && p.job.id.includes(':')));
      if (related.length === 0) return null;
      const results = await Promise.all(related.map((p) => this.repository.getPublication(actor, p.job.id)));
      return results.filter((r): r is PublicationStatusProjection => r !== null);
    }

    return this.repository.getPublication(actor, jobId);
  }

  async handleCommand(
    actor: AuthorizedTenantActorContext,
    action: string,
    payload: unknown,
  ): Promise<unknown> {
    // Logika penanganan perintah bisnis di tingkat tenant
    return null;
  }
}
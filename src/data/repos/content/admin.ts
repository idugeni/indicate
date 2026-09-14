import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import {
  contactChannels,
  faqs,
  mediaShowcase,
  templatePresets,
  testimonials,
} from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export class ContentAdminAccessDeniedError extends Error {
  constructor() { super('Content administration requires a platform grant.'); }
}

async function verifiedPlatformActor(
  transaction: Transaction,
  authUserId: string,
  localUserId: string,
  permission: string,
): Promise<void> {
  await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${authUserId}, true)`);
  await transaction.execute(sql`SELECT set_config('app.actor_id', ${localUserId}, true)`);
  await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${authUserId}::uuid)`);
  const rows = await transaction.execute<{ allowed: boolean }>(sql`
    SELECT indicate_private.permission_has_platform(${localUserId}::uuid, ${permission}) AS allowed
  `);
  if (rows[0]?.allowed !== true) throw new ContentAdminAccessDeniedError();
}

export class DrizzleContentAdminRepository {
  constructor(private readonly database: Database) {}

  private async platform<T>(authUserId: string, localUserId: string, operation: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.database.transaction(async (transaction) => {
      await verifiedPlatformActor(transaction, authUserId, localUserId, INTEGRATIONS_PERMISSIONS.contentManage);
      return operation(transaction);
    });
  }

  async listContent(authUserId: string, localUserId: string) {
    return this.platform(authUserId, localUserId, async (tx) => {
      const [quotes, faqRows, showcase, channels, templates] = await Promise.all([
        tx.select().from(testimonials),
        tx.select().from(faqs),
        tx.select().from(mediaShowcase),
        tx.select().from(contactChannels),
        tx.select().from(templatePresets),
      ]);
      return Object.freeze({ quotes, faqRows, showcase, channels, templates });
    });
  }

  async saveTestimonial(authUserId: string, localUserId: string, row: {
    readonly id: string; readonly quote: string; readonly author: string; readonly role: string;
    readonly media: string; readonly sortOrder: number; readonly active: boolean;
  }): Promise<void> {
    return this.platform(authUserId, localUserId, async (tx) => {
      await tx.insert(testimonials).values({ ...row, updatedAt: new Date() }).onConflictDoUpdate({
        target: testimonials.id,
        set: { quote: row.quote, author: row.author, role: row.role, media: row.media, sortOrder: row.sortOrder, active: row.active, updatedAt: new Date() },
      });
    });
  }

  async saveFaq(authUserId: string, localUserId: string, row: {
    readonly id: string; readonly question: string; readonly answer: string; readonly sortOrder: number; readonly active: boolean;
  }): Promise<void> {
    return this.platform(authUserId, localUserId, async (tx) => {
      await tx.insert(faqs).values({ ...row, updatedAt: new Date() }).onConflictDoUpdate({
        target: faqs.id,
        set: { question: row.question, answer: row.answer, sortOrder: row.sortOrder, active: row.active, updatedAt: new Date() },
      });
    });
  }

  async saveShowcaseEntry(authUserId: string, localUserId: string, row: {
    readonly id: string; readonly name: string; readonly sortOrder: number; readonly active: boolean;
  }): Promise<void> {
    return this.platform(authUserId, localUserId, async (tx) => {
      await tx.insert(mediaShowcase).values({ ...row, updatedAt: new Date() }).onConflictDoUpdate({
        target: mediaShowcase.id,
        set: { name: row.name, sortOrder: row.sortOrder, active: row.active, updatedAt: new Date() },
      });
    });
  }

  async saveChannel(authUserId: string, localUserId: string, row: {
    readonly key: string; readonly title: string; readonly description: string; readonly href?: string | null | undefined; readonly sortOrder: number;
  }): Promise<void> {
    const href = typeof row.href === 'string' && row.href.trim() !== '' ? row.href.trim() : null;
    return this.platform(authUserId, localUserId, async (tx) => {
      await tx.insert(contactChannels).values({ ...row, href, updatedAt: new Date() }).onConflictDoUpdate({
        target: contactChannels.key,
        set: { title: row.title, description: row.description, href, sortOrder: row.sortOrder, updatedAt: new Date() },
      });
    });
  }

  async saveTemplatePreset(authUserId: string, localUserId: string, row: {
    readonly id: string; readonly name: string; readonly description: string; readonly category: string;
  }): Promise<void> {
    return this.platform(authUserId, localUserId, async (tx) => {
      await tx.insert(templatePresets).values({ ...row, updatedAt: new Date() }).onConflictDoUpdate({
        target: templatePresets.id,
        set: { name: row.name, description: row.description, category: row.category, updatedAt: new Date() },
      });
    });
  }

  async deleteContentRow(authUserId: string, localUserId: string, kind: 'testimonial' | 'faq' | 'showcase' | 'channel' | 'template', id: string): Promise<void> {
    return this.platform(authUserId, localUserId, async (tx) => {
      if (kind === 'testimonial') await tx.delete(testimonials).where(eq(testimonials.id, id));
      else if (kind === 'faq') await tx.delete(faqs).where(eq(faqs.id, id));
      else if (kind === 'showcase') await tx.delete(mediaShowcase).where(eq(mediaShowcase.id, id));
      else if (kind === 'channel') await tx.delete(contactChannels).where(eq(contactChannels.key, id));
      else await tx.delete(templatePresets).where(eq(templatePresets.id, id));
    });
  }
}

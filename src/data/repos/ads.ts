import { and, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import {
  AdsAccessDeniedError,
  AdsConflictError,
  AdsNotFoundError,
  type AdsAdvertiserDeleteInput,
  type AdsAdvertiserInput,
  type AdsAdvertiserUpdateInput,
  type AdsCampaignDeleteInput,
  type AdsCampaignInput,
  type AdsCampaignStatusInput,
  type AdsCampaignUpdateInput,
  type AdsCreativeDeleteInput,
  type AdsCreativeInput,
  type AdsCreativeStatusInput,
  type AdsCreativeUpdateInput,
  type AdsNetworkSlotInput,
  type AdsOverview,
  type AdsPlacementDeleteInput,
  type AdsPlacementInput,
  type AdsPlacementUpdateInput,
  type AdsRepository,
  type AdsTenantSettingInput,
  type AdsUploadedCreativeInput,
} from '@/modules/ads/ports';
import type * as schema from '@/data/schema';
import { adCreatives, adPlacements, adSlots, advertisers, auditLogs, campaigns, sites, siteSettings, tenantAdSettings } from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const iso = (value: Date | string) => (value instanceof Date ? value : new Date(value)).toISOString();
const OVERVIEW_LIMITS = { sites: 200, slots: 32, settings: 2000, advertisers: 200, campaigns: 200, creatives: 500, placements: 500 } as const;

function foreignKeyViolation(error: unknown): boolean {
  return (error as { code?: unknown })?.code === '23503';
}

/**
 * Dashboard persistence for ad management.
 *
 * @remarks Writes run inside one transaction with the RLS tenant context set
 * from the actor, org-scoped predicates on every statement, optimistic
 * version checks on updates, and one `audit_logs` row per mutation.
 */
export class DrizzleAdsRepository implements AdsRepository {
  constructor(private readonly database: Database) {}

  private async tenant(transaction: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    if (!actor.permissionSet.has(DASHBOARD_PERMISSIONS.siteManage)) throw new AdsAccessDeniedError();
    await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${actor.requestId})`);
  }

  private audit(transaction: Transaction, actor: AuthorizedTenantActorContext, action: string, targetType: string, targetId: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null, requestId: string, now: string): Promise<unknown> {
    const beforeValue = before === null ? null : before;
    const afterValue = after === null ? null : after;
    const changed = beforeValue === null ? Object.keys(afterValue ?? {}).sort() : afterValue === null ? Object.keys(beforeValue).sort() : Object.keys({ ...beforeValue, ...afterValue }).filter((key) => JSON.stringify(beforeValue[key]) !== JSON.stringify(afterValue[key])).sort();
    return transaction.insert(auditLogs).values({
      organizationId: actor.organizationId,
      id: crypto.randomUUID(),
      actorType: actor.actorType === 'user' ? 'user' : 'api_key',
      actorId: actor.actorId,
      entryPoint: 'dashboard',
      action,
      targetType,
      targetId,
      outcome: 'succeeded',
      changedFields: changed,
      before: beforeValue,
      after: afterValue,
      requestId,
      occurredAt: new Date(now),
    });
  }

  async overview(actor: AuthorizedTenantActorContext): Promise<AdsOverview> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const org = actor.organizationId;
      const [siteRows, slotRows, settingRows, advertiserRows, campaignRows, creativeRows, placementRows] = await Promise.all([
        transaction.select({ id: sites.id, name: siteSettings.name, hostname: sites.normalizedHostname, templateId: siteSettings.templateId })
          .from(sites)
          .innerJoin(siteSettings, and(eq(siteSettings.organizationId, sites.organizationId), eq(siteSettings.siteId, sites.id)))
          .where(and(eq(sites.organizationId, org), eq(sites.status, 'active')))
          .orderBy(sites.normalizedHostname)
          .limit(OVERVIEW_LIMITS.sites),
        transaction.select({ id: adSlots.id, name: adSlots.name, description: adSlots.description, active: adSlots.active })
          .from(adSlots)
          .orderBy(adSlots.id)
          .limit(OVERVIEW_LIMITS.slots),
        transaction.select({ siteId: tenantAdSettings.siteId, slotId: tenantAdSettings.slotId, enabled: tenantAdSettings.enabled, creativeId: tenantAdSettings.creativeId, version: tenantAdSettings.version, updatedAt: tenantAdSettings.updatedAt })
          .from(tenantAdSettings)
          .where(eq(tenantAdSettings.organizationId, org))
          .limit(OVERVIEW_LIMITS.settings),
        transaction.select({ id: advertisers.id, name: advertisers.name, contactEmail: advertisers.contactEmail, status: advertisers.status, version: advertisers.version })
          .from(advertisers)
          .where(eq(advertisers.organizationId, org))
          .orderBy(advertisers.name)
          .limit(OVERVIEW_LIMITS.advertisers),
        transaction.select({ id: campaigns.id, advertiserId: campaigns.advertiserId, name: campaigns.name, status: campaigns.status, priority: campaigns.priority, startsAt: campaigns.startsAt, endsAt: campaigns.endsAt, version: campaigns.version })
          .from(campaigns)
          .where(eq(campaigns.organizationId, org))
          .orderBy(campaigns.name)
          .limit(OVERVIEW_LIMITS.campaigns),
        transaction.select({ id: adCreatives.id, campaignId: adCreatives.campaignId, kind: adCreatives.kind, imageUrl: adCreatives.imageUrl, href: adCreatives.href, altText: adCreatives.altText, widthPx: adCreatives.widthPx, heightPx: adCreatives.heightPx, html: adCreatives.html, provider: adCreatives.provider, providerClientId: adCreatives.providerClientId, providerSlotId: adCreatives.providerSlotId, status: adCreatives.status, version: adCreatives.version })
          .from(adCreatives)
          .where(eq(adCreatives.organizationId, org))
          .orderBy(adCreatives.createdAt)
          .limit(OVERVIEW_LIMITS.creatives),
        transaction.select({ id: adPlacements.id, campaignId: adPlacements.campaignId, creativeId: adPlacements.creativeId, slotId: adPlacements.slotId, siteId: adPlacements.siteId, templateId: adPlacements.templateId, device: adPlacements.device, priority: adPlacements.priority, startsAt: adPlacements.startsAt, endsAt: adPlacements.endsAt, active: adPlacements.active, version: adPlacements.version })
          .from(adPlacements)
          .where(eq(adPlacements.organizationId, org))
          .orderBy(adPlacements.createdAt)
          .limit(OVERVIEW_LIMITS.placements),
      ]);
      return {
        sites: siteRows.map((row) => ({ id: row.id, name: row.name, hostname: row.hostname, templateId: row.templateId })),
        slots: slotRows.map((row) => ({ ...row })),
        settings: settingRows.map((row) => ({ ...row, updatedAt: iso(row.updatedAt) })),
        advertisers: advertiserRows.map((row) => ({ ...row })),
        campaigns: campaignRows.map((row) => ({ ...row, startsAt: row.startsAt === null ? null : iso(row.startsAt), endsAt: row.endsAt === null ? null : iso(row.endsAt) })),
        creatives: creativeRows.map((row) => ({ ...row })),
        placements: placementRows.map((row) => ({ ...row, startsAt: row.startsAt === null ? null : iso(row.startsAt), endsAt: row.endsAt === null ? null : iso(row.endsAt) })),
      };
    });
  }

  async saveTenantSetting(actor: AuthorizedTenantActorContext, input: AdsTenantSettingInput): Promise<{ readonly version: number }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const org = actor.organizationId;
      const now = new Date().toISOString();
      const existing = await transaction.select({ enabled: tenantAdSettings.enabled, creativeId: tenantAdSettings.creativeId, version: tenantAdSettings.version })
        .from(tenantAdSettings)
        .where(and(eq(tenantAdSettings.organizationId, org), eq(tenantAdSettings.siteId, input.siteId), eq(tenantAdSettings.slotId, input.slotId)))
        .limit(1);
      const current = existing[0];
      if (current !== undefined && input.expectedVersion !== null && current.version !== input.expectedVersion) throw new AdsConflictError();
      try {
        if (current === undefined) {
          await transaction.insert(tenantAdSettings).values({
            organizationId: org, siteId: input.siteId, slotId: input.slotId,
            enabled: input.enabled, creativeId: input.creativeId, version: 1,
            createdAt: new Date(now), updatedAt: new Date(now),
          });
        } else {
          const updated = await transaction.update(tenantAdSettings)
            .set({ enabled: input.enabled, creativeId: input.creativeId, version: current.version + 1, updatedAt: new Date(now) })
            .where(and(eq(tenantAdSettings.organizationId, org), eq(tenantAdSettings.siteId, input.siteId), eq(tenantAdSettings.slotId, input.slotId), eq(tenantAdSettings.version, current.version)))
            .returning({ version: tenantAdSettings.version });
          if (updated[0] === undefined) throw new AdsConflictError();
        }
      } catch (error) {
        if (error instanceof AdsConflictError) throw error;
        if (foreignKeyViolation(error)) throw new AdsNotFoundError();
        if ((error as { code?: unknown })?.code === '23505') throw new AdsConflictError();
        throw error;
      }
      const version = current === undefined ? 1 : current.version + 1;
      await this.audit(transaction, actor, 'ads.tenant_setting.save', 'tenant_ad_setting', `${input.siteId}:${input.slotId}`,
        current === undefined ? null : { enabled: current.enabled, creativeId: current.creativeId },
        { enabled: input.enabled, creativeId: input.creativeId }, input.requestId, now);
      return { version };
    });
  }

  async saveNetworkSlot(actor: AuthorizedTenantActorContext, input: AdsNetworkSlotInput): Promise<{ readonly creativeId: string | null; readonly savedSites: number }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const org = actor.organizationId;
      const now = new Date().toISOString();
      const siteRows = await transaction.select({ id: sites.id })
        .from(sites)
        .where(and(eq(sites.organizationId, org), eq(sites.status, 'active')))
        .limit(OVERVIEW_LIMITS.sites);
      let creativeId: string | null = null;
      const creative = input.creative;
      if (creative.mode === 'existing') {
        const found = await transaction.select({ id: adCreatives.id })
          .from(adCreatives)
          .where(and(eq(adCreatives.organizationId, org), eq(adCreatives.id, creative.creativeId ?? '')))
          .limit(1);
        if (found[0] === undefined) throw new AdsNotFoundError();
        creativeId = found[0].id;
      } else if (creative.mode === 'image-url') {
        const id = crypto.randomUUID();
        creativeId = id;
        await transaction.insert(adCreatives).values({
          organizationId: org, id, campaignId: null, kind: 'image',
          imageUrl: creative.imageUrl ?? '', href: creative.href === undefined || creative.href === '' ? null : creative.href,
          altText: creative.alt ?? null, widthPx: null, heightPx: null, html: null,
          provider: null, providerClientId: null, providerSlotId: null,
          status: 'active', version: 1, createdAt: new Date(now), updatedAt: new Date(now),
        });
        await this.audit(transaction, actor, 'ads.network_setting.save', 'ad_creative', id, null, { kind: 'image' }, input.requestId, now);
      } else if (creative.mode === 'html') {
        const id = crypto.randomUUID();
        creativeId = id;
        await transaction.insert(adCreatives).values({
          organizationId: org, id, campaignId: null, kind: 'html',
          imageUrl: null, href: null, altText: null, widthPx: null, heightPx: null, html: creative.html ?? '',
          provider: null, providerClientId: null, providerSlotId: null,
          status: 'active', version: 1, createdAt: new Date(now), updatedAt: new Date(now),
        });
        await this.audit(transaction, actor, 'ads.network_setting.save', 'ad_creative', id, null, { kind: 'html' }, input.requestId, now);
      } else if (creative.mode === 'provider') {
        const id = crypto.randomUUID();
        creativeId = id;
        await transaction.insert(adCreatives).values({
          organizationId: org, id, campaignId: null, kind: 'provider',
          imageUrl: null, href: null, altText: null, widthPx: null, heightPx: null, html: null,
          provider: 'adsense', providerClientId: creative.clientId ?? null, providerSlotId: creative.providerSlotId ?? null,
          status: 'active', version: 1, createdAt: new Date(now), updatedAt: new Date(now),
        });
        await this.audit(transaction, actor, 'ads.network_setting.save', 'ad_creative', id, null, { kind: 'provider' }, input.requestId, now);
      }
      const settingRows = await transaction.select({ siteId: tenantAdSettings.siteId, enabled: tenantAdSettings.enabled, creativeId: tenantAdSettings.creativeId, version: tenantAdSettings.version })
        .from(tenantAdSettings)
        .where(and(eq(tenantAdSettings.organizationId, org), eq(tenantAdSettings.slotId, input.slotId)));
      const currentBySite = new Map(settingRows.map((row) => [row.siteId, row]));
      for (const site of siteRows) {
        const expected = input.expectedVersions[site.id];
        const current = currentBySite.get(site.id);
        if (current !== undefined && expected !== undefined && expected !== null && current.version !== expected) throw new AdsConflictError();
      }
      for (const site of siteRows) {
        const current = currentBySite.get(site.id);
        try {
          if (current === undefined) {
            await transaction.insert(tenantAdSettings).values({
              organizationId: org, siteId: site.id, slotId: input.slotId,
              enabled: input.enabled, creativeId, version: 1,
              createdAt: new Date(now), updatedAt: new Date(now),
            });
          } else {
            const updated = await transaction.update(tenantAdSettings)
              .set({ enabled: input.enabled, creativeId, version: current.version + 1, updatedAt: new Date(now) })
              .where(and(eq(tenantAdSettings.organizationId, org), eq(tenantAdSettings.siteId, site.id), eq(tenantAdSettings.slotId, input.slotId), eq(tenantAdSettings.version, current.version)))
              .returning({ version: tenantAdSettings.version });
            if (updated[0] === undefined) throw new AdsConflictError();
          }
        } catch (error) {
          if (error instanceof AdsConflictError) throw error;
          if (foreignKeyViolation(error)) throw new AdsNotFoundError();
          if ((error as { code?: unknown })?.code === '23505') throw new AdsConflictError();
          throw error;
        }
        await this.audit(transaction, actor, 'ads.network_setting.save', 'tenant_ad_setting', `${site.id}:${input.slotId}`,
          current === undefined ? null : { enabled: current.enabled, creativeId: current.creativeId },
          { enabled: input.enabled, creativeId }, input.requestId, now);
      }
      return { creativeId, savedSites: siteRows.length };
    });
  }

  async createAdvertiser(actor: AuthorizedTenantActorContext, input: AdsAdvertiserInput): Promise<{ readonly id: string }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await transaction.insert(advertisers).values({
        organizationId: actor.organizationId, id, name: input.name, contactEmail: input.contactEmail,
        status: 'active', version: 1, createdAt: new Date(now), updatedAt: new Date(now),
      });
      await this.audit(transaction, actor, 'ads.advertiser.create', 'advertiser', id, null, { name: input.name }, input.requestId, now);
      return { id };
    });
  }

  /**
   * Updates an advertiser name/contact guarded by optimistic version.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param input - Advertiser id, new fields, and expected version.
   * @returns Next version after the write.
   */
  async updateAdvertiser(actor: AuthorizedTenantActorContext, input: AdsAdvertiserUpdateInput): Promise<{ readonly version: number }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const patch: { name: string; contactEmail?: string | null; version: number; updatedAt: Date } = {
        name: input.name, version: input.expectedVersion + 1, updatedAt: new Date(now),
      };
      if (input.contactEmail !== undefined) patch.contactEmail = input.contactEmail;
      const updated = await transaction.update(advertisers)
        .set(patch)
        .where(and(eq(advertisers.organizationId, actor.organizationId), eq(advertisers.id, input.id), eq(advertisers.version, input.expectedVersion)))
        .returning({ version: advertisers.version });
      if (updated[0] === undefined) throw new AdsConflictError();
      await this.audit(transaction, actor, 'ads.advertiser.update', 'advertiser', input.id, null, { name: input.name }, input.requestId, now);
      return { version: updated[0].version };
    });
  }

  /**
   * Hard-deletes an advertiser row.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param input - Advertiser id to delete.
   */
  async deleteAdvertiser(actor: AuthorizedTenantActorContext, input: AdsAdvertiserDeleteInput): Promise<void> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      try {
        const deleted = await transaction.delete(advertisers)
          .where(and(eq(advertisers.organizationId, actor.organizationId), eq(advertisers.id, input.id)))
          .returning({ id: advertisers.id });
        if (deleted[0] === undefined) throw new AdsNotFoundError();
      } catch (error) {
        if (error instanceof AdsNotFoundError) throw error;
        if (foreignKeyViolation(error)) throw new AdsConflictError('Pengiklan masih dipakai kampanye. Hapus atau pindahkan kampanyenya dulu.');
        throw error;
      }
      await this.audit(transaction, actor, 'ads.advertiser.delete', 'advertiser', input.id, { id: input.id }, null, input.requestId, now);
    });
  }

  async createCreative(actor: AuthorizedTenantActorContext, input: AdsCreativeInput): Promise<{ readonly id: string }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      try {
        await transaction.insert(adCreatives).values({
          organizationId: actor.organizationId, id, campaignId: input.campaignId, kind: input.kind,
          imageUrl: input.imageUrl ?? null, href: input.href === undefined || input.href === '' ? null : input.href, altText: input.alt ?? null,
          widthPx: input.width ?? null, heightPx: input.height ?? null, html: input.html ?? null,
          provider: input.provider ?? null, providerClientId: input.clientId ?? null, providerSlotId: input.slotId ?? null,
          status: 'active', version: 1, createdAt: new Date(now), updatedAt: new Date(now),
        });
      } catch (error) {
        if (foreignKeyViolation(error)) throw new AdsNotFoundError();
        throw error;
      }
      await this.audit(transaction, actor, 'ads.creative.create', 'ad_creative', id, null, { kind: input.kind }, input.requestId, now);
      return { id };
    });
  }

  /**
   * Persists an uploaded image as an image creative with captured dimensions.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param input - Public image URL, natural dimensions, and optional link fields.
   * @returns New creative id.
   */
  async createUploadedCreative(actor: AuthorizedTenantActorContext, input: AdsUploadedCreativeInput): Promise<{ readonly id: string }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      try {
        await transaction.insert(adCreatives).values({
          organizationId: actor.organizationId, id, campaignId: input.campaignId, kind: 'image',
          imageUrl: input.imageUrl, href: input.href === undefined || input.href === '' ? null : input.href, altText: input.alt ?? null,
          widthPx: input.width, heightPx: input.height, html: null,
          provider: null, providerClientId: null, providerSlotId: null,
          status: 'active', version: 1, createdAt: new Date(now), updatedAt: new Date(now),
        });
      } catch (error) {
        if (foreignKeyViolation(error)) throw new AdsNotFoundError();
        throw error;
      }
      await this.audit(transaction, actor, 'ads.creative.upload', 'ad_creative', id, null, { kind: 'image', imageUrl: input.imageUrl }, input.requestId, now);
      return { id };
    });
  }

  async updateCreativeStatus(actor: AuthorizedTenantActorContext, input: AdsCreativeStatusInput): Promise<{ readonly version: number }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const updated = await transaction.update(adCreatives)
        .set({ status: input.status, version: input.expectedVersion + 1, updatedAt: new Date(now) })
        .where(and(eq(adCreatives.organizationId, actor.organizationId), eq(adCreatives.id, input.id), eq(adCreatives.version, input.expectedVersion)))
        .returning({ version: adCreatives.version });
      if (updated[0] === undefined) throw new AdsConflictError();
      await this.audit(transaction, actor, 'ads.creative.status', 'ad_creative', input.id, null, { status: input.status }, input.requestId, now);
      return { version: updated[0].version };
    });
  }

  /**
   * Updates creative fields per kind guarded by optimistic version.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param input - Creative id, per-kind fields, and expected version.
   * @returns Next version after the write.
   */
  async updateCreative(actor: AuthorizedTenantActorContext, input: AdsCreativeUpdateInput): Promise<{ readonly version: number }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const patch: {
        campaignId?: string | null;
        imageUrl?: string | null;
        href?: string | null;
        altText?: string | null;
        widthPx?: number | null;
        heightPx?: number | null;
        html?: string | null;
        provider?: string | null;
        providerClientId?: string | null;
        providerSlotId?: string | null;
        version: number;
        updatedAt: Date;
      } = { version: input.expectedVersion + 1, updatedAt: new Date(now) };
      if (input.campaignId !== undefined) patch.campaignId = input.campaignId;
      if (input.kind === 'image') {
        if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
        if (input.href !== undefined) patch.href = input.href === '' ? null : input.href;
        if (input.alt !== undefined) patch.altText = input.alt;
        if (input.width !== undefined) patch.widthPx = input.width;
        if (input.height !== undefined) patch.heightPx = input.height;
      } else if (input.kind === 'html') {
        if (input.html !== undefined) patch.html = input.html;
      } else {
        if (input.provider !== undefined) patch.provider = input.provider;
        if (input.clientId !== undefined) patch.providerClientId = input.clientId;
        if (input.slotId !== undefined) patch.providerSlotId = input.slotId;
      }
      let updated: readonly { version: number }[];
      try {
        updated = await transaction.update(adCreatives)
          .set(patch)
          .where(and(eq(adCreatives.organizationId, actor.organizationId), eq(adCreatives.id, input.id), eq(adCreatives.version, input.expectedVersion)))
          .returning({ version: adCreatives.version });
      } catch (error) {
        if (foreignKeyViolation(error)) throw new AdsNotFoundError();
        throw error;
      }
      if (updated[0] === undefined) throw new AdsConflictError();
      await this.audit(transaction, actor, 'ads.creative.update', 'ad_creative', input.id, null, { kind: input.kind }, input.requestId, now);
      return { version: updated[0].version };
    });
  }

  /**
   * Hard-deletes a creative row.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param input - Creative id to delete.
   */
  async deleteCreative(actor: AuthorizedTenantActorContext, input: AdsCreativeDeleteInput): Promise<void> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      try {
        const deleted = await transaction.delete(adCreatives)
          .where(and(eq(adCreatives.organizationId, actor.organizationId), eq(adCreatives.id, input.id)))
          .returning({ id: adCreatives.id });
        if (deleted[0] === undefined) throw new AdsNotFoundError();
      } catch (error) {
        if (error instanceof AdsNotFoundError) throw error;
        if (foreignKeyViolation(error)) throw new AdsConflictError('Kreatif masih dipakai penempatan atau slot situs. Hapus penempatan dan slot kustomnya dulu.');
        throw error;
      }
      await this.audit(transaction, actor, 'ads.creative.delete', 'ad_creative', input.id, { id: input.id }, null, input.requestId, now);
    });
  }

  async createCampaign(actor: AuthorizedTenantActorContext, input: AdsCampaignInput): Promise<{ readonly id: string }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      try {
        await transaction.insert(campaigns).values({
          organizationId: actor.organizationId, id, advertiserId: input.advertiserId, name: input.name,
          status: input.status, priority: input.priority,
          startsAt: input.startsAt === null ? null : new Date(input.startsAt),
          endsAt: input.endsAt === null ? null : new Date(input.endsAt),
          version: 1, createdAt: new Date(now), updatedAt: new Date(now),
        });
      } catch (error) {
        if (foreignKeyViolation(error)) throw new AdsNotFoundError();
        throw error;
      }
      await this.audit(transaction, actor, 'ads.campaign.create', 'campaign', id, null, { name: input.name, status: input.status }, input.requestId, now);
      return { id };
    });
  }

  async updateCampaignStatus(actor: AuthorizedTenantActorContext, input: AdsCampaignStatusInput): Promise<{ readonly version: number }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const updated = await transaction.update(campaigns)
        .set({ status: input.status, version: input.expectedVersion + 1, updatedAt: new Date(now) })
        .where(and(eq(campaigns.organizationId, actor.organizationId), eq(campaigns.id, input.id), eq(campaigns.version, input.expectedVersion)))
        .returning({ version: campaigns.version });
      if (updated[0] === undefined) throw new AdsConflictError();
      await this.audit(transaction, actor, 'ads.campaign.status', 'campaign', input.id, null, { status: input.status }, input.requestId, now);
      return { version: updated[0].version };
    });
  }

  /**
   * Updates campaign name/priority/window guarded by optimistic version.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param input - Campaign id, partial fields, and expected version.
   * @returns Next version after the write.
   */
  async updateCampaign(actor: AuthorizedTenantActorContext, input: AdsCampaignUpdateInput): Promise<{ readonly version: number }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const patch: { name?: string; priority?: number; startsAt?: Date | null; endsAt?: Date | null; version: number; updatedAt: Date } = {
        version: input.expectedVersion + 1, updatedAt: new Date(now),
      };
      if (input.name !== undefined) patch.name = input.name;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.startsAt !== undefined) patch.startsAt = input.startsAt === null ? null : new Date(input.startsAt);
      if (input.endsAt !== undefined) patch.endsAt = input.endsAt === null ? null : new Date(input.endsAt);
      const updated = await transaction.update(campaigns)
        .set(patch)
        .where(and(eq(campaigns.organizationId, actor.organizationId), eq(campaigns.id, input.id), eq(campaigns.version, input.expectedVersion)))
        .returning({ version: campaigns.version });
      if (updated[0] === undefined) throw new AdsConflictError();
      await this.audit(transaction, actor, 'ads.campaign.update', 'campaign', input.id, null, { ...patch, version: undefined, updatedAt: undefined }, input.requestId, now);
      return { version: updated[0].version };
    });
  }

  /**
   * Hard-deletes a campaign row.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param input - Campaign id to delete.
   */
  async deleteCampaign(actor: AuthorizedTenantActorContext, input: AdsCampaignDeleteInput): Promise<void> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      try {
        const deleted = await transaction.delete(campaigns)
          .where(and(eq(campaigns.organizationId, actor.organizationId), eq(campaigns.id, input.id)))
          .returning({ id: campaigns.id });
        if (deleted[0] === undefined) throw new AdsNotFoundError();
      } catch (error) {
        if (error instanceof AdsNotFoundError) throw error;
        if (foreignKeyViolation(error)) throw new AdsConflictError('Kampanye masih dipakai penempatan atau kreatif. Hapus penempatan dan kreatifnya dulu.');
        throw error;
      }
      await this.audit(transaction, actor, 'ads.campaign.delete', 'campaign', input.id, { id: input.id }, null, input.requestId, now);
    });
  }

  async createPlacement(actor: AuthorizedTenantActorContext, input: AdsPlacementInput): Promise<{ readonly id: string }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      try {
        await transaction.insert(adPlacements).values({
          organizationId: actor.organizationId, id, campaignId: input.campaignId, creativeId: input.creativeId,
          slotId: input.slotId, siteId: input.siteId, templateId: input.templateId, device: input.device,
          priority: input.priority,
          startsAt: input.startsAt === null ? null : new Date(input.startsAt),
          endsAt: input.endsAt === null ? null : new Date(input.endsAt),
          active: true, version: 1, createdAt: new Date(now), updatedAt: new Date(now),
        });
      } catch (error) {
        if (foreignKeyViolation(error)) throw new AdsNotFoundError();
        throw error;
      }
      await this.audit(transaction, actor, 'ads.placement.create', 'ad_placement', id, null, { slotId: input.slotId }, input.requestId, now);
      return { id };
    });
  }

  async updatePlacement(actor: AuthorizedTenantActorContext, input: AdsPlacementUpdateInput): Promise<{ readonly version: number }> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      const patch: { active?: boolean; priority?: number; startsAt?: Date | null; endsAt?: Date | null; version: number; updatedAt: Date } = {
        version: input.expectedVersion + 1, updatedAt: new Date(now),
      };
      if (input.active !== undefined) patch.active = input.active;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.startsAt !== undefined) patch.startsAt = input.startsAt === null ? null : new Date(input.startsAt);
      if (input.endsAt !== undefined) patch.endsAt = input.endsAt === null ? null : new Date(input.endsAt);
      const updated = await transaction.update(adPlacements)
        .set(patch)
        .where(and(eq(adPlacements.organizationId, actor.organizationId), eq(adPlacements.id, input.id), eq(adPlacements.version, input.expectedVersion)))
        .returning({ version: adPlacements.version });
      if (updated[0] === undefined) throw new AdsConflictError();
      await this.audit(transaction, actor, 'ads.placement.update', 'ad_placement', input.id, null, { ...patch, version: undefined, updatedAt: undefined }, input.requestId, now);
      return { version: updated[0].version };
    });
  }

  /**
   * Hard-deletes a placement row.
   *
   * @param actor - Tenant actor with the `site.manage` grant.
   * @param input - Placement id to delete.
   */
  async deletePlacement(actor: AuthorizedTenantActorContext, input: AdsPlacementDeleteInput): Promise<void> {
    return this.database.transaction(async (transaction) => {
      await this.tenant(transaction, actor);
      const now = new Date().toISOString();
      try {
        const deleted = await transaction.delete(adPlacements)
          .where(and(eq(adPlacements.organizationId, actor.organizationId), eq(adPlacements.id, input.id)))
          .returning({ id: adPlacements.id });
        if (deleted[0] === undefined) throw new AdsNotFoundError();
      } catch (error) {
        if (error instanceof AdsNotFoundError) throw error;
        if (foreignKeyViolation(error)) throw new AdsConflictError('Penempatan masih dipakai data lain. Hapus rujukan tersebut dulu.');
        throw error;
      }
      await this.audit(transaction, actor, 'ads.placement.delete', 'ad_placement', input.id, { id: input.id }, null, input.requestId, now);
    });
  }
}

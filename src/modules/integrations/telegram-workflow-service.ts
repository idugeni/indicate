import { createHash, timingSafeEqual } from 'node:crypto';

import type { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import type { MediaService } from '@/modules/publishing/media-service';
import type { PublicationService } from '@/modules/publishing/publication-service';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { TelegramConversation, TelegramIdentity, TelegramUpdate, TelegramWorkflowResult, WebhookReplayClaim } from '@/modules/integrations/models';
import type { IntegrationsRepository } from '@/modules/integrations/ports';
import type { TelegramMediaTransferPort } from '@/modules/integrations/ports';
import type { TelegramPort } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { telegramUpdateSchema } from '@/modules/integrations/schemas';

export interface TelegramSharedServices {
  readonly articles: TenantBusinessService;
  readonly media: MediaService;
  readonly publication: PublicationService;
}
export interface TelegramSharedServiceFactory { create(): TelegramSharedServices }

const safeEqual = (left: string, right: string): boolean => { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const words = (text: string) => text.trim().split(/\s+/);
const ids = (text: string) => text.split(',').map((value) => value.trim()).filter(Boolean);

export class TelegramWorkflowService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly services: TelegramSharedServiceFactory,
    private readonly mediaTransfer: TelegramMediaTransferPort,
    private readonly telegram: TelegramPort,
    private readonly webhookSecret: string,
    private readonly freshnessSeconds: number,
    private readonly replayTtlSeconds: number,
    private readonly clock: { now(): Date } = { now: () => new Date() },
  ) {}

  private actor(identity: TelegramIdentity, requestId: string): AuthorizedTenantActorContext {
    return Object.freeze({ actorType: 'telegram', actorId: identity.mappingId, organizationId: identity.organizationId, permissionSet: identity.permissions, entryPoint: 'telegram', requestId });
  }
  private conversation(identity: TelegramIdentity, step: TelegramConversation['step'], data: Readonly<Record<string, unknown>>): TelegramConversation {
    const now = this.clock.now(); return Object.freeze({ source: 'telegram', chatId: identity.telegramChatId, userId: identity.telegramUserId, organizationId: identity.organizationId, step, data, updatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 3_600_000).toISOString() });
  }
  private async reply(text: string): Promise<TelegramWorkflowResult> { return { reply: text }; }
  private parse(raw: unknown): TelegramUpdate | null {
    const parsed = telegramUpdateSchema.safeParse(raw); if (!parsed.success) return null;
    const message = parsed.data.message;
    const document = message.document;
    return {
      updateId: String(parsed.data.update_id), occurredAt: new Date(message.date * 1_000).toISOString(), userId: String(message.from.id), chatId: String(message.chat.id), text: message.text ?? null,
      document: document === undefined || document.file_name === undefined || document.mime_type === undefined || document.file_size === undefined
        ? null
        : { fileId: document.file_id, filename: document.file_name, mediaType: document.mime_type, sizeBytes: document.file_size },
    };
  }

  private safeFailureReply(error: PublicErrorEnvelope): string {
    if (error.error.code === 'INVALID_INPUT') return error.error.message;
    if (error.error.code === 'CONFLICT' || error.error.code === 'IDEMPOTENCY_CONFLICT' || error.error.code === 'INVALID_STATE_TRANSITION') return 'The request conflicts with the current state. Refresh status and try again.';
    if (error.error.code === 'DEPENDENCY_UNAVAILABLE') return 'Telegram processing is temporarily unavailable. Please retry later.';
    return 'The requested Telegram operation is unavailable.';
  }
  private async finalizePrepared(source: string, replayId: string, bodyDigest: string, claimToken: string): Promise<void> {
    try { await this.repository.finalizeReplay(source, replayId, bodyDigest, claimToken, this.clock.now().toISOString()); }
    catch { /* a prepared outcome is durable and the next duplicate will reconcile it */ }
  }
  private recoveredBusinessOutcome(claim: WebhookReplayClaim): Readonly<Record<string, unknown>> | null {
    const receipt = claim.businessReceipt;
    if (receipt === null || typeof receipt.action !== 'string' || typeof receipt.targetId !== 'string') return null;
    if (receipt.action === 'article.create') return { reply: `Article created: ${receipt.targetId}`, recovered: true };
    if (receipt.action === 'article.sites.assign') {
      const after = typeof receipt.after === 'object' && receipt.after !== null ? receipt.after as Readonly<Record<string, unknown>> : {};
      const count = Array.isArray(after.siteIds) ? after.siteIds.length : 0;
      return { reply: `Assigned ${count} Site(s).`, recovered: true };
    }
    if (receipt.action === 'media.activate') return { reply: `Image uploaded: ${receipt.targetId}`, recovered: true };
    if (receipt.action === 'publication.request') return { reply: `Publication accepted. Job: ${receipt.targetId}`, recovered: true };
    return null;
  }
  private async replayPrepared(claim: WebhookReplayClaim, chatId: string, requestId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    let replayClaim = claim;
    if (replayClaim.outcome === null) {
      const recovered = this.recoveredBusinessOutcome(replayClaim);
      if (recovered === null) return { ok: false, error: createPublicError('CONFLICT', 'Telegram update is already processing.', requestId) };
      try { replayClaim = await this.repository.prepareReplayOutcome(replayClaim.source, replayClaim.replayId, replayClaim.bodyDigest, replayClaim.claimToken, 'processed', recovered, this.clock.now().toISOString()); }
      catch { return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Telegram processing is temporarily unavailable.', requestId) }; }
    }
    if (replayClaim.status === 'claimed' && replayClaim.pendingStatus !== null) await this.finalizePrepared(replayClaim.source, replayClaim.replayId, replayClaim.bodyDigest, replayClaim.claimToken);
    const outcome = replayClaim.outcome;
    if (outcome === null) return { ok: false, error: createPublicError('CONFLICT', 'Telegram update is already processing.', requestId) };
    const reply = typeof outcome.reply === 'string' ? outcome.reply : 'Telegram update already processed.';
    try { await this.telegram.send({ chatId, text: reply }); } catch { /* replay outcome remains durable */ }
    const terminalStatus = replayClaim.status === 'claimed' ? replayClaim.pendingStatus : replayClaim.status;
    if (terminalStatus === 'processed') return { ok: true, value: { reply } };
    const code = outcome.code;
    const publicCode = code === 'INVALID_INPUT' || code === 'CONFLICT' || code === 'IDEMPOTENCY_CONFLICT' || code === 'INVALID_STATE_TRANSITION' || code === 'DEPENDENCY_UNAVAILABLE' || code === 'RESOURCE_UNAVAILABLE' ? code : 'RESOURCE_UNAVAILABLE';
    const message = typeof outcome.message === 'string' ? outcome.message : reply;
    const rawFields = outcome.fields;
    const fields = typeof rawFields === 'object' && rawFields !== null
      ? Object.fromEntries(Object.entries(rawFields).flatMap(([key, value]) => Array.isArray(value) && value.every((item) => typeof item === 'string') ? [[key, value]] : []))
      : undefined;
    return { ok: false, error: createPublicError(publicCode, message, requestId, fields) };
  }

  async handle(secretHeader: string | null, raw: unknown, requestId = crypto.randomUUID()): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    if (secretHeader === null || !safeEqual(secretHeader, this.webhookSecret)) return { ok: false, error: createNonDisclosingDenial(requestId) };
    const update = this.parse(raw); if (update === null) return { ok: false, error: createPublicError('INVALID_INPUT', 'Invalid Telegram update.', requestId) };
    const now = this.clock.now(); if (Math.abs(now.getTime() - new Date(update.occurredAt).getTime()) > this.freshnessSeconds * 1_000) return { ok: false, error: createNonDisclosingDenial(requestId) };
    const bodyDigest = digest(JSON.stringify(raw));
    try {
      const claimed = await this.repository.claimReplay({
        source: 'telegram', replayId: update.updateId, organizationId: null, bodyDigest, receivedAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + Math.min(30, this.replayTtlSeconds) * 1_000).toISOString(),
        expiresAt: new Date(now.getTime() + this.replayTtlSeconds * 1_000).toISOString(),
      });
      if (claimed.claim.bodyDigest !== bodyDigest) return { ok: false, error: createNonDisclosingDenial(requestId) };
      if (claimed.kind === 'duplicate') {
        if (claimed.claim.status !== 'claimed' || claimed.claim.pendingStatus !== null || claimed.claim.businessReceipt !== null) return this.replayPrepared(claimed.claim, update.chatId, requestId);
        return { ok: false, error: createPublicError('CONFLICT', 'Telegram update is already processing.', requestId) };
      }
      const identity = await this.repository.resolveTelegramIdentity(update.userId, update.chatId);
      if (identity === null) {
        const denial = createNonDisclosingDenial(requestId); const reply = this.safeFailureReply(denial);
        await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimed.claim.claimToken, 'rejected', { code: denial.error.code, message: denial.error.message, reply }, this.clock.now().toISOString());
        await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimed.claim.claimToken);
        try { await this.telegram.send({ chatId: update.chatId, text: reply }); } catch { /* denial outcome remains replayable */ }
        return { ok: false, error: denial };
      }
      const identityDigest = digest(`${identity.organizationId}:${identity.mappingId}:${identity.telegramUserId}:${identity.telegramChatId}`);
      await this.repository.bindReplayIdentity('telegram', update.updateId, bodyDigest, claimed.claim.claimToken, identity.organizationId, identityDigest);
      const actor = this.actor(identity, `telegram-replay:${update.updateId}:${bodyDigest}:${claimed.claim.claimToken}`); const shared = this.services.create();
      const result = await this.execute(identity, actor, shared, update);
      if (!result.ok) {
        const reply = this.safeFailureReply(result.error);
        const replayOutcome = {
          code: result.error.error.code,
          message: result.error.error.message,
          reply,
          ...(result.error.error.fields === undefined ? {} : { fields: result.error.error.fields }),
        };
        await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimed.claim.claimToken, 'rejected', replayOutcome, this.clock.now().toISOString());
        await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimed.claim.claimToken);
        try { await this.telegram.send({ chatId: update.chatId, text: reply }); } catch { /* failure outcome remains replayable */ }
        return result;
      }
      await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimed.claim.claimToken, 'processed', { reply: result.value.reply }, this.clock.now().toISOString());
      await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimed.claim.claimToken);
      try { await this.telegram.send({ chatId: update.chatId, text: result.value.reply }); } catch { /* business outcome is already durable and replayable */ }
      return { ok: true, value: { ...result.value, actor } };
    } catch { return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Telegram processing is temporarily unavailable.', requestId) }; }
  }

  private async execute(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, update: TelegramUpdate): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const text = update.text?.trim() ?? '';
    if (text === '/cancel') { await this.repository.clearTelegramConversation(identity); return { ok: true, value: await this.reply('Conversation cancelled.') }; }
    if (text === '/regions') {
      const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
      const values = listed.value.regions.filter(({ status }) => status === 'active').map(({ id, name }) => `${name}: ${id}`);
      return { ok: true, value: await this.reply(values.length === 0 ? 'No active Regions.' : values.join('\n')) };
    }
    if (text === '/sites') return { ok: true, value: await this.reply('Usage: /sites ARTICLE_ID to list active Sites in the Article Region.') };
    if (text === '/article') { await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_region', {})); return { ok: true, value: await this.reply('Send the active Region ID.') }; }
    if (text.startsWith('/image ')) {
      const [, articleId] = words(text); if (articleId === undefined) return { ok: true, value: await this.reply('Usage: /image ARTICLE_ID') };
      await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_image', { articleId })); return { ok: true, value: await this.reply('Send one image document.') };
    }
    if (text.startsWith('/sites ')) {
      const [, articleId] = words(text); if (articleId === undefined) return { ok: true, value: await this.reply('Usage: /sites ARTICLE_ID') };
      const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
      const article = listed.value.articles.find(({ id }) => id === articleId);
      if (article === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
      const available = listed.value.sites.filter(({ status, regionId }) => status === 'active' && regionId === article.regionId);
      if (available.length === 0) return { ok: true, value: await this.reply('No active Sites are available for this Article Region.') };
      await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_sites', { articleId, regionId: article.regionId, availableSiteIds: available.map(({ id }) => id) }));
      return { ok: true, value: await this.reply(`Send comma-separated active Site IDs for ${article.regionId}:\n${available.map(({ id, normalizedHostname }) => `${normalizedHostname}: ${id}`).join('\n')}`) };
    }
    if (text.startsWith('/publish ')) {
      const [, articleId, siteList, idempotencyKey] = words(text);
      const publication = await shared.publication.request(actor, { articleId, siteIds: ids(siteList ?? ''), idempotencyKey, options: {} });
      if (!publication.ok) return publication;
      return { ok: true, value: { ...(await this.reply(`Publication ${publication.value.job.state}. Job: ${publication.value.job.id}`)), businessResult: publication.value } };
    }
    if (text.startsWith('/status ') || text.startsWith('/links ')) {
      const [command, jobId] = words(text); const status = await shared.publication.status(actor, { jobId }); if (!status.ok) return status;
      const urls = status.value.result?.urls ?? []; const reply = command === '/links' ? (urls.length === 0 ? `No published links. State: ${status.value.job.state}` : urls.join('\n')) : `State: ${status.value.job.state}; successful: ${status.value.result?.successfulCount ?? status.value.targets.filter(({ state }) => state === 'published').length}${urls.length === 0 ? '' : `; ${urls.join(' ')}`}`;
      return { ok: true, value: { ...(await this.reply(reply)), businessResult: status.value } };
    }
    if (text.startsWith('/retry ')) {
      const [, jobId, targetList] = words(text);
      const retried = await shared.publication.retry(actor, { jobId, ...(targetList === undefined ? {} : { targetIds: ids(targetList) }) });
      if (!retried.ok) return retried;
      return { ok: true, value: { ...(await this.reply(`Retry queued. State: ${retried.value.job.state}`)), businessResult: retried.value } };
    }
    if (text.startsWith('/unpublish ')) {
      const [, jobId, targetList] = words(text);
      const withdrawn = await shared.publication.unpublish(actor, { jobId, ...(targetList === undefined ? {} : { targetIds: ids(targetList) }) });
      if (!withdrawn.ok) return withdrawn;
      return { ok: true, value: { ...(await this.reply(`Unpublished. State: ${withdrawn.value.job.state}`)), businessResult: withdrawn.value } };
    }
    const conversation = await this.repository.readTelegramConversation(identity);
    if (conversation === null || new Date(conversation.expiresAt) <= this.clock.now()) return { ok: true, value: await this.reply('Commands: /article, /image ARTICLE_ID, /regions, /sites ARTICLE_ID, /publish ARTICLE_ID SITE_IDS KEY, /status JOB_ID, /links JOB_ID, /retry JOB_ID, /unpublish JOB_ID.') };
    return this.advance(identity, actor, shared, update, conversation);
  }

  private async advance(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, update: TelegramUpdate, conversation: TelegramConversation): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const text = update.text?.trim() ?? '';
    const next = async (step: TelegramConversation['step'], field: string, value: unknown, reply: string) => { await this.repository.saveTelegramConversation(identity, this.conversation(identity, step, { ...conversation.data, [field]: value })); return { ok: true as const, value: await this.reply(reply) }; };
    if (conversation.step === 'article_region') return next('article_title', 'regionId', text, 'Send the article title.');
    if (conversation.step === 'article_title') return next('article_body', 'title', text, 'Send the article body.');
    if (conversation.step === 'article_body') return next('article_source', 'body', text, 'Send the source attribution.');
    if (conversation.step === 'article_source') return next('article_slug', 'source', text, 'Send a hostname-safe article slug.');
    if (conversation.step === 'article_slug') {
      const created = await shared.articles.createArticle(actor, { ...conversation.data, slug: text, publisherId: null, categoryId: null, authorId: null, status: 'draft' });
      if (!created.ok) return created;
      await this.repository.clearTelegramConversation(identity);
      return { ok: true, value: { ...(await this.reply(`Article created: ${created.value.id}`)), businessResult: created.value } };
    }
    if (conversation.step === 'article_sites') {
      const requestedSiteIds = ids(text);
      const availableSiteIds = Array.isArray(conversation.data.availableSiteIds) ? conversation.data.availableSiteIds.filter((value): value is string => typeof value === 'string') : [];
      if (requestedSiteIds.length === 0 || requestedSiteIds.some((siteId) => !availableSiteIds.includes(siteId))) {
        return { ok: false, error: createPublicError('INVALID_INPUT', 'Choose only active Sites listed for the Article Region.', actor.requestId, { siteIds: ['One or more Sites are unavailable for the Article Region.'] }) };
      }
      const assigned = await shared.articles.assignArticleSites(actor, { articleId: conversation.data.articleId, siteIds: requestedSiteIds }); if (!assigned.ok) return assigned;
      await this.repository.clearTelegramConversation(identity); return { ok: true, value: { ...(await this.reply(`Assigned ${assigned.value.length} Site(s).`)), businessResult: assigned.value } };
    }
    if (conversation.step === 'article_image') {
      if (update.document === null) return { ok: true, value: await this.reply('Send a valid document for this Article.') };
      const prepared = await this.mediaTransfer.prepare({ fileId: update.document.fileId, expectedSize: update.document.sizeBytes });
      const reserved = await shared.media.reserveUpload(actor, { filename: update.document.filename, mediaType: update.document.mediaType, sizeBytes: prepared.sizeBytes, checksum: prepared.checksumSha256, purpose: 'article-image', owner: { kind: 'article', articleId: conversation.data.articleId } });
      if (!reserved.ok) return reserved;
      await this.mediaTransfer.transfer({ media: prepared, authorization: reserved.value.authorization, mediaType: update.document.mediaType });
      const completed = await shared.media.completeUpload(actor, { reservationId: reserved.value.reservationId }); if (!completed.ok) return completed;
      await this.repository.clearTelegramConversation(identity); return { ok: true, value: { ...(await this.reply(`Image uploaded: ${completed.value.id}`)), businessResult: completed.value } };
    }
    await this.repository.clearTelegramConversation(identity); return { ok: true, value: await this.reply('Conversation reset. Start again with /article.') };
  }
}

import { createHash, timingSafeEqual } from 'node:crypto';

import type { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import type { MediaService } from '@/modules/publishing/media-service';
import type { PublicationService } from '@/modules/publishing/publication-service';
import type { TelegramConversation, TelegramHandleOutcome, TelegramIdentity, TelegramPendingReply, TelegramUpdate, TelegramWorkflowResult, WebhookReplayClaim } from '@/modules/integrations/models';
import type { IntegrationsRepository } from '@/modules/integrations/ports';
import { TelegramRateLimitedError } from '@/modules/integrations/ports';
import type { TelegramMediaTransferPort } from '@/modules/integrations/ports';
import type { TelegramBotCommand, TelegramPort } from '@/modules/integrations/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { logEvent } from '@/core/observability/logger';
import { telegramUpdateSchema } from '@/modules/integrations/schemas';

export interface TelegramSharedServices {
  readonly articles: TenantBusinessService;
  readonly media: MediaService;
  readonly publication: PublicationService;
}

export interface TelegramSharedServiceFactory { create(): TelegramSharedServices }

export type TelegramClaim =
  | { readonly kind: 'rejected'; readonly error: PublicErrorEnvelope }
  | { readonly kind: 'duplicate'; readonly claim: WebhookReplayClaim; readonly chatId: string }
  | { readonly kind: 'fresh'; readonly update: TelegramUpdate; readonly bodyDigest: string; readonly claimToken: string };

const safeEqual = (left: string, right: string): boolean => { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

/** Batas ID pesan dasbor yang diingat per percakapan untuk bersih-bersih /start. */
const TRACKED_MESSAGE_LIMIT = 20;
const ENTRY_CAPTION = 'Selamat datang di Bot Resmi Indicate.\n\nKelola redaksi lewat Mini App — tulis artikel, atur situs tayang, dan terbitkan dari satu tempat.';
const STOP_REPLY = 'Tautan bot dihentikan untuk chat ini. Kirim /start kapan saja untuk mulai lagi.';

/**
 * Canonical Bot API command menu applied via `setMyCommands`.
 *
 * @remarks Chat commands are retired except entry and opt-out; every action
 * lives in the Mini App. Group notifications (planned) reuse the sender and
 * outbox only, never this menu.
 */
export const TELEGRAM_BOT_COMMANDS: readonly TelegramBotCommand[] = Object.freeze([
  Object.freeze({ command: 'start', description: 'Buka Mini App redaksi Indicate' }),
  Object.freeze({ command: 'stop', description: 'Hentikan tautan bot untuk chat ini' }),
]);

export class TelegramWorkflowService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly services: TelegramSharedServiceFactory,
    private readonly mediaTransfer: TelegramMediaTransferPort,
    private readonly telegram: TelegramPort,
    private readonly webhookSecret: string,
    private readonly freshnessSeconds: number,
    private readonly replayTtlSeconds: number,
    private readonly welcomePhotoUrl: string,
    private readonly clock: { now(): Date } = { now: () => new Date() },
    private readonly miniAppUrl: string = '',
  ) {}

  private async reply(text: string): Promise<TelegramWorkflowResult> { return { reply: text }; }
  private conversation(identity: TelegramIdentity, step: TelegramConversation['step'], data: Readonly<Record<string, unknown>>): TelegramConversation {
    const now = this.clock.now(); return Object.freeze({ source: 'telegram', chatId: identity.telegramChatId, userId: identity.telegramUserId, organizationId: identity.organizationId, step, data, updatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 3_600_000).toISOString() });
  }
  private trackedIds(conversation: TelegramConversation | null): string[] {
    if (conversation === null) return [];
    const raw = conversation.data.messageIds;
    return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : [];
  }
  private parse(raw: unknown): TelegramUpdate | null {
    const parsed = telegramUpdateSchema.safeParse(raw); if (!parsed.success) return null;
    const callback = parsed.data.callback_query;
    if (callback !== undefined) {
      const origin = callback.message; if (origin === undefined) return null;
      return {
        updateId: String(parsed.data.update_id), occurredAt: new Date(origin.date * 1_000).toISOString(),
        userId: String(callback.from.id), chatId: String(origin.chat.id), messageId: String(origin.message_id), text: null, document: null,
        callback: { id: callback.id, data: callback.data ?? null },
      };
    }
    const message = parsed.data.message; if (message === undefined) return null;
    const document = message.document;
    const photos = message.photo ?? [];
    let largestPhoto: { readonly fileId: string; readonly sizeBytes?: number } | null = null;
    for (const photo of photos) {
      if (largestPhoto === null || (photo.file_size ?? 0) > (largestPhoto.sizeBytes ?? 0)) {
        largestPhoto = { fileId: photo.file_id, ...(photo.file_size === undefined ? {} : { sizeBytes: photo.file_size }) };
      }
    }
    const attachment = document === undefined || document.file_name === undefined || document.mime_type === undefined || document.file_size === undefined
      ? largestPhoto === null || largestPhoto.sizeBytes === undefined
        ? null
        : { fileId: largestPhoto.fileId, filename: 'telegram-photo.jpg', mediaType: 'image/jpeg', sizeBytes: largestPhoto.sizeBytes }
      : { fileId: document.file_id, filename: document.file_name, mediaType: document.mime_type, sizeBytes: document.file_size };
    return {
      updateId: String(parsed.data.update_id), occurredAt: new Date(message.date * 1_000).toISOString(), userId: String(message.from.id), chatId: String(message.chat.id), messageId: null, text: message.text ?? null,
      document: attachment, callback: null,
    };
  }

  private async finalizePrepared(source: string, replayId: string, bodyDigest: string, claimToken: string): Promise<void> {
    try { await this.repository.finalizeReplay(source, replayId, bodyDigest, claimToken, this.clock.now().toISOString()); }
    catch { /* a prepared outcome is durable and the next duplicate will reconcile it */ }
  }
  private recoveredBusinessOutcome(claim: WebhookReplayClaim): Readonly<Record<string, unknown>> | null {
    const receipt = claim.businessReceipt;
    if (receipt === null || typeof receipt.action !== 'string' || typeof receipt.targetId !== 'string') return null;
    if (receipt.action === 'article.create') return { reply: 'Artikel berhasil dibuat.', recovered: true };
    if (receipt.action === 'article.sites.assign') {
      const after = typeof receipt.after === 'object' && receipt.after !== null ? receipt.after as Readonly<Record<string, unknown>> : {};
      const count = Array.isArray(after.siteIds) ? after.siteIds.length : 0;
      return { reply: `Berhasil menautkan ${count} situs.`, recovered: true };
    }
    if (receipt.action === 'media.activate') return { reply: 'Foto terpasang ke artikel.', recovered: true };
    if (receipt.action === 'publication.request') return { reply: 'Publikasi diterima dan antre diproses.', recovered: true };
    return null;
  }
  /**
   * Sends replies collected during `handle` after the webhook responds.
   *
   * @param replies - Pending replies queued while handling the update.
   * @param requestId - Correlation ID for reply-failure telemetry.
   * @param identity - Resolved caller identity used to remember sent
   * dashboard messages; null skips tracking.
   * @remarks
   * Never awaited inside `handle`, so Telegram API latency never holds the
   * webhook response. Failed non-callback replies persist to the outbox for
   * worker retry instead of being dropped. Message deletes are best-effort:
   * already-gone or expired messages fail silently by design.
   */
  async deliverReplies(replies: readonly TelegramPendingReply[], requestId: string, identity: TelegramIdentity | null = null): Promise<void> {
    const tracked: string[] = [];
    const track = (receipt: unknown): void => {
      if (typeof receipt === 'object' && receipt !== null && 'messageId' in receipt) {
        const messageId = (receipt as { readonly messageId?: unknown }).messageId;
        if (typeof messageId === 'string' && messageId !== '') tracked.push(messageId);
      }
    };
    for (const reply of replies) {
      try {
        if (reply.kind === 'photo') {
          try {
            track(await this.telegram.sendPhoto({ chatId: reply.chatId, photoUrl: reply.photoUrl, caption: reply.caption, ...(reply.keyboard === undefined ? {} : { keyboard: reply.keyboard }) }));
          } catch {
            track(await this.telegram.send({ chatId: reply.chatId, text: reply.caption }));
          }
        } else if (reply.kind === 'callback-answer') {
          await this.telegram.answerCallback({ callbackId: reply.callbackId, ...(reply.text === undefined ? {} : { text: reply.text }) });
        } else if (reply.kind === 'delete') {
          try {
            await this.telegram.deleteMessage({ chatId: reply.chatId, messageId: reply.messageId });
          } catch {
            /* already gone or too old: cleanup is best-effort */
          }
        } else if (reply.kind === 'edit') {
          try {
            await this.telegram.editMessage({ chatId: reply.chatId, messageId: reply.messageId, text: reply.text, keyboard: reply.keyboard });
          } catch {
            track(await this.telegram.send({ chatId: reply.chatId, text: reply.text, keyboard: reply.keyboard }));
          }
        } else {
          track(await this.telegram.send(reply));
        }
      } catch (error) {
        if (reply.kind === 'callback-answer') {
          logEvent('warn', { event: 'telegram.reply.callback_failed', requestId, context: { name: error instanceof Error ? error.name : 'UnknownError' } });
          continue;
        }
        try {
          const text = reply.kind === 'photo' ? reply.caption : reply.kind === 'delete' ? null : reply.text;
          if (text !== null) await this.repository.enqueueOutboxMessage({ organizationId: null, chatId: reply.chatId, text, now: this.clock.now().toISOString() });
        } catch {
          logEvent('warn', { event: 'telegram.reply.deferred_failed', requestId, context: { chatId: reply.chatId, name: error instanceof Error ? error.name : 'UnknownError' } });
        }
      }
    }
    if (identity !== null && tracked.length > 0) {
      try {
        const existing = await this.repository.readTelegramConversation(identity);
        const previous = this.trackedIds(existing);
        const messageIds = [...new Set([...previous, ...tracked])].slice(-TRACKED_MESSAGE_LIMIT);
        if (existing === null) {
          await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'idle', { messageIds }));
        } else {
          await this.repository.saveTelegramConversation(identity, { ...existing, data: { ...existing.data, messageIds } });
        }
      } catch {
        logEvent('warn', { event: 'telegram.track.failed', requestId, context: { chatId: identity.telegramChatId } });
      }
    }
  }

  /**
   * Drains the Telegram outbox with paced sends and backoff.
   *
   * @param limit - Maximum messages to claim; clamped to 1-50.
   * @param requestId - Correlation ID for claim/ack failure telemetry.
   * @returns Claimed, sent, and failed counts for this drain pass.
   * @remarks
   * Honors `retry_after` from rate-limit errors when re-queueing.
   */
  async processOutbox(limit: number, requestId: string): Promise<{ readonly claimed: number; readonly sent: number; readonly failed: number }> {
    const now = this.clock.now();
    let claimed = 0;
    let sent = 0;
    let failed = 0;
    let messages: readonly { readonly id: string; readonly chatId: string; readonly text: string }[] = [];
    try {
      messages = await this.repository.claimOutboxMessages(now.toISOString(), Math.max(1, Math.min(limit, 50)));
    } catch (error) {
      logEvent('warn', { event: 'telegram.outbox.claim_failed', requestId, context: { name: error instanceof Error ? error.name : 'UnknownError' } });
      return { claimed, sent, failed };
    }
    claimed = messages.length;
    for (const message of messages) {
      try {
        await this.telegram.send({ chatId: message.chatId, text: message.text });
        await this.repository.ackOutboxMessage({ id: message.id, ok: true, retryAfterSeconds: null, error: null, now: this.clock.now().toISOString() });
        sent += 1;
      } catch (error) {
        const retryAfter = error instanceof TelegramRateLimitedError ? error.retryAfterSeconds : null;
        const name = error instanceof Error ? error.name : 'UnknownError';
        try {
          await this.repository.ackOutboxMessage({ id: message.id, ok: false, retryAfterSeconds: retryAfter, error: name.slice(0, 200), now: this.clock.now().toISOString() });
        } catch {
          logEvent('warn', { event: 'telegram.outbox.ack_failed', requestId, context: { chatId: message.chatId, name } });
        }
        failed += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    return { claimed, sent, failed };
  }

  /**
   * Pushes the canonical command menu to the Telegram Bot API.
   *
   * @returns Resolves once the menu update is accepted.
   * @throws Propagates transport and rate-limit errors from the Bot API port.
   */
  async syncBotCommands(): Promise<void> {
    await this.telegram.setMyCommands(TELEGRAM_BOT_COMMANDS);
  }

  /**
   * Resolves the caller's active organization across all their mappings.
   *
   * @param userId - Telegram user ID from the update.
   * @param chatId - Telegram chat ID from the update.
   * @returns The single mapping, the sole option, or the previously picked
   * organization; null when no organization can be established.
   * @remarks Kept for `/stop` cleanup addressing; entry no longer needs it.
   */
  private async activeIdentity(userId: string, chatId: string): Promise<TelegramIdentity | null> {
    const direct = await this.repository.resolveTelegramIdentity(userId, chatId);
    if (direct !== null) return direct;
    const options = await this.repository.listTelegramIdentities(userId, chatId);
    const only = options.length === 1 ? options[0] : undefined;
    if (only !== undefined) return only.identity;
    const now = this.clock.now();
    for (const option of options) {
      const conversation = await this.repository.readTelegramConversation(option.identity);
      if (conversation !== null && conversation.step === 'idle' && conversation.data.orgActive === true && new Date(conversation.expiresAt) > now) return option.identity;
    }
    return null;
  }

  private async replayPrepared(claim: WebhookReplayClaim, chatId: string, requestId: string, pending: TelegramPendingReply[]): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
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
    pending.push({ kind: 'text', chatId, text: reply });
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

  /**
   * Claims an update without executing business logic.
   *
   * @param secretHeader - Telegram secret-token header for authenticity.
   * @param raw - Untrusted webhook JSON body.
   * @param requestId - Correlation ID for denial telemetry.
   * @returns Rejection, a resolvable duplicate, or a fresh claim to process.
   * @remarks Fast path only: secret check, parse, freshness, and one claim
   * round-trip. Callers answer fresh claims immediately and defer
   * `processFresh` to background execution.
   */
  async claim(secretHeader: string | null, raw: unknown, requestId = crypto.randomUUID()): Promise<TelegramClaim> {
    if (secretHeader === null || !safeEqual(secretHeader, this.webhookSecret)) return { kind: 'rejected', error: createNonDisclosingDenial(requestId) };
    const update = this.parse(raw);
    if (update === null) return { kind: 'rejected', error: createPublicError('INVALID_INPUT', 'Invalid Telegram update.', requestId) };
    const now = this.clock.now();
    if (Math.abs(now.getTime() - new Date(update.occurredAt).getTime()) > this.freshnessSeconds * 1_000) return { kind: 'rejected', error: createNonDisclosingDenial(requestId) };
    const bodyDigest = digest(JSON.stringify(raw));
    try {
      const claimed = await this.repository.claimReplay({
        source: 'telegram', replayId: update.updateId, organizationId: null, bodyDigest, receivedAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + Math.min(30, this.replayTtlSeconds) * 1_000).toISOString(),
        expiresAt: new Date(now.getTime() + this.replayTtlSeconds * 1_000).toISOString(),
      });
      if (claimed.claim.bodyDigest !== bodyDigest) return { kind: 'rejected', error: createNonDisclosingDenial(requestId) };
      if (claimed.kind === 'duplicate') {
        if (claimed.claim.status !== 'claimed' || claimed.claim.pendingStatus !== null || claimed.claim.businessReceipt !== null) return { kind: 'duplicate', claim: claimed.claim, chatId: update.chatId };
        return { kind: 'rejected', error: createPublicError('CONFLICT', 'Telegram update is already processing.', requestId) };
      }
      return { kind: 'fresh', update, bodyDigest, claimToken: claimed.claim.claimToken };
    } catch { return { kind: 'rejected', error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Telegram processing is temporarily unavailable.', requestId) }; }
  }

  /**
   * Replays a previously recorded outcome for a duplicate delivery.
   *
   * @param claim - Stored claim carrying a terminal outcome or receipt.
   * @param chatId - Chat to address when the outcome needs a fresh reply.
   * @param requestId - Correlation ID for conflict telemetry.
   * @returns Recorded outcome with any replies it requires.
   */
  async handleDuplicate(claim: WebhookReplayClaim, chatId: string, requestId = crypto.randomUUID()): Promise<TelegramHandleOutcome> {
    const pending: TelegramPendingReply[] = [];
    return { result: await this.replayPrepared(claim, chatId, requestId, pending), pendingReplies: pending, identity: null };
  }

  /**
   * Executes the entry-only flow for a fresh claim and records its outcome.
   *
   * @param update - Parsed update from `claim`.
   * @param bodyDigest - Digest binding the claim to its original body.
   * @param claimToken - Lease token proving claim ownership.
   * @param requestId - Correlation ID for business telemetry.
   * @returns Outcome with pending replies; never throws.
   * @remarks Chat commands are retired: every text answers the Mini App
   * entry except `/stop`, which clears the conversation. Safe to defer past
   * the webhook response; the claim row keeps the outcome replayable.
   */
  async processFresh(update: TelegramUpdate, bodyDigest: string, claimToken: string, requestId = crypto.randomUUID()): Promise<TelegramHandleOutcome> {
    const pending: TelegramPendingReply[] = [];
    const done = (result: Result<TelegramWorkflowResult, PublicErrorEnvelope>, identity: TelegramIdentity | null = null): TelegramHandleOutcome => ({ result, pendingReplies: pending, identity });
    try {
      const identity = await this.activeIdentity(update.userId, update.chatId);
      if (identity !== null) {
        const identityDigest = digest(`${identity.organizationId}:${identity.mappingId}:${identity.telegramUserId}:${identity.telegramChatId}`);
        await this.repository.bindReplayIdentity('telegram', update.updateId, bodyDigest, claimToken, identity.organizationId, identityDigest);
      }
      const result = await this.execute(update, identity, pending, requestId);
      await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimToken, 'processed', { reply: result.reply }, this.clock.now().toISOString());
      await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimToken);
      const display = result.display;
      if (display?.photoUrl !== undefined) pending.push({ kind: 'photo', chatId: update.chatId, photoUrl: display.photoUrl, caption: result.reply, ...(display.keyboard === undefined ? {} : { keyboard: display.keyboard }) });
      else if (display?.keyboard !== undefined) pending.push({ kind: 'text', chatId: update.chatId, text: result.reply, keyboard: display.keyboard });
      else pending.push({ kind: 'text', chatId: update.chatId, text: result.reply });
      return done({ ok: true, value: result }, identity);
    } catch { return done({ ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Telegram processing is temporarily unavailable.', requestId) }); }
  }

  async handle(secretHeader: string | null, raw: unknown, requestId = crypto.randomUUID()): Promise<TelegramHandleOutcome> {
    const claimed = await this.claim(secretHeader, raw, requestId);
    if (claimed.kind === 'rejected') return { result: { ok: false, error: claimed.error }, pendingReplies: [], identity: null };
    if (claimed.kind === 'duplicate') return this.handleDuplicate(claimed.claim, claimed.chatId, requestId);
    return this.processFresh(claimed.update, claimed.bodyDigest, claimed.claimToken, requestId);
  }

  /**
   * Answers the two surviving entry points; everything else redirects.
   *
   * @param update - Parsed update with text or tapped button.
   * @param identity - Resolved caller identity; null skips cleanup.
   * @param pending - Replies collected for post-response delivery.
   * @param requestId - Correlation ID for cleanup-failure telemetry.
   * @returns Entry reply, or the opt-out confirmation for `/stop`.
   */
  private async execute(update: TelegramUpdate, identity: TelegramIdentity | null, pending: TelegramPendingReply[], requestId: string): Promise<TelegramWorkflowResult> {
    if (update.callback !== null) pending.push({ kind: 'callback-answer', callbackId: update.callback.id });
    const text = update.text?.trim() ?? '';
    if (text === '/stop') {
      if (identity !== null) {
        try {
          await this.repository.clearTelegramConversation(identity);
        } catch {
          logEvent('warn', { event: 'telegram.stop.cleanup_failed', requestId });
        }
      }
      return this.reply(STOP_REPLY);
    }
    return this.entryReply();
  }

  private entryReply(): TelegramWorkflowResult {
    const link = this.miniAppUrl === '' ? 'Buka Mini App dari menu Telegram.' : `Buka Mini App redaksi:\n${this.miniAppUrl}`;
    return { reply: `${ENTRY_CAPTION}\n\n${link}`, display: { photoUrl: this.welcomePhotoUrl } };
  }
}

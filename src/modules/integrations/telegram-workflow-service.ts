import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import type { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import type { MediaService } from '@/modules/publishing/media-service';
import type { PublicationService } from '@/modules/publishing/publication-service';
import type { PublicationStatusProjection } from '@/modules/publishing/models';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { TelegramConversation, TelegramHandleOutcome, TelegramIdentity, TelegramInlineKeyboard, TelegramPendingReply, TelegramUpdate, TelegramWorkflowResult, WebhookReplayClaim } from '@/modules/integrations/models';
import type { IntegrationsRepository } from '@/modules/integrations/ports';
import { TelegramRateLimitedError } from '@/modules/integrations/ports';
import type { TelegramMediaTransferPort } from '@/modules/integrations/ports';
import type { TelegramPort } from '@/modules/integrations/ports';
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

const safeEqual = (left: string, right: string): boolean => { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const words = (text: string) => text.trim().split(/\s+/);
const ids = (text: string) => text.split(',').map((value) => value.trim()).filter(Boolean);

const WELCOME_CAPTION = 'Selamat datang di Bot Resmi Indicate.\n\nRuang kendali redaksi dalam genggaman: susun artikel, kirim foto, atur portal tayang, dan pantau publikasi lintas portal — semuanya dari sini.\n\nPilih menu di bawah untuk memulai.';
const HELP_TEXT = 'Panduan Bot Indicate\n\nDaftar:\n/artikel — artikel terbaru + tombol aksi\n/cari KATA — cari artikel berdasar judul\n/job — pekerjaan publikasi terbaru\n/portal — daftar portal aktif + detail\n\nBuat artikel:\n/article — susun artikel langkah demi langkah\n/image ARTICLE_ID — tambah foto ke artikel\n\nTayang dan publikasi:\n/sites ARTICLE_ID — pilih portal tayang\n/suggest ARTICLE_ID SITE_IDS — saran judul/deskripsi unik per portal\n/publish ARTICLE_ID SITE_IDS [KEY] — ajukan publikasi\n/status JOB_ID — pantau status pekerjaan\n/links JOB_ID — lihat tautan yang terbit\n/retry JOB_ID — ulangi target yang gagal\n/unpublish JOB_ID — tarik artikel yang terbit\n\nLainnya:\n/regions — daftar Region yang aktif\n/cancel — batalkan percakapan berjalan\n/start — kembali ke menu utama';
const MAIN_KEYBOARD: TelegramInlineKeyboard = Object.freeze([
  Object.freeze([Object.freeze({ text: '📝 Buat Artikel', data: 'tg:article' }), Object.freeze({ text: '📄 Artikel Saya', data: 'tg:articles' })]),
  Object.freeze([Object.freeze({ text: '🌐 Portal Tayang', data: 'tg:portals' }), Object.freeze({ text: '📋 Daftar Job', data: 'tg:jobs' })]),
  Object.freeze([Object.freeze({ text: '🖼 Tambah Foto', data: 'tg:image' }), Object.freeze({ text: '🔗 Tautan Terbit', data: 'tg:links' })]),
  Object.freeze([Object.freeze({ text: '❓ Bantuan', data: 'tg:help' }), Object.freeze({ text: '✖️ Batal', data: 'tg:cancel' })]),
]);
const LINK_REQUIRED_REPLY = 'Akses ditolak. Akun Telegram ini belum tertaut ke organisasi mana pun.\n\nHubungi administrator redaksi Anda untuk menautkan akun ini sebelum menggunakan bot.';
const UNKNOWN_COMMAND_REPLY = 'Perintah tidak dikenali. Ketik /start untuk membuka menu utama atau /bantuan untuk panduan lengkap.';
const IMAGE_USAGE = 'Format: /image ARTICLE_ID\nSetelah itu, kirim foto sebagai pesan berikutnya. /cancel untuk selesai.';
const SITES_USAGE = 'Format: /sites ARTICLE_ID\nBot akan menampilkan daftar portal aktif. Balas dengan Site ID dipisah koma.';
const PUBLISH_USAGE = 'Format: /publish ARTICLE_ID SITE_IDS [KEY]\nContoh: /publish <id-artikel> <id-site-1,id-site-2>\nKEY opsional; bila kosong bot buatkan otomatis.';
const STATUS_USAGE = 'Format: /status JOB_ID — untuk memantau status pekerjaan publikasi.';
const LINKS_USAGE = 'Format: /links JOB_ID — untuk melihat tautan artikel yang telah terbit.';
const RETRY_USAGE = 'Format: /retry JOB_ID [TARGET_IDS] — untuk mengulang target yang gagal.';
const UNPUBLISH_USAGE = 'Format: /unpublish JOB_ID [TARGET_IDS] — untuk menarik artikel yang telah terbit.';
const SUGGEST_USAGE = 'Format: /suggest ARTICLE_ID SITE_IDS\nContoh: /suggest <id-artikel> <id-site-1,id-site-2>\nBot menyusun saran judul dan deskripsi unik per portal tanpa membuat job.';
const CARI_USAGE = 'Format: /cari KATA_KUNCI — untuk mencari artikel berdasar judul.';
const CALLBACK_COMMANDS: Readonly<Record<string, string>> = Object.freeze({
  'tg:article': '/article',
  'tg:image': '/image',
  'tg:sites': '/sites',
  'tg:suggest': '/suggest',
  'tg:publish': '/publish',
  'tg:status': '/status',
  'tg:links': '/links',
  'tg:retry': '/retry',
  'tg:unpublish': '/unpublish',
  'tg:cancel': '/cancel',
  'tg:help': '/bantuan',
  'tg:menu': '/start',
  'tg:articles': '/artikel',
  'tg:jobs': '/job',
  'tg:portals': '/portal',
});
const callbackCommand = (data: string | null): string | null => (data === null ? null : (CALLBACK_COMMANDS[data] ?? null));

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
  ) {}

  private actor(identity: TelegramIdentity, requestId: string): AuthorizedTenantActorContext {
    return Object.freeze({ actorType: 'telegram', actorId: identity.mappingId, organizationId: identity.organizationId, permissionSet: identity.permissions, regionScopeId: identity.regionId, entryPoint: 'telegram', requestId });
  }
  private conversation(identity: TelegramIdentity, step: TelegramConversation['step'], data: Readonly<Record<string, unknown>>): TelegramConversation {
    const now = this.clock.now(); return Object.freeze({ source: 'telegram', chatId: identity.telegramChatId, userId: identity.telegramUserId, organizationId: identity.organizationId, step, data, updatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 3_600_000).toISOString() });
  }
  private async reply(text: string): Promise<TelegramWorkflowResult> { return { reply: text }; }
  private parse(raw: unknown): TelegramUpdate | null {
    const parsed = telegramUpdateSchema.safeParse(raw); if (!parsed.success) return null;
    const callback = parsed.data.callback_query;
    if (callback !== undefined) {
      const origin = callback.message; if (origin === undefined) return null;
      return {
        updateId: String(parsed.data.update_id), occurredAt: new Date(origin.date * 1_000).toISOString(),
        userId: String(callback.from.id), chatId: String(origin.chat.id), text: null, document: null,
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
      updateId: String(parsed.data.update_id), occurredAt: new Date(message.date * 1_000).toISOString(), userId: String(message.from.id), chatId: String(message.chat.id), text: message.text ?? null,
      document: attachment, callback: null,
    };
  }

  private safeFailureReply(error: PublicErrorEnvelope): string {
    if (error.error.code === 'INVALID_INPUT') return error.error.message;
    if (error.error.code === 'CONFLICT' || error.error.code === 'IDEMPOTENCY_CONFLICT' || error.error.code === 'INVALID_STATE_TRANSITION') return 'Permintaan bertentangan dengan status saat ini. Muat ulang status lalu coba lagi.';
    if (error.error.code === 'DEPENDENCY_UNAVAILABLE') return 'Layanan Telegram sedang tidak tersedia. Silakan coba lagi nanti.';
    return 'Operasi Telegram yang diminta tidak tersedia.';
  }
  private async finalizePrepared(source: string, replayId: string, bodyDigest: string, claimToken: string): Promise<void> {
    try { await this.repository.finalizeReplay(source, replayId, bodyDigest, claimToken, this.clock.now().toISOString()); }
    catch { /* a prepared outcome is durable and the next duplicate will reconcile it */ }
  }
  private recoveredBusinessOutcome(claim: WebhookReplayClaim): Readonly<Record<string, unknown>> | null {
    const receipt = claim.businessReceipt;
    if (receipt === null || typeof receipt.action !== 'string' || typeof receipt.targetId !== 'string') return null;
    if (receipt.action === 'article.create') return { reply: `Artikel berhasil dibuat: ${receipt.targetId}`, recovered: true };
    if (receipt.action === 'article.sites.assign') {
      const after = typeof receipt.after === 'object' && receipt.after !== null ? receipt.after as Readonly<Record<string, unknown>> : {};
      const count = Array.isArray(after.siteIds) ? after.siteIds.length : 0;
      return { reply: `Berhasil menautkan ${count} portal.`, recovered: true };
    }
    if (receipt.action === 'media.activate') return { reply: `Foto terpasang: ${receipt.targetId}`, recovered: true };
    if (receipt.action === 'publication.request') return { reply: `Publikasi diterima. Job: ${receipt.targetId}`, recovered: true };
    return null;
  }
  /**
   * Sends replies collected during `handle` after the webhook responds.
   *
   * @param replies - Pending replies queued while handling the update.
   * @param requestId - Correlation ID for reply-failure telemetry.
   * @remarks
   * Never awaited inside `handle`, so Telegram API latency never holds the
   * webhook response. Failed non-callback replies persist to the outbox for
   * worker retry instead of being dropped.
   */
  async deliverReplies(replies: readonly TelegramPendingReply[], requestId: string): Promise<void> {
    for (const reply of replies) {
      try {
        if (reply.kind === 'photo') {
          try {
            await this.telegram.sendPhoto({ chatId: reply.chatId, photoUrl: reply.photoUrl, caption: reply.caption, ...(reply.keyboard === undefined ? {} : { keyboard: reply.keyboard }) });
          } catch {
            await this.telegram.send({ chatId: reply.chatId, text: reply.caption });
          }
        } else if (reply.kind === 'callback-answer') {
          await this.telegram.answerCallback({ callbackId: reply.callbackId, ...(reply.text === undefined ? {} : { text: reply.text }) });
        } else {
          await this.telegram.send(reply);
        }
      } catch (error) {
        if (reply.kind === 'callback-answer') {
          logEvent('warn', { event: 'telegram.reply.callback_failed', requestId, context: { name: error instanceof Error ? error.name : 'UnknownError' } });
          continue;
        }
        try {
          const text = reply.kind === 'photo' ? reply.caption : reply.text;
          await this.repository.enqueueOutboxMessage({ organizationId: null, chatId: reply.chatId, text, now: this.clock.now().toISOString() });
        } catch {
          logEvent('warn', { event: 'telegram.reply.deferred_failed', requestId, context: { chatId: reply.chatId, name: error instanceof Error ? error.name : 'UnknownError' } });
        }
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

  async handle(secretHeader: string | null, raw: unknown, requestId = crypto.randomUUID()): Promise<TelegramHandleOutcome> {
    const pending: TelegramPendingReply[] = [];
    const done = (result: Result<TelegramWorkflowResult, PublicErrorEnvelope>): TelegramHandleOutcome => ({ result, pendingReplies: pending });
    if (secretHeader === null || !safeEqual(secretHeader, this.webhookSecret)) return done({ ok: false, error: createNonDisclosingDenial(requestId) });
    const update = this.parse(raw); if (update === null) return done({ ok: false, error: createPublicError('INVALID_INPUT', 'Invalid Telegram update.', requestId) });
    const now = this.clock.now(); if (Math.abs(now.getTime() - new Date(update.occurredAt).getTime()) > this.freshnessSeconds * 1_000) return done({ ok: false, error: createNonDisclosingDenial(requestId) });
    const bodyDigest = digest(JSON.stringify(raw));
    try {
      const claimed = await this.repository.claimReplay({
        source: 'telegram', replayId: update.updateId, organizationId: null, bodyDigest, receivedAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + Math.min(30, this.replayTtlSeconds) * 1_000).toISOString(),
        expiresAt: new Date(now.getTime() + this.replayTtlSeconds * 1_000).toISOString(),
      });
      if (claimed.claim.bodyDigest !== bodyDigest) return done({ ok: false, error: createNonDisclosingDenial(requestId) });
      if (claimed.kind === 'duplicate') {
        if (claimed.claim.status !== 'claimed' || claimed.claim.pendingStatus !== null || claimed.claim.businessReceipt !== null) return done(await this.replayPrepared(claimed.claim, update.chatId, requestId, pending));
        return done({ ok: false, error: createPublicError('CONFLICT', 'Telegram update is already processing.', requestId) });
      }
      const identity = await this.repository.resolveTelegramIdentity(update.userId, update.chatId);
      if (identity === null) {
        const denial = createNonDisclosingDenial(requestId);
        await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimed.claim.claimToken, 'rejected', { code: denial.error.code, message: denial.error.message, reply: LINK_REQUIRED_REPLY }, this.clock.now().toISOString());
        await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimed.claim.claimToken);
        pending.push({ kind: 'text', chatId: update.chatId, text: LINK_REQUIRED_REPLY });
        return done({ ok: false, error: denial });
      }
      const identityDigest = digest(`${identity.organizationId}:${identity.mappingId}:${identity.telegramUserId}:${identity.telegramChatId}`);
      await this.repository.bindReplayIdentity('telegram', update.updateId, bodyDigest, claimed.claim.claimToken, identity.organizationId, identityDigest);
      const actor = this.actor(identity, `telegram-replay:${update.updateId}:${bodyDigest}:${claimed.claim.claimToken}`); const shared = this.services.create();
      const result = await this.execute(identity, actor, shared, update, pending);
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
        pending.push({ kind: 'text', chatId: update.chatId, text: reply });
        return done(result);
      }
      await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimed.claim.claimToken, 'processed', { reply: result.value.reply }, this.clock.now().toISOString());
      await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimed.claim.claimToken);
      const display = result.value.display;
      if (display?.photoUrl !== undefined) pending.push({ kind: 'photo', chatId: update.chatId, photoUrl: display.photoUrl, caption: result.value.reply, keyboard: display.keyboard });
      else if (display !== undefined) pending.push({ kind: 'text', chatId: update.chatId, text: result.value.reply, keyboard: display.keyboard });
      else pending.push({ kind: 'text', chatId: update.chatId, text: result.value.reply });
      return done({ ok: true, value: { ...result.value, actor } });
    } catch { return done({ ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Telegram processing is temporarily unavailable.', requestId) }); }
  }

  private welcome(): TelegramWorkflowResult {
    return { reply: WELCOME_CAPTION, display: { photoUrl: this.welcomePhotoUrl, keyboard: MAIN_KEYBOARD } };
  }
  private help(): TelegramWorkflowResult {
    return { reply: HELP_TEXT, display: { keyboard: MAIN_KEYBOARD } };
  }
  private shortTitle(title: string): string {
    const clean = title.trim();
    return clean.length <= 38 ? clean : `${clean.slice(0, 37)}…`;
  }
  private autoKey(): string {
    return `tg-${this.clock.now().getTime().toString(36)}-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  }
  private regionLabel(regions: readonly { readonly id: string; readonly name: string }[], regionId: string | null): string {
    return regionId === null ? 'induk' : regions.find(({ id }) => id === regionId)?.name ?? regionId;
  }
  private formatStatusText(status: PublicationStatusProjection): string {
    const links = status.result?.urls ?? [];
    return `Status: ${status.job.state}; berhasil: ${status.result?.successfulCount ?? status.targets.filter(({ state }) => state === 'published').length}${links.length === 0 ? '' : `; ${links.join(' ')}`}`;
  }
  private formatLinksText(status: PublicationStatusProjection): string {
    const urls = status.result?.urls ?? [];
    return urls.length === 0 ? `Belum ada tautan terbit. Status: ${status.job.state}` : urls.join('\n');
  }
  private jobMenuKeyboard(jobId: string): TelegramInlineKeyboard {
    return Object.freeze([
      Object.freeze([Object.freeze({ text: '📊 Status', data: `tg:j:${jobId}:status` }), Object.freeze({ text: '🔗 Tautan', data: `tg:j:${jobId}:links` })]),
      Object.freeze([Object.freeze({ text: '🔁 Ulangi', data: `tg:j:${jobId}:retry` }), Object.freeze({ text: '🚫 Tarik', data: `tg:j:${jobId}:unpublish` })]),
      Object.freeze([Object.freeze({ text: '◀️ Daftar Job', data: 'tg:jobs' })]),
    ]);
  }

  private async startImageFlow(identity: TelegramIdentity, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_image', { articleId }));
    return { ok: true, value: await this.reply('Kirim foto (langsung atau sebagai file, satu per pesan, boleh banyak). /cancel untuk selesai.') };
  }
  private async startSitesFlow(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const article = listed.value.articles.find(({ id }) => id === articleId);
    if (article === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const available = listed.value.sites.filter(({ status }) => status === 'active');
    if (available.length === 0) return { ok: true, value: await this.reply('Tidak ada portal aktif yang tersedia.') };
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_sites', { articleId, regionId: article.regionId, availableSiteIds: available.map(({ id }) => id) }));
    return { ok: true, value: await this.reply(`Satu artikel bisa tayang di semua portal (region artikel: ${this.regionLabel(listed.value.regions, article.regionId)}). Kirim Site ID dipisah koma:\n${available.map(({ id, normalizedHostname, regionId: siteRegion }) => `${normalizedHostname} [${this.regionLabel(listed.value.regions, siteRegion)}]: ${id}`).join('\n')}`) };
  }
  private async listArticles(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const recent = [...listed.value.articles].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 8);
    if (recent.length === 0) return { ok: true, value: await this.reply('Belum ada artikel. Ketuk 📝 Buat Artikel di /start untuk menyusun yang pertama.') };
    const keyboard: TelegramInlineKeyboard = Object.freeze(recent.map((article) => Object.freeze([Object.freeze({ text: `▸ ${this.shortTitle(article.title)}`, data: `tg:a:${article.id}:menu` })])));
    const lines = recent.map((article, index) => `${index + 1}. ${article.title}\n   Status: ${article.status}`);
    return { ok: true, value: { ...(await this.reply(`Artikel terbaru:\n\n${lines.join('\n\n')}\n\nKetuk artikel untuk mengelola.`)), display: { keyboard } } };
  }
  private async listJobs(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const jobs = await shared.publication.listJobs(actor); if (!jobs.ok) return jobs;
    if (jobs.value.length === 0) return { ok: true, value: await this.reply('Belum ada pekerjaan publikasi. Terbitkan artikel lewat /artikel atau /publish.') };
    const keyboard: TelegramInlineKeyboard = Object.freeze(jobs.value.map(({ job, articleTitle }) => Object.freeze([Object.freeze({ text: `▸ ${this.shortTitle(articleTitle)}`, data: `tg:j:${job.id}:menu` })])));
    const lines = jobs.value.map(({ job, articleTitle }, index) => `${index + 1}. ${articleTitle}\n   Status: ${job.state} · ${job.createdAt.slice(0, 10)}`);
    return { ok: true, value: { ...(await this.reply(`Pekerjaan terbaru:\n\n${lines.join('\n\n')}\n\nKetuk pekerjaan untuk mengelola.`)), display: { keyboard } } };
  }
  private async listPortals(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const active = listed.value.sites.filter(({ status }) => status === 'active');
    if (active.length === 0) return { ok: true, value: await this.reply('Tidak ada portal aktif yang tersedia.') };
    const lines = active.map(({ normalizedHostname, regionId, id }) => `${normalizedHostname} [${this.regionLabel(listed.value.regions, regionId)}]: ${id}`);
    const keyboard: TelegramInlineKeyboard = Object.freeze(active.slice(0, 20).map((site) => Object.freeze([Object.freeze({ text: `▸ ${this.shortTitle(site.normalizedHostname)}`, data: `tg:p:${site.id}:menu` })])));
    return { ok: true, value: { ...(await this.reply(`Portal aktif:\n\n${lines.join('\n')}\n\nKetuk portal untuk detail, atau terbitkan tanpa ketik ID lewat /artikel → 🚀 Publikasikan.`)), display: { keyboard } } };
  }
  private async articleMenu(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const article = listed.value.articles.find(({ id }) => id === articleId);
    if (article === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const keyboard: TelegramInlineKeyboard = Object.freeze([
      Object.freeze([Object.freeze({ text: '🖼 Foto', data: `tg:a:${articleId}:img` }), Object.freeze({ text: '🌐 Portal', data: `tg:a:${articleId}:sites` })]),
      Object.freeze([Object.freeze({ text: '🚀 Publikasikan', data: `tg:a:${articleId}:pub` }), Object.freeze({ text: '📄 Daftar', data: 'tg:articles' })]),
      Object.freeze([Object.freeze({ text: '💡 Saran Varian', data: `tg:a:${articleId}:sug` })]),
    ]);
    return { ok: true, value: { ...(await this.reply(`${article.title}\nStatus: ${article.status}\n\nPilih aksi:`)), display: { keyboard } } };
  }
  private async startSuggestFlow(identity: TelegramIdentity, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'suggest_sites', { articleId }));
    return { ok: true, value: await this.reply('Kirim Site ID tujuan dipisah koma untuk disusun sarannya. /cancel untuk batal.') };
  }
  private async runSuggest(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string | undefined, siteIds: readonly string[]): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    if (articleId === undefined || articleId === '' || siteIds.length === 0) return { ok: true, value: await this.reply(SUGGEST_USAGE) };
    const suggested = await shared.publication.suggest(actor, { articleId, siteIds: [...siteIds] });
    if (!suggested.ok) return suggested;
    const listed = await shared.articles.listEditorial(actor);
    const hostnames = new Map((listed.ok ? listed.value.sites : []).map((site) => [site.id, site.normalizedHostname] as const));
    const lines = Object.entries(suggested.value.overrides).map(([siteId, override]) => {
      const label = hostnames.get(siteId) ?? siteId;
      const title = override.title ?? '(pakai judul kanonis)';
      const description = override.description ?? '(pakai deskripsi kanonis)';
      return `• ${label}\n  Judul: ${title}\n  Deskripsi: ${description}`;
    });
    await this.repository.clearTelegramConversation(identity);
    return { ok: true, value: await this.reply(lines.length === 0 ? 'Tidak ada saran varian untuk kombinasi tersebut.' : `Saran varian (belum membuat job):\n\n${lines.join('\n\n')}`) };
  }
  private async searchArticles(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, keyword: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    if (keyword === '') return { ok: true, value: await this.reply(CARI_USAGE) };
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const needle = keyword.toLowerCase();
    const matches = listed.value.articles.filter((article) => {
      const body = typeof (article as { readonly body?: unknown }).body === 'string' ? (article as { readonly body?: string }).body ?? '' : '';
      return `${article.title} ${body}`.toLowerCase().includes(needle);
    }).slice(0, 8);
    if (matches.length === 0) return { ok: true, value: await this.reply(`Tidak ada artikel yang cocok dengan "${keyword}".`) };
    const keyboard: TelegramInlineKeyboard = Object.freeze(matches.map((article) => Object.freeze([Object.freeze({ text: `▸ ${this.shortTitle(article.title)}`, data: `tg:a:${article.id}:menu` })])));
    const lines = matches.map((article, index) => `${index + 1}. ${article.title}\n   Status: ${article.status}`);
    return { ok: true, value: { ...(await this.reply(`Hasil cari "${keyword}":\n\n${lines.join('\n\n')}\n\nKetuk artikel untuk mengelola.`)), display: { keyboard } } };
  }
  private async portalMenu(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, siteId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const site = listed.value.sites.find(({ id }) => id === siteId);
    if (site === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const keyboard: TelegramInlineKeyboard = Object.freeze([
      Object.freeze([Object.freeze({ text: '◀️ Daftar Portal', data: 'tg:portals' })]),
    ]);
    return { ok: true, value: { ...(await this.reply(`${site.normalizedHostname}\nRegion: ${this.regionLabel(listed.value.regions, site.regionId)}\nStatus: ${site.status}\nID: ${site.id}`)), display: { keyboard } } };
  }
  private async publishPicker(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const article = listed.value.articles.find(({ id }) => id === articleId);
    if (article === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const active = listed.value.sites.filter(({ status }) => status === 'active').slice(0, 20);
    if (active.length === 0) return { ok: true, value: await this.reply('Tidak ada portal aktif yang tersedia.') };
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'publish_pick_site', { articleId }));
    const keyboard: TelegramInlineKeyboard = Object.freeze(active.map((site) => Object.freeze([Object.freeze({ text: `🚀 ${this.shortTitle(site.normalizedHostname)}`, data: `tg:ps:${site.id}` })])));
    return { ok: true, value: { ...(await this.reply(`Pilih portal untuk menerbitkan "${this.shortTitle(article.title)}":`)), display: { keyboard } } };
  }
  private async publishPickedSite(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, siteId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const conversation = await this.repository.readTelegramConversation(identity);
    const articleId = conversation?.data.articleId;
    if (conversation === null || conversation.step !== 'publish_pick_site' || typeof articleId !== 'string' || articleId === '') {
      return { ok: true, value: await this.reply('Sesi pemilihan portal kedaluwarsa. Buka /artikel lalu ketuk 🚀 Publikasikan untuk mengulang.') };
    }
    const publication = await shared.publication.request(actor, { articleId, siteIds: [siteId], idempotencyKey: this.autoKey(), options: {} });
    if (!publication.ok) return publication;
    await this.repository.clearTelegramConversation(identity);
    return { ok: true, value: { ...(await this.reply(`Publikasi ${publication.value.job.state}. Job: ${publication.value.job.id}`)), businessResult: publication.value, display: { keyboard: this.jobMenuKeyboard(publication.value.job.id) } } };
  }
  private async jobMenu(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, jobId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const status = await shared.publication.status(actor, { jobId }); if (!status.ok) return status;
    return { ok: true, value: { ...(await this.reply(`Job: ${status.value.job.id}\n${this.formatStatusText(status.value)}`)), businessResult: status.value, display: { keyboard: this.jobMenuKeyboard(jobId) } } };
  }
  private async jobAction(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, jobId: string, action: 'status' | 'links' | 'retry' | 'unpublish'): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    if (action === 'status') {
      const status = await shared.publication.status(actor, { jobId }); if (!status.ok) return status;
      return { ok: true, value: { ...(await this.reply(this.formatStatusText(status.value))), businessResult: status.value, display: { keyboard: this.jobMenuKeyboard(jobId) } } };
    }
    if (action === 'links') {
      const status = await shared.publication.status(actor, { jobId }); if (!status.ok) return status;
      return { ok: true, value: { ...(await this.reply(this.formatLinksText(status.value))), businessResult: status.value, display: { keyboard: this.jobMenuKeyboard(jobId) } } };
    }
    if (action === 'retry') {
      const retried = await shared.publication.retry(actor, { jobId }); if (!retried.ok) return retried;
      return { ok: true, value: { ...(await this.reply(`Pengulangan antre. Status: ${retried.value.job.state}`)), businessResult: retried.value, display: { keyboard: this.jobMenuKeyboard(jobId) } } };
    }
    const withdrawn = await shared.publication.unpublish(actor, { jobId }); if (!withdrawn.ok) return withdrawn;
    return { ok: true, value: { ...(await this.reply(`Publikasi ditarik. Status: ${withdrawn.value.job.state}`)), businessResult: withdrawn.value, display: { keyboard: this.jobMenuKeyboard(jobId) } } };
  }
  private async routeCallback(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, data: string | null): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope> | null> {
    if (data === null) return null;
    const parts = data.split(':');
    if (parts[0] !== 'tg') return null;
    if (parts[1] === 'a' && parts.length === 4 && parts[2] !== undefined && parts[2] !== '' && parts[3] !== undefined) {
      const articleId = parts[2];
      if (parts[3] === 'menu') return this.articleMenu(actor, shared, articleId);
      if (parts[3] === 'img') return this.startImageFlow(identity, articleId);
      if (parts[3] === 'sites') return this.startSitesFlow(identity, actor, shared, articleId);
      if (parts[3] === 'pub') return this.publishPicker(identity, actor, shared, articleId);
      if (parts[3] === 'sug') return this.startSuggestFlow(identity, articleId);
      return null;
    }
    if (parts[1] === 'p' && parts.length === 4 && parts[2] !== undefined && parts[2] !== '' && parts[3] === 'menu') {
      return this.portalMenu(actor, shared, parts[2]);
    }
    if (parts[1] === 'ps' && parts.length === 3 && parts[2] !== undefined && parts[2] !== '') {
      return this.publishPickedSite(identity, actor, shared, parts[2]);
    }
    if (parts[1] === 'j' && parts.length === 4 && parts[2] !== undefined && parts[2] !== '' && parts[3] !== undefined) {
      const jobId = parts[2];
      if (parts[3] === 'menu') return this.jobMenu(actor, shared, jobId);
      if (parts[3] === 'status' || parts[3] === 'links' || parts[3] === 'retry' || parts[3] === 'unpublish') return this.jobAction(actor, shared, jobId, parts[3]);
      return null;
    }
    return null;
  }

  private async execute(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, update: TelegramUpdate, pending: TelegramPendingReply[]): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    let text = update.text?.trim() ?? '';
    if (update.callback !== null) {
      pending.push({ kind: 'callback-answer', callbackId: update.callback.id });
      const structured = await this.routeCallback(identity, actor, shared, update.callback.data);
      if (structured !== null) return structured;
      const mapped = callbackCommand(update.callback.data);
      if (mapped === null) return { ok: true, value: this.help() };
      text = mapped;
    }
    if (text === '/start' || text === '/menu') return { ok: true, value: this.welcome() };
    if (text === '/bantuan' || text === '/help') return { ok: true, value: this.help() };
    if (text === '/cancel') { await this.repository.clearTelegramConversation(identity); return { ok: true, value: await this.reply('Percakapan dibatalkan.') }; }
    if (text === '/regions') {
      const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
      const values = listed.value.regions.filter(({ status }) => status === 'active').map(({ id, name }) => `${name}: ${id}`);
      return { ok: true, value: await this.reply(values.length === 0 ? 'Tidak ada Region yang aktif.' : values.join('\n')) };
    }
    if (text === '/sites') return { ok: true, value: await this.reply(SITES_USAGE) };
    if (text === '/image') return { ok: true, value: await this.reply(IMAGE_USAGE) };
    if (text === '/publish') return { ok: true, value: await this.reply(PUBLISH_USAGE) };
    if (text === '/status') return { ok: true, value: await this.reply(STATUS_USAGE) };
    if (text === '/links') return { ok: true, value: await this.reply(LINKS_USAGE) };
    if (text === '/retry') return { ok: true, value: await this.reply(RETRY_USAGE) };
    if (text === '/unpublish') return { ok: true, value: await this.reply(UNPUBLISH_USAGE) };
    if (text === '/artikel') return this.listArticles(actor, shared);
    if (text === '/cari') return { ok: true, value: await this.reply(CARI_USAGE) };
    if (text === '/suggest') return { ok: true, value: await this.reply(SUGGEST_USAGE) };
    if (text === '/job') return this.listJobs(actor, shared);
    if (text === '/portal') return this.listPortals(actor, shared);
    if (text === '/article') { await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_region', {})); return { ok: true, value: await this.reply('Silakan kirim ID Region yang aktif. /cancel untuk membatalkan.') }; }
    if (text.startsWith('/image ')) {
      const [, articleId] = words(text); if (articleId === undefined) return { ok: true, value: await this.reply(IMAGE_USAGE) };
      return this.startImageFlow(identity, articleId);
    }
    if (text.startsWith('/sites ')) {
      const [, articleId] = words(text); if (articleId === undefined) return { ok: true, value: await this.reply(SITES_USAGE) };
      return this.startSitesFlow(identity, actor, shared, articleId);
    }
    if (text.startsWith('/suggest ')) {
      const [, articleId, siteList] = words(text);
      return this.runSuggest(identity, actor, shared, articleId, ids(siteList ?? ''));
    }
    if (text.startsWith('/cari ')) {
      return this.searchArticles(actor, shared, words(text).slice(1).join(' '));
    }
    if (text.startsWith('/publish ')) {
      const [, articleId, siteList, idempotencyKey] = words(text);
      const publication = await shared.publication.request(actor, { articleId, siteIds: ids(siteList ?? ''), idempotencyKey: idempotencyKey ?? this.autoKey(), options: {} });
      if (!publication.ok) return publication;
      return { ok: true, value: { ...(await this.reply(`Publikasi ${publication.value.job.state}. Job: ${publication.value.job.id}`)), businessResult: publication.value } };
    }
    if (text.startsWith('/status ') || text.startsWith('/links ')) {
      const [command, jobId] = words(text); const status = await shared.publication.status(actor, { jobId }); if (!status.ok) return status;
      const urls = status.value.result?.urls ?? []; const reply = command === '/links' ? (urls.length === 0 ? `Belum ada tautan terbit. Status: ${status.value.job.state}` : urls.join('\n')) : `Status: ${status.value.job.state}; berhasil: ${status.value.result?.successfulCount ?? status.value.targets.filter(({ state }) => state === 'published').length}${urls.length === 0 ? '' : `; ${urls.join(' ')}`}`;
      return { ok: true, value: { ...(await this.reply(reply)), businessResult: status.value } };
    }
    if (text.startsWith('/retry ')) {
      const [, jobId, targetList] = words(text);
      const retried = await shared.publication.retry(actor, { jobId, ...(targetList === undefined ? {} : { targetIds: ids(targetList) }) });
      if (!retried.ok) return retried;
      return { ok: true, value: { ...(await this.reply(`Pengulangan antre. Status: ${retried.value.job.state}`)), businessResult: retried.value } };
    }
    if (text.startsWith('/unpublish ')) {
      const [, jobId, targetList] = words(text);
      const withdrawn = await shared.publication.unpublish(actor, { jobId, ...(targetList === undefined ? {} : { targetIds: ids(targetList) }) });
      if (!withdrawn.ok) return withdrawn;
      return { ok: true, value: { ...(await this.reply(`Publikasi ditarik. Status: ${withdrawn.value.job.state}`)), businessResult: withdrawn.value } };
    }
    const conversation = await this.repository.readTelegramConversation(identity);
    if (conversation === null || new Date(conversation.expiresAt) <= this.clock.now()) return { ok: true, value: await this.reply(UNKNOWN_COMMAND_REPLY) };
    return this.advance(identity, actor, shared, update, conversation);
  }

  private async advance(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, update: TelegramUpdate, conversation: TelegramConversation): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const text = update.text?.trim() ?? '';
    const next = async (step: TelegramConversation['step'], field: string, value: unknown, reply: string) => { await this.repository.saveTelegramConversation(identity, this.conversation(identity, step, { ...conversation.data, [field]: value })); return { ok: true as const, value: await this.reply(reply) }; };
    if (conversation.step === 'article_region') return next('article_title', 'regionId', text, 'Kirim judul artikel.');
    if (conversation.step === 'article_title') return next('article_body', 'title', text, 'Kirim isi artikel.');
    if (conversation.step === 'article_body') return next('article_source', 'body', text, 'Kirim atribusi sumber.');
    if (conversation.step === 'article_source') return next('article_slug', 'source', text, 'Kirim slug artikel (huruf kecil, tanpa spasi, aman untuk URL).');
    if (conversation.step === 'article_slug') {
      const created = await shared.articles.createArticle(actor, { ...conversation.data, slug: text, publisherId: null, categoryId: null, authorId: null, status: 'draft' });
      if (!created.ok) return created;
      await this.repository.clearTelegramConversation(identity);
      return { ok: true, value: { ...(await this.reply(`Artikel berhasil dibuat: ${created.value.id}`)), businessResult: created.value } };
    }
    if (conversation.step === 'article_sites') {
      const requestedSiteIds = ids(text);
      const availableSiteIds = Array.isArray(conversation.data.availableSiteIds) ? conversation.data.availableSiteIds.filter((value): value is string => typeof value === 'string') : [];
      if (requestedSiteIds.length === 0 || requestedSiteIds.some((siteId) => !availableSiteIds.includes(siteId))) {
        return { ok: false, error: createPublicError('INVALID_INPUT', 'Pilih hanya Site aktif dari daftar.', actor.requestId, { siteIds: ['One or more Sites are unavailable.'] }) };
      }
      const assigned = await shared.articles.assignArticleSites(actor, { articleId: conversation.data.articleId, siteIds: requestedSiteIds }); if (!assigned.ok) return assigned;
      await this.repository.clearTelegramConversation(identity); return { ok: true, value: { ...(await this.reply(`Berhasil menautkan ${assigned.value.length} portal.`)), businessResult: assigned.value } };
    }
    if (conversation.step === 'article_image') {
      if (update.document === null) return { ok: true, value: await this.reply('Kirim foto atau dokumen gambar untuk artikel ini. /cancel untuk selesai.') };
      const articleId = typeof conversation.data.articleId === 'string' ? conversation.data.articleId : '';
      const prepared = await this.mediaTransfer.prepare({ fileId: update.document.fileId, expectedSize: update.document.sizeBytes });
      const reserved = await shared.media.reserveUpload(actor, { filename: update.document.filename, mediaType: update.document.mediaType, sizeBytes: prepared.sizeBytes, checksum: prepared.checksumSha256, purpose: 'article-image', owner: { kind: 'article', articleId } });
      if (!reserved.ok) return reserved;
      await this.mediaTransfer.transfer({ media: prepared, authorization: reserved.value.authorization, mediaType: update.document.mediaType });
      const completed = await shared.media.completeUpload(actor, { reservationId: reserved.value.reservationId }); if (!completed.ok) return completed;
      const listedMedia = await shared.media.list(actor);
      const listedArticles = await shared.articles.listEditorial(actor);
      const position = (listedMedia.ok ? listedMedia.value : [])
        .filter((asset) => asset.owner.kind === 'article' && asset.owner.articleId === articleId && asset.state === 'active').length;
      const article = listedArticles.ok ? listedArticles.value.articles.find(({ id }) => id === articleId) : undefined;
      if (article !== undefined && (article.status === 'draft' || article.status === 'active')) {
        const updated = await shared.articles.updateArticle(actor, {
          id: article.id, expectedVersion: article.version, regionId: article.regionId, publisherId: article.publisherId,
          categoryId: article.categoryId, authorId: article.authorId, slug: article.slug, title: article.title,
          body: `${article.body.replace(/\s+$/, '')}\n\n[gambar:${Math.max(1, position)}]`, source: article.source,
          tags: [...article.tags], status: article.status,
        });
        if (!updated.ok) return updated;
      }
      await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_image', { articleId }));
      return { ok: true, value: { ...(await this.reply(`Foto ke-${Math.max(1, position)} terpasang ([gambar:${Math.max(1, position)}]). Kirim lagi atau /cancel.`)), businessResult: completed.value } };
    }
    if (conversation.step === 'publish_pick_site') {
      const siteId = text.split(/\s+/)[0] ?? '';
      if (siteId === '') return { ok: true, value: await this.reply('Ketuk salah satu portal di atas, atau kirim Site ID. /cancel untuk batal.') };
      return this.publishPickedSite(identity, actor, shared, siteId);
    }
    if (conversation.step === 'suggest_sites') {
      const articleId = typeof conversation.data.articleId === 'string' ? conversation.data.articleId : undefined;
      return this.runSuggest(identity, actor, shared, articleId, ids(text));
    }
    await this.repository.clearTelegramConversation(identity); return { ok: true, value: await this.reply('Percakapan diatur ulang. Mulai lagi dengan /article.') };
  }
}

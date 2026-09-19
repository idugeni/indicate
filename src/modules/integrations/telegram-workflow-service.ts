import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import type { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import type { MediaService } from '@/modules/publishing/media-service';
import type { PublicationService } from '@/modules/publishing/publication-service';
import type { PublicationStatusProjection } from '@/modules/publishing/models';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { TelegramConversation, TelegramHandleOutcome, TelegramIdentity, TelegramIdentityOption, TelegramInlineKeyboard, TelegramPendingReply, TelegramUpdate, TelegramWorkflowResult, WebhookReplayClaim } from '@/modules/integrations/models';
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

const safeEqual = (left: string, right: string): boolean => { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const words = (text: string) => text.trim().split(/\s+/);

const WELCOME_CAPTION = 'Selamat datang di Bot Resmi Indicate.\n\nRuang kendali redaksi dalam genggaman: susun artikel, kirim foto, atur portal tayang, dan pantau publikasi lintas portal — semuanya dari sini.\n\nPilih menu di bawah untuk memulai.';
const HELP_TEXT = 'Panduan Bot Indicate\n\nOrganisasi:\n/org — ganti organisasi aktif (pemilih tombol)\n\nDaftar:\n/artikel — artikel terbaru + tombol aksi\n/cari — cari artikel (ketik kata kunci setelah perintah)\n/job — pekerjaan publikasi terbaru\n/portal — daftar portal aktif + detail\n\nBuat artikel:\n/article — susun artikel langkah demi langkah (region lewat tombol)\n/edit — ubah judul, isi, atau sumber artikel\n\nPerintah di bawah cukup diketik polos — bot menampilkan pemilih tombol:\n/image — tambah foto ke artikel\n/sites — atur portal tayang artikel\n/suggest — saran judul/deskripsi unik per portal\n/publish — ajukan publikasi (termasuk sekaligus ke semua portal)\n/status — pantau status pekerjaan\n/links — lihat tautan yang terbit\n/retry — ulangi target yang gagal\n/unpublish — tarik artikel yang terbit\n\nLainnya:\n/regions — daftar Region yang aktif\n/cancel — batalkan percakapan berjalan\n/start — kembali ke menu utama';
const MAIN_KEYBOARD: TelegramInlineKeyboard = Object.freeze([
  Object.freeze([Object.freeze({ text: '📝 Buat Artikel', data: 'tg:article' }), Object.freeze({ text: '📄 Artikel Saya', data: 'tg:articles' })]),
  Object.freeze([Object.freeze({ text: '🌐 Portal Tayang', data: 'tg:portals' }), Object.freeze({ text: '📋 Daftar Job', data: 'tg:jobs' })]),
  Object.freeze([Object.freeze({ text: '🖼 Tambah Foto', data: 'tg:image' }), Object.freeze({ text: '🔗 Tautan Terbit', data: 'tg:links' })]),
  Object.freeze([Object.freeze({ text: '🔍 Cari Artikel', data: 'tg:search' }), Object.freeze({ text: '🗺 Daftar Region', data: 'tg:regions' })]),
  Object.freeze([Object.freeze({ text: '🏢 Organisasi', data: 'tg:orgs' }), Object.freeze({ text: '❓ Bantuan', data: 'tg:help' })]),
  Object.freeze([Object.freeze({ text: '✖️ Batal', data: 'tg:cancel' })]),
]);
const LINK_REQUIRED_REPLY = 'Akses ditolak. Akun Telegram ini belum tertaut ke organisasi mana pun.\n\nHubungi administrator redaksi Anda untuk menautkan akun ini sebelum menggunakan bot.';
const UNKNOWN_COMMAND_REPLY = 'Perintah tidak dikenali. Ketik /start untuk membuka menu utama atau /bantuan untuk panduan lengkap.';
const SUGGEST_USAGE = 'Saran varian butuh artikel dan portal: ketik /suggest untuk membuka pemilih tombol.';
const CARI_USAGE = 'Ketik /cari lalu kata kuncinya, contoh: /cari banjir';
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
  'tg:orgs': '/org',
  'tg:search': '/cari',
  'tg:regions': '/regions',
});
const callbackCommand = (data: string | null): string | null => (data === null ? null : (CALLBACK_COMMANDS[data] ?? null));

/**
 * Canonical Bot API command menu applied via `setMyCommands`.
 *
 * @remarks
 * Keep in step with `HELP_TEXT` and the Telegram docs page so chat
 * autocomplete, `/bantuan`, and the docs describe the same surface.
 */
export const TELEGRAM_BOT_COMMANDS: readonly TelegramBotCommand[] = Object.freeze([
  Object.freeze({ command: 'start', description: 'Buka menu utama bot redaksi' }),
  Object.freeze({ command: 'org', description: 'Ganti organisasi aktif' }),
  Object.freeze({ command: 'bantuan', description: 'Panduan lengkap perintah bot' }),
  Object.freeze({ command: 'artikel', description: 'Artikel terbaru + tombol aksi' }),
  Object.freeze({ command: 'cari', description: 'Cari artikel berdasar judul' }),
  Object.freeze({ command: 'job', description: 'Pekerjaan publikasi terbaru' }),
  Object.freeze({ command: 'portal', description: 'Daftar portal aktif + detail' }),
  Object.freeze({ command: 'article', description: 'Susun artikel langkah demi langkah' }),
  Object.freeze({ command: 'edit', description: 'Ubah judul, isi, atau sumber artikel' }),
  Object.freeze({ command: 'image', description: 'Mode unggah foto ke artikel' }),
  Object.freeze({ command: 'sites', description: 'Pilih portal tayang artikel' }),
  Object.freeze({ command: 'suggest', description: 'Saran judul/deskripsi unik per portal' }),
  Object.freeze({ command: 'publish', description: 'Ajukan publikasi ke portal' }),
  Object.freeze({ command: 'status', description: 'Pantau status pekerjaan publikasi' }),
  Object.freeze({ command: 'links', description: 'Lihat tautan artikel yang terbit' }),
  Object.freeze({ command: 'retry', description: 'Ulangi target publikasi yang gagal' }),
  Object.freeze({ command: 'unpublish', description: 'Tarik artikel yang sudah terbit' }),
  Object.freeze({ command: 'regions', description: 'Daftar region aktif' }),
  Object.freeze({ command: 'cancel', description: 'Batalkan percakapan berjalan' }),
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
    if (receipt.action === 'article.create') return { reply: 'Artikel berhasil dibuat.', recovered: true };
    if (receipt.action === 'article.sites.assign') {
      const after = typeof receipt.after === 'object' && receipt.after !== null ? receipt.after as Readonly<Record<string, unknown>> : {};
      const count = Array.isArray(after.siteIds) ? after.siteIds.length : 0;
      return { reply: `Berhasil menautkan ${count} portal.`, recovered: true };
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
   * @remarks
   * A caller linked to several organizations must pick one first: the pick
   * is remembered as an `idle` conversation row under the chosen mapping,
   * so no schema beyond the existing conversation table is required.
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
      if (conversation !== null && conversation.step === 'idle' && new Date(conversation.expiresAt) > now) return option.identity;
    }
    return null;
  }

  private async replyOrgPicker(update: TelegramUpdate, bodyDigest: string, claimToken: string, pending: TelegramPendingReply[], requestId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    if (update.callback !== null) pending.push({ kind: 'callback-answer', callbackId: update.callback.id });
    const options = await this.repository.listTelegramIdentities(update.userId, update.chatId);
    if (options.length === 0) {
      const denial = createNonDisclosingDenial(requestId);
      await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimToken, 'rejected', { code: denial.error.code, message: denial.error.message, reply: LINK_REQUIRED_REPLY }, this.clock.now().toISOString());
      await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimToken);
      pending.push({ kind: 'text', chatId: update.chatId, text: LINK_REQUIRED_REPLY });
      return { ok: false, error: denial };
    }
    const picked = update.callback?.data?.startsWith('tg:org:') === true ? update.callback.data.slice('tg:org:'.length) : null;
    const chosen = picked === null ? null : await this.chooseOrganization(update.userId, update.chatId, picked, requestId);
    if (chosen !== null && !chosen.ok) {
      const reply = this.safeFailureReply(chosen.error);
      await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimToken, 'rejected', { code: chosen.error.error.code, message: chosen.error.error.message, reply }, this.clock.now().toISOString());
      await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimToken);
      pending.push({ kind: 'text', chatId: update.chatId, text: reply });
      return chosen;
    }
    const result = chosen ?? await this.showOrgPicker(update.userId, update.chatId);
    if (!result.ok) return result;
    await this.repository.prepareReplayOutcome('telegram', update.updateId, bodyDigest, claimToken, 'processed', { reply: result.value.reply }, this.clock.now().toISOString());
    await this.finalizePrepared('telegram', update.updateId, bodyDigest, claimToken);
    const display = result.value.display;
    if (display !== undefined) pending.push({ kind: 'text', chatId: update.chatId, text: result.value.reply, keyboard: display.keyboard });
    else pending.push({ kind: 'text', chatId: update.chatId, text: result.value.reply });
    return { ok: true, value: result.value };
  }

  private async showOrgPicker(userId: string, chatId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const options = await this.repository.listTelegramIdentities(userId, chatId);
    if (options.length <= 1) return { ok: true, value: await this.reply('Hanya satu organisasi yang tertaut ke akun Telegram ini.') };
    const keyboard: TelegramInlineKeyboard = Object.freeze(options.map((option) => Object.freeze([Object.freeze({ text: `🏢 ${this.shortTitle(option.organizationName)}`, data: `tg:org:${option.identity.mappingId}` })])));
    const lines = options.map((option, index) => `${index + 1}. ${option.organizationName}`);
    return { ok: true, value: { ...(await this.reply(`Pilih organisasi aktif:\n\n${lines.join('\n')}\n\nSemua perintah berikutnya berjalan dalam organisasi terpilih.`)), display: { keyboard } } };
  }

  private async chooseOrganization(userId: string, chatId: string, mappingId: string, requestId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope> | null> {
    if (mappingId === '') return null;
    const options = await this.repository.listTelegramIdentities(userId, chatId);
    const found = options.find((option) => option.identity.mappingId === mappingId);
    if (found === undefined) return { ok: false, error: createNonDisclosingDenial(requestId) };
    for (const option of options) {
      if (option.identity.mappingId !== mappingId) await this.repository.clearTelegramConversation(option.identity);
    }
    await this.repository.saveTelegramConversation(found.identity, this.conversation(found.identity, 'idle', {}));
    return { ok: true, value: this.orgHome(found) };
  }

  private orgHome(option: TelegramIdentityOption): TelegramWorkflowResult {
    return { reply: `${option.organizationName} aktif sebagai organisasi berjalan.\n\nPilih aksi:`, display: { keyboard: MAIN_KEYBOARD } };
  }

  private async pickRegion(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, regionId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const conversation = await this.repository.readTelegramConversation(identity);
    if (conversation === null || new Date(conversation.expiresAt) <= this.clock.now() || conversation.step !== 'article_region') {
      return { ok: true, value: await this.reply('Sesi pembuatan artikel kedaluwarsa. Mulai lagi lewat 📝 Buat Artikel.') };
    }
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    if (!listed.value.regions.some((region) => region.id === regionId && region.status === 'active')) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Pilih hanya Region aktif dari daftar.', actor.requestId) };
    }
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_title', { regionId }));
    return { ok: true, value: await this.reply('Kirim judul artikel.') };
  }

  private sitePickerKeyboard(sites: readonly { readonly id: string; readonly normalizedHostname: string }[], selected: readonly string[], confirmLabel: string): TelegramInlineKeyboard {
    const rows = sites.map((site) => Object.freeze([Object.freeze({ text: `${selected.includes(site.id) ? '✅' : '⬜'} ${this.shortTitle(site.normalizedHostname)}`, data: `tg:ts:${site.id}` })]));
    return Object.freeze([...rows, Object.freeze([Object.freeze({ text: `${confirmLabel} (${selected.length})`, data: 'tg:ts:go' }), Object.freeze({ text: '✖ Batal', data: 'tg:cancel' })])]);
  }

  /**
   * Opens a toggle-button site picker for linking, publishing, or suggesting.
   *
   * @param identity - Active organization identity of the caller.
   * @param actor - Tenant actor derived from that identity.
   * @param shared - Shared business services.
   * @param articleId - Article the picked sites apply to.
   * @param mode - Whether the pick ends in assignment, publication, or suggestions.
   * @returns Picker message with toggle buttons; the caller never types a Site ID.
   */
  private async showSitePicker(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string, mode: 'assign' | 'publish' | 'suggest'): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const article = listed.value.articles.find(({ id }) => id === articleId);
    if (article === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const available = listed.value.sites.filter(({ status }) => status === 'active').slice(0, 20);
    if (available.length === 0) return { ok: true, value: await this.reply('Tidak ada portal aktif yang tersedia.') };
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'site_pick', { articleId, mode, selected: [], availableSiteIds: available.map(({ id }) => id) }));
    const action = mode === 'publish' ? 'menerbitkan' : mode === 'suggest' ? 'menyusun saran untuk' : 'menautkan';
    return { ok: true, value: { ...(await this.reply(`Ketuk portal untuk ${action} "${this.shortTitle(article.title)}":\n\n0 portal dipilih.`)), display: { keyboard: this.sitePickerKeyboard(available, [], mode === 'publish' ? '🚀 Terbitkan' : mode === 'suggest' ? '✨ Susun Saran' : '🔗 Tautkan') } } };
  }

  private async toggleSitePick(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, siteId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope> | null> {
    const conversation = await this.repository.readTelegramConversation(identity);
    if (conversation === null || new Date(conversation.expiresAt) <= this.clock.now() || conversation.step !== 'site_pick') {
      return { ok: true, value: await this.reply('Sesi pemilihan portal kedaluwarsa. Buka /artikel lalu pilih aksi untuk mengulang.') };
    }
    const mode = conversation.data.mode === 'publish' || conversation.data.mode === 'suggest' || conversation.data.mode === 'assign' ? conversation.data.mode : null;
    const availableSiteIds = Array.isArray(conversation.data.availableSiteIds) ? conversation.data.availableSiteIds.filter((value): value is string => typeof value === 'string') : [];
    const selected = Array.isArray(conversation.data.selected) ? conversation.data.selected.filter((value): value is string => typeof value === 'string') : [];
    const articleId = typeof conversation.data.articleId === 'string' ? conversation.data.articleId : '';
    if (mode === null || articleId === '' || !availableSiteIds.includes(siteId)) {
      return { ok: true, value: await this.reply('Pilihan tidak dikenal. Ketuk tombol portal yang tampil.') };
    }
    const next = selected.includes(siteId) ? selected.filter((value) => value !== siteId) : [...selected, siteId];
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'site_pick', { articleId, mode, selected: next, availableSiteIds }));
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const available = listed.value.sites.filter((site) => availableSiteIds.includes(site.id));
    const label = mode === 'publish' ? '🚀 Terbitkan' : mode === 'suggest' ? '✨ Susun Saran' : '🔗 Tautkan';
    return { ok: true, value: { ...(await this.reply(`${next.length} portal dipilih. Ketuk ${label} bila sudah pas.`)), display: { keyboard: this.sitePickerKeyboard(available, next, label) } } };
  }

  private async confirmSitePick(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope> | null> {
    const conversation = await this.repository.readTelegramConversation(identity);
    if (conversation === null || new Date(conversation.expiresAt) <= this.clock.now() || conversation.step !== 'site_pick') {
      return { ok: true, value: await this.reply('Sesi pemilihan portal kedaluwarsa. Buka /artikel lalu pilih aksi untuk mengulang.') };
    }
    const mode = conversation.data.mode === 'publish' || conversation.data.mode === 'suggest' || conversation.data.mode === 'assign' ? conversation.data.mode : null;
    const selected = Array.isArray(conversation.data.selected) ? conversation.data.selected.filter((value): value is string => typeof value === 'string') : [];
    const articleId = typeof conversation.data.articleId === 'string' ? conversation.data.articleId : '';
    if (mode === null || articleId === '') {
      await this.repository.clearTelegramConversation(identity);
      return { ok: true, value: await this.reply('Sesi pemilihan portal rusak. Mulai lagi dari /artikel.') };
    }
    if (selected.length === 0) return { ok: true, value: await this.reply('Belum ada portal dipilih. Ketuk dulu tombol portalnya.') };
    if (mode === 'assign') {
      const assigned = await shared.articles.assignArticleSites(actor, { articleId, siteIds: selected }); if (!assigned.ok) return assigned;
      await this.repository.clearTelegramConversation(identity);
      return { ok: true, value: { ...(await this.reply(`Berhasil menautkan ${assigned.value.length} portal.`)), businessResult: assigned.value } };
    }
    if (mode === 'suggest') return this.runSuggest(identity, actor, shared, articleId, selected);
    const publication = await shared.publication.request(actor, { articleId, siteIds: selected, idempotencyKey: this.autoKey(), options: {} });
    if (!publication.ok) return publication;
    await this.repository.clearTelegramConversation(identity);
    const title = await this.articleTitle(actor, shared, articleId);
    return { ok: true, value: { ...(await this.reply(`Publikasi ${publication.value.job.state} untuk "${this.shortTitle(title ?? 'artikel')}". Pantau lewat tombol 📊 Status di bawah.`)), businessResult: publication.value, display: { keyboard: this.jobMenuKeyboard(publication.value.job.id) } } };
  }

  /**
   * Publishes one article to every active portal in a single job.
   *
   * @param identity - Active organization identity of the caller.
   * @param actor - Tenant actor derived from that identity.
   * @param shared - Shared business services.
   * @param articleId - Article to publish everywhere.
   * @returns Job reply with the job menu; per-target rules stay in the service.
   */
  private async publishAll(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const article = listed.value.articles.find(({ id }) => id === articleId);
    if (article === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const siteIds = listed.value.sites.filter(({ status }) => status === 'active').map(({ id }) => id);
    if (siteIds.length === 0) return { ok: true, value: await this.reply('Tidak ada portal aktif yang tersedia.') };
    const publication = await shared.publication.request(actor, { articleId, siteIds, idempotencyKey: this.autoKey(), options: {} });
    if (!publication.ok) return publication;
    await this.repository.clearTelegramConversation(identity);
    return { ok: true, value: { ...(await this.reply(`Publikasi ${publication.value.job.state} untuk "${this.shortTitle(article.title)}" ke ${siteIds.length} portal. Pantau lewat tombol 📊 Status di bawah.`)), businessResult: publication.value, display: { keyboard: this.jobMenuKeyboard(publication.value.job.id) } } };
  }

  private async loadArticle(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string) {
    const listed = await shared.articles.listEditorial(actor);
    if (!listed.ok) return listed;
    const article = listed.value.articles.find(({ id }) => id === articleId);
    if (article === undefined) return { ok: false as const, error: createNonDisclosingDenial(actor.requestId) };
    return { ok: true as const, value: article };
  }

  private async editMenu(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const loaded = await this.loadArticle(actor, shared, articleId); if (!loaded.ok) return loaded;
    const keyboard: TelegramInlineKeyboard = Object.freeze([
      Object.freeze([Object.freeze({ text: '✏️ Judul', data: `tg:a:${articleId}:et` }), Object.freeze({ text: '📝 Isi', data: `tg:a:${articleId}:eb` })]),
      Object.freeze([Object.freeze({ text: '🔖 Sumber', data: `tg:a:${articleId}:es` }), Object.freeze({ text: '◀️ Kembali', data: `tg:a:${articleId}:menu` })]),
    ]);
    return { ok: true, value: { ...(await this.reply(`"${this.shortTitle(loaded.value.title)}"\n\nUbah bagian mana?`)), display: { keyboard } } };
  }

  private async startEditFlow(identity: TelegramIdentity, articleId: string, field: 'title' | 'body' | 'source'): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_edit', { articleId, field }));
    const label = field === 'title' ? 'judul' : field === 'body' ? 'isi' : 'sumber';
    return { ok: true, value: await this.reply(`Kirim ${label} baru untuk artikel ini. /cancel untuk batal.`) };
  }

  /**
   * Applies a button-confirmed article edit with an optimistic version check.
   *
   * @param identity - Active organization identity of the caller.
   * @param actor - Tenant actor derived from that identity.
   * @param shared - Shared business services.
   * @returns Refreshed article menu on success; the article is reloaded first
   * so a concurrent dashboard edit surfaces as a conflict, not a silent overwrite.
   */
  private async confirmEdit(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope> | null> {
    const conversation = await this.repository.readTelegramConversation(identity);
    if (conversation === null || new Date(conversation.expiresAt) <= this.clock.now() || conversation.step !== 'article_edit_confirm') {
      return { ok: true, value: await this.reply('Sesi ubah artikel kedaluwarsa. Buka /artikel lalu ketuk ✏️ Edit untuk mengulang.') };
    }
    const field = conversation.data.field === 'title' || conversation.data.field === 'body' || conversation.data.field === 'source' ? conversation.data.field : null;
    const value = typeof conversation.data.value === 'string' && conversation.data.value.trim() !== '' ? conversation.data.value : null;
    const articleId = typeof conversation.data.articleId === 'string' ? conversation.data.articleId : '';
    if (field === null || value === null || articleId === '') {
      await this.repository.clearTelegramConversation(identity);
      return { ok: true, value: await this.reply('Sesi ubah artikel rusak. Mulai lagi dari /artikel.') };
    }
    const loaded = await this.loadArticle(actor, shared, articleId); if (!loaded.ok) return loaded;
    const article = loaded.value;
    const updated = await shared.articles.updateArticle(actor, {
      id: article.id, expectedVersion: article.version, regionId: article.regionId, publisherId: article.publisherId,
      categoryId: article.categoryId, authorId: article.authorId, slug: article.slug, title: field === 'title' ? value : article.title,
      body: field === 'body' ? value : article.body, source: field === 'source' ? value : article.source,
      tags: [...article.tags], status: article.status,
    });
    if (!updated.ok) return updated;
    await this.repository.clearTelegramConversation(identity);
    const menu = await this.articleMenu(actor, shared, articleId); if (!menu.ok) return menu;
    return { ok: true, value: { reply: `Artikel diperbarui.\n\n${menu.value.reply}`, ...(menu.value.display === undefined ? {} : { display: menu.value.display }), businessResult: updated.value } };
  }

  private async confirmArchive(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const loaded = await this.loadArticle(actor, shared, articleId); if (!loaded.ok) return loaded;
    const keyboard: TelegramInlineKeyboard = Object.freeze([
      Object.freeze([Object.freeze({ text: '✅ Ya, Arsipkan', data: `tg:a:${articleId}:archyes` }), Object.freeze({ text: '◀️ Kembali', data: `tg:a:${articleId}:menu` })]),
    ]);
    return { ok: true, value: { ...(await this.reply(`Arsipkan "${this.shortTitle(loaded.value.title)}"?\nArtikel arsip keluar dari daftar aktif.`)), display: { keyboard } } };
  }

  private async doArchive(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const loaded = await this.loadArticle(actor, shared, articleId); if (!loaded.ok) return loaded;
    const archived = await shared.articles.archiveArticle(actor, { id: loaded.value.id, expectedVersion: loaded.value.version });
    if (!archived.ok) return archived;
    await this.repository.clearTelegramConversation(identity);
    return { ok: true, value: { ...(await this.reply('Artikel diarsipkan. Buka /artikel untuk daftar terbaru.')), businessResult: archived.value } };
  }

  private async doRestore(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const loaded = await this.loadArticle(actor, shared, articleId); if (!loaded.ok) return loaded;
    const restored = await shared.articles.restoreArticle(actor, { id: loaded.value.id, expectedVersion: loaded.value.version });
    if (!restored.ok) return restored;
    await this.repository.clearTelegramConversation(identity);
    const menu = await this.articleMenu(actor, shared, articleId); if (!menu.ok) return menu;
    return { ok: true, value: { reply: `Artikel dipulihkan ke draf.\n\n${menu.value.reply}`, ...(menu.value.display === undefined ? {} : { display: menu.value.display }), businessResult: restored.value } };
  }

  private async pickArticle(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, action: 'img' | 'sites' | 'sug' | 'pub' | 'edt', prompt: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const recent = [...listed.value.articles].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 8);
    if (recent.length === 0) return { ok: true, value: await this.reply('Belum ada artikel. Ketuk 📝 Buat Artikel di /start untuk menyusun yang pertama.') };
    const keyboard: TelegramInlineKeyboard = Object.freeze(recent.map((article) => Object.freeze([Object.freeze({ text: `▸ ${this.shortTitle(article.title)}`, data: `tg:a:${article.id}:${action}` })])));
    return { ok: true, value: { ...(await this.reply(prompt)), display: { keyboard } } };
  }

  private async pickJob(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, prompt: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const jobs = await shared.publication.listJobs(actor); if (!jobs.ok) return jobs;
    if (jobs.value.length === 0) return { ok: true, value: await this.reply('Belum ada pekerjaan publikasi. Terbitkan artikel lewat /artikel atau /publish.') };
    const keyboard: TelegramInlineKeyboard = Object.freeze(jobs.value.slice(0, 8).map(({ job, articleTitle }) => Object.freeze([Object.freeze({ text: `▸ ${this.shortTitle(articleTitle)}`, data: `tg:j:${job.id}:menu` })])));
    return { ok: true, value: { ...(await this.reply(prompt)), display: { keyboard } } };
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
      const identity = await this.activeIdentity(update.userId, update.chatId);
      if (identity === null) {
        return done(await this.replyOrgPicker(update, bodyDigest, claimed.claim.claimToken, pending, requestId));
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
  private async articleTitle(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<string | null> {
    const listed = await shared.articles.listEditorial(actor);
    if (!listed.ok) return null;
    return listed.value.articles.find((article) => article.id === articleId)?.title ?? null;
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
    return this.showSitePicker(identity, actor, shared, articleId, 'assign');
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
    const lines = active.map(({ normalizedHostname, regionId }) => `${normalizedHostname} [${this.regionLabel(listed.value.regions, regionId)}]`);
    const keyboard: TelegramInlineKeyboard = Object.freeze(active.slice(0, 20).map((site) => Object.freeze([Object.freeze({ text: `▸ ${this.shortTitle(site.normalizedHostname)}`, data: `tg:p:${site.id}:menu` })])));
    return { ok: true, value: { ...(await this.reply(`Portal aktif:\n\n${lines.join('\n')}\n\nKetuk portal untuk detail, atau terbitkan tanpa mengetik lewat /artikel → 🚀 Publikasikan.`)), display: { keyboard } } };
  }
  private async articleMenu(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const article = listed.value.articles.find(({ id }) => id === articleId);
    if (article === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const keyboard: TelegramInlineKeyboard = Object.freeze([
      Object.freeze([Object.freeze({ text: '🖼 Foto', data: `tg:a:${articleId}:img` }), Object.freeze({ text: '🌐 Portal', data: `tg:a:${articleId}:sites` })]),
      Object.freeze([Object.freeze({ text: '🚀 Publikasikan', data: `tg:a:${articleId}:pub` }), Object.freeze({ text: '🚀 Semua Portal', data: `tg:a:${articleId}:puball` })]),
      Object.freeze([Object.freeze({ text: '✏️ Edit', data: `tg:a:${articleId}:edt` }), Object.freeze({ text: '💡 Saran Varian', data: `tg:a:${articleId}:sug` })]),
      Object.freeze([
        article.status === 'archived'
          ? Object.freeze({ text: '♻️ Pulihkan', data: `tg:a:${articleId}:restore` })
          : Object.freeze({ text: '🗄 Arsipkan', data: `tg:a:${articleId}:arch` }),
        Object.freeze({ text: '📄 Daftar', data: 'tg:articles' }),
      ]),
    ]);
    return { ok: true, value: { ...(await this.reply(`${article.title}\nStatus: ${article.status}\n\nPilih aksi:`)), display: { keyboard } } };
  }
  private async startSuggestFlow(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    return this.showSitePicker(identity, actor, shared, articleId, 'suggest');
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
    return { ok: true, value: { ...(await this.reply(`${site.normalizedHostname}\nRegion: ${this.regionLabel(listed.value.regions, site.regionId)}\nStatus: ${site.status}`)), display: { keyboard } } };
  }
  private async publishPicker(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, articleId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
    const article = listed.value.articles.find(({ id }) => id === articleId);
    if (article === undefined) return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    const active = listed.value.sites.filter(({ status }) => status === 'active').slice(0, 20);
    if (active.length === 0) return { ok: true, value: await this.reply('Tidak ada portal aktif yang tersedia.') };
    await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'publish_pick_site', { articleId }));
    const keyboard: TelegramInlineKeyboard = Object.freeze([
      Object.freeze([Object.freeze({ text: '🚀 Semua Portal', data: 'tg:ps:all' })]),
      ...active.map((site) => Object.freeze([Object.freeze({ text: `🚀 ${this.shortTitle(site.normalizedHostname)}`, data: `tg:ps:${site.id}` })])),
    ]);
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
    return { ok: true, value: { ...(await this.reply(`Publikasi ${publication.value.job.state}. Pantau lewat tombol 📊 Status di bawah.`)), businessResult: publication.value, display: { keyboard: this.jobMenuKeyboard(publication.value.job.id) } } };
  }
  private async jobMenu(actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, jobId: string): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const status = await shared.publication.status(actor, { jobId }); if (!status.ok) return status;
    const title = await this.articleTitle(actor, shared, status.value.job.articleId);
    return { ok: true, value: { ...(await this.reply(`"${this.shortTitle(title ?? 'Pekerjaan publikasi')}"\n${this.formatStatusText(status.value)}`)), businessResult: status.value, display: { keyboard: this.jobMenuKeyboard(jobId) } } };
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
    if (parts[1] === 'orgs' && parts.length === 2) {
      return this.showOrgPicker(identity.telegramUserId, identity.telegramChatId);
    }
    if (parts[1] === 'org' && parts.length === 3 && parts[2] !== undefined && parts[2] !== '') {
      return (await this.chooseOrganization(identity.telegramUserId, identity.telegramChatId, parts[2], actor.requestId)) ?? null;
    }
    if (parts[1] === 'rg' && parts.length === 3 && parts[2] !== undefined && parts[2] !== '') {
      return this.pickRegion(identity, actor, shared, parts[2]);
    }
    if (parts[1] === 'ts' && parts.length === 3 && parts[2] !== undefined && parts[2] !== '') {
      if (parts[2] === 'go') return this.confirmSitePick(identity, actor, shared);
      return this.toggleSitePick(identity, actor, shared, parts[2]);
    }
    if (parts[1] === 'a' && parts.length === 4 && parts[2] !== undefined && parts[2] !== '' && parts[3] !== undefined) {
      const articleId = parts[2];
      if (parts[3] === 'menu') return this.articleMenu(actor, shared, articleId);
      if (parts[3] === 'img') return this.startImageFlow(identity, articleId);
      if (parts[3] === 'sites') return this.startSitesFlow(identity, actor, shared, articleId);
      if (parts[3] === 'pub') return this.publishPicker(identity, actor, shared, articleId);
      if (parts[3] === 'puball') return this.publishAll(identity, actor, shared, articleId);
      if (parts[3] === 'edt') return this.editMenu(actor, shared, articleId);
      if (parts[3] === 'et') return this.startEditFlow(identity, articleId, 'title');
      if (parts[3] === 'eb') return this.startEditFlow(identity, articleId, 'body');
      if (parts[3] === 'es') return this.startEditFlow(identity, articleId, 'source');
      if (parts[3] === 'arch') return this.confirmArchive(actor, shared, articleId);
      if (parts[3] === 'archyes') return this.doArchive(identity, actor, shared, articleId);
      if (parts[3] === 'restore') return this.doRestore(identity, actor, shared, articleId);
      if (parts[3] === 'sug') return this.startSuggestFlow(identity, actor, shared, articleId);
      return null;
    }
    if (parts[1] === 'e' && parts.length === 3 && parts[2] === 'yes') {
      return this.confirmEdit(identity, actor, shared);
    }
    if (parts[1] === 'p' && parts.length === 4 && parts[2] !== undefined && parts[2] !== '' && parts[3] === 'menu') {
      return this.portalMenu(actor, shared, parts[2]);
    }
    if (parts[1] === 'ps' && parts.length === 3 && parts[2] !== undefined && parts[2] !== '') {
      if (parts[2] === 'all') {
        const conversation = await this.repository.readTelegramConversation(identity);
        const articleId = conversation?.data.articleId;
        if (conversation === null || conversation.step !== 'publish_pick_site' || typeof articleId !== 'string' || articleId === '') {
          return { ok: true, value: await this.reply('Sesi pemilihan portal kedaluwarsa. Buka /artikel lalu ketuk 🚀 Publikasikan untuk mengulang.') };
        }
        return this.publishAll(identity, actor, shared, articleId);
      }
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
      const values = listed.value.regions.filter(({ status }) => status === 'active').map(({ name }) => name);
      return { ok: true, value: await this.reply(values.length === 0 ? 'Tidak ada Region yang aktif.' : `Region aktif:\n\n${values.join('\n')}`) };
    }
    if (text === '/sites' || text.startsWith('/sites ')) return this.pickArticle(actor, shared, 'sites', 'Pilih artikel untuk diatur portalnya:');
    if (text === '/image' || text.startsWith('/image ')) return this.pickArticle(actor, shared, 'img', 'Pilih artikel untuk ditambah foto:');
    if (text === '/suggest' || text.startsWith('/suggest ')) return this.pickArticle(actor, shared, 'sug', 'Pilih artikel untuk disusun sarannya:');
    if (text === '/publish' || text.startsWith('/publish ')) return this.pickArticle(actor, shared, 'pub', 'Pilih artikel untuk diterbitkan:');
    if (text === '/status' || text.startsWith('/status ')) return this.pickJob(actor, shared, 'Pilih pekerjaan untuk dipantau statusnya:');
    if (text === '/links' || text.startsWith('/links ')) return this.pickJob(actor, shared, 'Pilih pekerjaan untuk dilihat tautannya:');
    if (text === '/retry' || text.startsWith('/retry ')) return this.pickJob(actor, shared, 'Pilih pekerjaan untuk diulang:');
    if (text === '/unpublish' || text.startsWith('/unpublish ')) return this.pickJob(actor, shared, 'Pilih pekerjaan untuk ditarik:');
    if (text === '/edit' || text.startsWith('/edit ')) return this.pickArticle(actor, shared, 'edt', 'Pilih artikel untuk diubah:');
    if (text === '/org') return this.showOrgPicker(identity.telegramUserId, identity.telegramChatId);
    if (text === '/artikel') return this.listArticles(actor, shared);
    if (text === '/cari') return { ok: true, value: await this.reply(CARI_USAGE) };
    if (text === '/suggest') return this.pickArticle(actor, shared, 'sug', 'Pilih artikel untuk disusun sarannya:');
    if (text === '/job') return this.listJobs(actor, shared);
    if (text === '/portal') return this.listPortals(actor, shared);
    if (text === '/article') {
      const listed = await shared.articles.listEditorial(actor); if (!listed.ok) return listed;
      const regions = listed.value.regions.filter(({ status }) => status === 'active');
      if (regions.length === 0) return { ok: true, value: await this.reply('Tidak ada Region yang aktif. Minta administrator menambahkannya dulu.') };
      await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_region', {}));
      const keyboard: TelegramInlineKeyboard = Object.freeze(regions.map((region) => Object.freeze([Object.freeze({ text: `📍 ${this.shortTitle(region.name)}`, data: `tg:rg:${region.id}` })])));
      const lines = regions.map(({ name }, index) => `${index + 1}. ${name}`);
      return { ok: true, value: { ...(await this.reply(`Pilih region untuk artikel baru:\n\n${lines.join('\n')}`)), display: { keyboard } } };
    }
    if (text.startsWith('/cari ')) {
      return this.searchArticles(actor, shared, words(text).slice(1).join(' '));
    }
    const conversation = await this.repository.readTelegramConversation(identity);
    if (conversation === null || new Date(conversation.expiresAt) <= this.clock.now()) return { ok: true, value: await this.reply(UNKNOWN_COMMAND_REPLY) };
    return this.advance(identity, actor, shared, update, conversation);
  }

  private async advance(identity: TelegramIdentity, actor: AuthorizedTenantActorContext, shared: TelegramSharedServices, update: TelegramUpdate, conversation: TelegramConversation): Promise<Result<TelegramWorkflowResult, PublicErrorEnvelope>> {
    const text = update.text?.trim() ?? '';
    if (conversation.step === 'idle') return { ok: true, value: await this.reply(UNKNOWN_COMMAND_REPLY) };
    const next = async (step: TelegramConversation['step'], field: string, value: unknown, reply: string) => { await this.repository.saveTelegramConversation(identity, this.conversation(identity, step, { ...conversation.data, [field]: value })); return { ok: true as const, value: await this.reply(reply) }; };
    if (conversation.step === 'article_region') return { ok: true, value: await this.reply('Ketuk tombol region di atas. /cancel untuk batal.') };
    if (conversation.step === 'article_title') return next('article_body', 'title', text, 'Kirim isi artikel.');
    if (conversation.step === 'article_body') return next('article_source', 'body', text, 'Kirim atribusi sumber.');
    if (conversation.step === 'article_source') return next('article_slug', 'source', text, 'Kirim slug artikel (huruf kecil, tanpa spasi, aman untuk URL).');
    if (conversation.step === 'article_slug') {
      const created = await shared.articles.createArticle(actor, { ...conversation.data, slug: text, publisherId: null, categoryId: null, authorId: null, status: 'draft' });
      if (!created.ok) return created;
      await this.repository.clearTelegramConversation(identity);
      const keyboard: TelegramInlineKeyboard = Object.freeze([
        Object.freeze([Object.freeze({ text: '🚀 Terbitkan ke Semua Portal', data: `tg:a:${created.value.id}:puball` })]),
        Object.freeze([Object.freeze({ text: '🌐 Pilih Portal', data: `tg:a:${created.value.id}:sites` }), Object.freeze({ text: '💡 Saran Varian', data: `tg:a:${created.value.id}:sug` })]),
      ]);
      return { ok: true, value: { ...(await this.reply('Artikel berhasil dibuat. Langsung terbitkan atau atur dulu portalnya:')), businessResult: created.value, display: { keyboard } } };
    }
    if (conversation.step === 'site_pick') {
      return { ok: true, value: await this.reply('Ketuk tombol portal di atas untuk mencentang, lalu ketuk tombol konfirmasi. /cancel untuk batal.') };
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
      return { ok: true, value: await this.reply('Ketuk tombol portal di atas. /cancel untuk batal.') };
    }
    if (conversation.step === 'suggest_sites' || conversation.step === 'article_sites') {
      await this.repository.clearTelegramConversation(identity);
      return { ok: true, value: await this.reply('Alur lama diatur ulang. Buka /artikel lalu pilih aksi bertombol untuk mengulang.') };
    }
    if (conversation.step === 'article_edit') {
      const articleId = typeof conversation.data.articleId === 'string' ? conversation.data.articleId : '';
      const field = conversation.data.field === 'title' || conversation.data.field === 'body' || conversation.data.field === 'source' ? conversation.data.field : null;
      if (articleId === '' || field === null || text === '') {
        return { ok: true, value: await this.reply('Kirim teks baru untuk artikel ini, atau /cancel untuk batal.') };
      }
      await this.repository.saveTelegramConversation(identity, this.conversation(identity, 'article_edit_confirm', { articleId, field, value: text }));
      const label = field === 'title' ? 'judul' : field === 'body' ? 'isi' : 'sumber';
      const keyboard: TelegramInlineKeyboard = Object.freeze([
        Object.freeze([Object.freeze({ text: '✅ Simpan', data: 'tg:e:yes' }), Object.freeze({ text: '✖ Batal', data: 'tg:cancel' })]),
      ]);
      const preview = text.length <= 500 ? text : `${text.slice(0, 500)}…`;
      return { ok: true, value: { ...(await this.reply(`Pratinjau ${label} baru:\n\n${preview}\n\nSimpan perubahan?`)), display: { keyboard } } };
    }
    if (conversation.step === 'article_edit_confirm') {
      return { ok: true, value: await this.reply('Ketuk ✅ Simpan untuk menyimpan, atau /cancel untuk batal.') };
    }
    await this.repository.clearTelegramConversation(identity); return { ok: true, value: await this.reply('Percakapan diatur ulang. Mulai lagi dengan /article.') };
  }
}

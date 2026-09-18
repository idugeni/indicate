import type { AuthorizedTenantActorContext, HostnameContext } from '@/core/operation-context';
import { buildStructuredObjectKey, buildThumbObjectKey } from '@/modules/publishing/object-key';
import type { MediaAssetRecord } from '@/modules/publishing/models';
import type { IdentifierGenerator } from '@/core/system/ports';
import type { ExactObjectAuthorization, ObjectStoragePort } from '@/integrations/storage/ports';
import { PublishingAccessDeniedError, PublishingConflictError, PublishingSubscriptionInactiveError, type PublishingRepository } from '@/modules/publishing/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import { sanitizeError } from '@/core/security/redaction';
import type { Result } from '@/core/result';
import { mediaArchiveSchema, mediaCompletionSchema, mediaReadSchema, mediaReservationSchema } from '@/modules/publishing/schemas';

interface ClockLike { now(): Date }
export interface MediaPolicy {
  readonly maxBytes: number;
  readonly allowedTypes: readonly string[];
  readonly uploadTtlSeconds: number;
  readonly readTtlSeconds: number;
  readonly reservationAttempts?: number;
}
export interface UploadReservationResult {
  readonly reservationId: string;
  readonly objectKey: string;
  readonly authorization: ExactObjectAuthorization;
  /** Present only when the client declared a thumbnail variant. */
  readonly thumb: {
    readonly objectKey: string;
    readonly authorization: ExactObjectAuthorization;
  } | null;
}

export class MediaService {
  constructor(
    private readonly repository: PublishingRepository,
    private readonly storage: ObjectStoragePort,
    private readonly identifiers: IdentifierGenerator,
    private readonly policy: MediaPolicy,
    private readonly clock: ClockLike = { now: () => new Date() },
  ) {}

  private async denied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<Result<never, PublicErrorEnvelope>> {
    try { await this.repository.recordDenial(actor, action, targetType, this.clock.now().toISOString()); } catch { /* preserve the non-disclosing external boundary */ }
    return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
  }
  private failure(actor: AuthorizedTenantActorContext): Result<never, PublicErrorEnvelope> { return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The media operation could not be completed.', actor.requestId) }; }

  async reserveUpload(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<UploadReservationResult, PublicErrorEnvelope>> {
    const parsed = mediaReservationSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', actor.requestId) };
    const value = parsed.data;
    if (value.owner.kind === 'organization' && actor.regionScopeId !== undefined && actor.regionScopeId !== null) {
      return this.denied(actor, 'media.upload.reserve.denied', 'media');
    }
    if (!this.policy.allowedTypes.includes(value.mediaType) || value.sizeBytes > this.policy.maxBytes) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', actor.requestId, {
        ...(this.policy.allowedTypes.includes(value.mediaType) ? {} : { mediaType: ['Unsupported media type.'] }),
        ...(value.sizeBytes <= this.policy.maxBytes ? {} : { sizeBytes: ['Media exceeds the configured size limit.'] }),
      }) };
    }
    const attempts = Math.max(1, Math.min(20, this.policy.reservationAttempts ?? 8));
    try {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const now = this.clock.now(); const reservationId = this.identifiers.create();
        const key = buildStructuredObjectKey(value.owner, value.filename, this.identifiers.create());
        const result = await this.repository.reserveMediaCandidate(actor, {
          reservationId, objectKey: key, owner: value.owner, purpose: value.purpose, expectedMediaType: value.mediaType,
          expectedSizeBytes: value.sizeBytes, expectedChecksum: value.checksum,
          expiresAt: new Date(now.getTime() + this.policy.uploadTtlSeconds * 1_000).toISOString(), now: now.toISOString(),
        });
        if (result.kind === 'occupied') continue;
        const existing = await this.storage.headExact(key);
        if (existing !== null) { await this.repository.markReservationOccupied(actor, reservationId, now.toISOString()); continue; }
        try {
          const authorization = await this.storage.authorizeExactPut(key, value.mediaType, value.checksum, this.policy.uploadTtlSeconds);
          let thumb: UploadReservationResult['thumb'] = null;
          if (value.thumb !== undefined) {
            const thumbKey = buildThumbObjectKey(key);
            const thumbAuthorization = await this.storage.authorizeExactPut(thumbKey, value.thumb.mediaType, value.thumb.checksum, this.policy.uploadTtlSeconds);
            thumb = { objectKey: thumbKey, authorization: thumbAuthorization };
          }
          return { ok: true, value: Object.freeze({ reservationId, objectKey: key, authorization, thumb }) };
        } catch (error) {
          await this.repository.markReservationOccupied(actor, reservationId, now.toISOString());
          void sanitizeError(error);
          return this.failure(actor);
        }
      }
      return { ok: false, error: createPublicError('CONFLICT', 'A unique media key could not be reserved.', actor.requestId) };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'media.upload.reserve.denied', 'media');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat mengunggah media.', actor.requestId) };
      return this.failure(actor);
    }
  }

  /**
   * Complete a reserved upload after verifying the stored object.
   *
   * @remarks Thumbnail is best-effort: a missing or mismatched variant never blocks activation of the verified full object.
   */
  async completeUpload(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<MediaAssetRecord, PublicErrorEnvelope>> {
    const parsed = mediaCompletionSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Invalid upload completion.', actor.requestId) };
    try {
      const reservation = await this.repository.readReservation(actor, parsed.data.reservationId);
      if (reservation === null || reservation.status !== 'reserved' || new Date(reservation.expiresAt) < this.clock.now()) return this.denied(actor, 'media.upload.complete.denied', 'media');
      const metadata = await this.storage.headExact(reservation.objectKey);
      const valid = metadata !== null && metadata.contentType === reservation.expectedMediaType
        && metadata.contentLength === reservation.expectedSizeBytes && metadata.checksum !== null
        && metadata.checksum === reservation.expectedChecksum;
      if (!valid || metadata === null || metadata.checksum === null) {
        await this.repository.rejectMedia(actor, reservation.id, 'uploaded_metadata_mismatch', this.clock.now().toISOString());
        return { ok: false, error: createPublicError('INVALID_INPUT', 'Uploaded object metadata does not match the authorization.', actor.requestId) };
      }
      let thumbObjectKey: string | null = null;
      if (parsed.data.thumb !== undefined) {
        const candidate = buildThumbObjectKey(reservation.objectKey);
        const thumbMeta = await this.storage.headExact(candidate);
        if (thumbMeta !== null && thumbMeta.contentLength === parsed.data.thumb.sizeBytes && thumbMeta.checksum !== null && thumbMeta.checksum === parsed.data.thumb.checksum) {
          thumbObjectKey = candidate;
        }
      }
      return { ok: true, value: await this.repository.activateMedia(actor, { reservationId: reservation.id, mediaId: this.identifiers.create(), mediaType: metadata.contentType, sizeBytes: metadata.contentLength, checksum: metadata.checksum, thumbObjectKey, now: this.clock.now().toISOString() }) };
    } catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'media.upload.complete.denied', 'media');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat mengunggah media.', actor.requestId) };
      return this.failure(actor);
    }
  }

  async list(actor: AuthorizedTenantActorContext): Promise<Result<readonly MediaAssetRecord[], PublicErrorEnvelope>> {
    try { return { ok: true, value: await this.repository.listMedia(actor) }; }
    catch (error) { return error instanceof PublishingAccessDeniedError ? this.denied(actor, 'media.list.denied', 'media') : this.failure(actor); }
  }

  async authorizeTenantRead(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<ExactObjectAuthorization, PublicErrorEnvelope>> {
    const parsed = mediaReadSchema.safeParse(raw); if (!parsed.success) return this.denied(actor, 'media.access.denied', 'media');
    try {
      const media = await this.repository.authorizeTenantMedia(actor, parsed.data.mediaId); if (media === null) return this.denied(actor, 'media.access.denied', 'media');
      return { ok: true, value: await this.storage.authorizeExactGet(media.objectKey, this.policy.readTtlSeconds) };
    } catch (error) { return error instanceof PublishingAccessDeniedError ? this.denied(actor, 'media.access.denied', 'media') : this.failure(actor); }
  }

  async authorizePublicRead(context: HostnameContext, mediaId: string, requestId: string): Promise<Result<ExactObjectAuthorization, PublicErrorEnvelope>> {
    try {
      const media = await this.repository.authorizePublicMedia(context, mediaId, requestId); if (media === null) return { ok: false, error: createNonDisclosingDenial(requestId) };
      return { ok: true, value: await this.storage.authorizeExactGet(media.objectKey, this.policy.readTtlSeconds) };
    } catch { return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The media operation could not be completed.', requestId) }; }
  }

  async archive(actor: AuthorizedTenantActorContext, raw: unknown): Promise<Result<MediaAssetRecord, PublicErrorEnvelope>> {
    const parsed = mediaArchiveSchema.safeParse(raw); if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Invalid media archive request.', actor.requestId) };
    try { return { ok: true, value: await this.repository.archiveMedia(actor, parsed.data.mediaId, parsed.data.expectedVersion, this.clock.now().toISOString()) }; }
    catch (error) {
      if (error instanceof PublishingAccessDeniedError) return this.denied(actor, 'media.archive.denied', 'media');
      if (error instanceof PublishingSubscriptionInactiveError) return { ok: false, error: createPublicError('FORBIDDEN', 'Langganan tidak aktif. Hubungi administrator agar dapat mengarsipkan media.', actor.requestId) };
      if (error instanceof PublishingConflictError) return { ok: false, error: createPublicError('CONFLICT', 'The media record was changed by another operation.', actor.requestId) };
      return this.failure(actor);
    }
  }
}

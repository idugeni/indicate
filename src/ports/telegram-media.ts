import type { ExactObjectAuthorization } from '@/ports/object-storage';

export interface PreparedTelegramMedia {
  readonly bytes: ArrayBuffer;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}

export interface TelegramMediaTransferPort {
  prepare(input: { readonly fileId: string; readonly expectedSize: number }): Promise<PreparedTelegramMedia>;
  transfer(input: {
    readonly media: PreparedTelegramMedia;
    readonly authorization: ExactObjectAuthorization;
    readonly mediaType: string;
  }): Promise<void>;
}

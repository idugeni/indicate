export type AccessKeyStatus = 'active' | 'revoked' | 'expired';

export interface AccessKeyRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly lookupId: string;
  readonly name: string;
  readonly status: AccessKeyStatus;
  readonly expiresAt: string | null;
  readonly lastUsedAt: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StoredAccessKey extends AccessKeyRecord {
  readonly salt: string;
  readonly verificationHash: string;
}

/**
 * Strip secret material before leaving the server boundary.
 *
 * @param value - Stored row including scrypt salt and hash.
 * @returns Public projection safe for dashboard responses.
 */
export function publicAccessKeyRecord(value: StoredAccessKey): AccessKeyRecord {
  return {
    id: value.id,
    organizationId: value.organizationId,
    userId: value.userId,
    lookupId: value.lookupId,
    name: value.name,
    status: value.status,
    expiresAt: value.expiresAt,
    lastUsedAt: value.lastUsedAt,
    version: value.version,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export interface IssuedAccessKey {
  readonly key: AccessKeyRecord;
  readonly plaintext: string;
}

import { describe, expect, it } from 'vitest';

import { isOwnedAvatarObjectKey } from './route-helpers';

describe('isOwnedAvatarObjectKey', () => {
  it('allows an object under the authenticated user namespace', () => {
    expect(isOwnedAvatarObjectKey('avatars/user-1/avatar.webp', 'user-1')).toBe(true);
  });

  it('rejects objects owned by another user', () => {
    expect(isOwnedAvatarObjectKey('avatars/user-2/avatar.webp', 'user-1')).toBe(false);
  });

  it('rejects keys outside the avatar namespace and prefix lookalikes', () => {
    expect(isOwnedAvatarObjectKey('o/org-1/article/1/cover.webp', 'user-1')).toBe(false);
    expect(isOwnedAvatarObjectKey('avatars/user-10/avatar.webp', 'user-1')).toBe(false);
    expect(isOwnedAvatarObjectKey('avatars/user-1-evil/avatar.webp', 'user-1')).toBe(false);
  });
});

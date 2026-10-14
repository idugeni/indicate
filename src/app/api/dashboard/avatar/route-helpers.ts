/** Return true only for an avatar object stored in the authenticated user's namespace. */
export function isOwnedAvatarObjectKey(objectKey: string, localUserId: string): boolean {
  return objectKey.startsWith(`avatars/${localUserId}/`);
}

import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { NextCacheInvalidationPort } from '@/ports/cache-invalidation';

export class NextCacheInvalidationAdapter implements NextCacheInvalidationPort {
  async revalidateTags(tags: readonly string[]) { for (const tag of tags) revalidateTag(tag, 'max'); }
  async revalidatePaths(paths: readonly string[]) { for (const path of paths) revalidatePath(path); }
}

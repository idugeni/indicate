import { randomUUID } from 'node:crypto';

import type { IdentifierGenerator } from '@/core/system/ports';

export class UuidGenerator implements IdentifierGenerator {
  create(): string {
    return randomUUID();
  }
}

import { randomUUID } from 'node:crypto';

import type { IdentifierGenerator } from '@/ports/identifier-generator';

export class UuidGenerator implements IdentifierGenerator {
  create(): string {
    return randomUUID();
  }
}

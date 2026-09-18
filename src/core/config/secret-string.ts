import 'server-only';

import { timingSafeEqual } from 'node:crypto';

/** Opaque server-only secret wrapper: private field, no JSON/string coercion, redacted inspect. Not a substitute for secret-output scanning. */
export class SecretString {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  static fromPlain(value: string): SecretString {
    return new SecretString(value);
  }

  /**
   * Compare secret against a plaintext candidate.
   *
   * @remarks Same-length timing uniformity: compare zero-length buffers when lengths differ.
   */
  equalsPlain(candidate: string): boolean {
    const left = Buffer.from(this.#value);
    const right = Buffer.from(candidate);
    if (left.length !== right.length) {
      timingSafeEqual(Buffer.from([0]), Buffer.from([0]));
      return false;
    }
    return timingSafeEqual(left, right);
  }

  get label(): 'redacted' {
    return 'redacted';
  }

  /** Server-only access for provider/database construction; never logs, responses, cache, client bundles, or errors. */
  reveal(): string {
    return this.#value;
  }

  toJSON(): never {
    throw new Error('SecretString must not be serialized to JSON');
  }

  toString(): never {
    throw new Error('SecretString must not be converted to a string');
  }

  [Symbol.toPrimitive](): never {
    throw new Error('SecretString must not be coerced to a primitive');
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'SecretString(redacted)';
  }
}
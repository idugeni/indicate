import { createHash } from 'node:crypto';

export interface ReviewedMigration {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly tag: string;
}

const sha256 = (digest: string) => `sha256:${digest}`;

export const REVIEWED_MIGRATION_MANIFEST: readonly ReviewedMigration[] = Object.freeze([
  { version: 1, name: 'stage2_core_schema', checksum: sha256('764efddc6939f7f70b9b4785d34bd2c8fb9446a7776882a4f9a39258e0370c19'), tag: '0000_stage2_core_schema' },
  { version: 2, name: 'stage2_security', checksum: sha256('d187379d73d8530491c07291e03645d966c3502fd59003ee3d081487ccc33612'), tag: '0001_stage2_security' },
  { version: 3, name: 'stage2_publisher_actor_constraints', checksum: sha256('b65dea61b09170247f44aacbe52d3a7c6687495b1e2318394635a0ee17fe004e'), tag: '0002_stage2_publisher_actor_constraints' },
  { version: 4, name: 'stage2_authorization_hardening', checksum: sha256('d636b41314ba61c3ef3c886b01a6ef9e020614914cb8a752055167a6095dfc33'), tag: '0003_stage2_authorization_hardening' },
  { version: 5, name: 'stage3_verified_user_context', checksum: sha256('ad79ad7685de14a73868c2403a78c6a5d3e495da33737bc98f197b18fe8219df'), tag: '0004_stage3_verified_user_context' },
  { version: 6, name: 'stage3_discovery_outcome_timestamp', checksum: sha256('10883f849abef3ddb2fcddd5a220f341203bdcf4485b7091f6f94d986071473c'), tag: '0005_stage3_discovery_outcome_timestamp' },
  { version: 7, name: 'stage4_media_publication_runtime', checksum: sha256('7390ee7325ab9676609742ec9945df0964c3e96f6a7f075d35d61dd9b7c824f8'), tag: '0006_stage4_media_publication_runtime' },
  { version: 8, name: 'stage5_public_delivery', checksum: sha256('e36dc3ee32ca440b97f0a0e6692b6e05b30206dd57cef78e16a69159f251b7dd'), tag: '0007_stage5_public_delivery' },
  { version: 9, name: 'stage5_production_boundaries', checksum: sha256('70bd40399a4cf9758e9570c534420fc51cc3e87d2d3117503d9328f827540159'), tag: '0008_stage5_production_boundaries' },
  { version: 10, name: 'stage6_external_entrypoints', checksum: sha256('cb5c138af7c4182294bc54aee08134315c3e86517606ed462c254904f30d1ecd'), tag: '0009_stage6_external_entrypoints' },
  { version: 11, name: 'stage6_security_hardening', checksum: sha256('8d33e5da644155416d28567a3992444834bb88613ab3c3457e8fca231fcebf96'), tag: '0010_stage6_security_hardening' },
  { version: 12, name: 'stage6_strict_platform_authorization', checksum: sha256('0e9e078d1aec2aec90325ac809cc77aa99c62710322547b35be8191a1079042a'), tag: '0011_stage6_strict_platform_authorization' },
  { version: 13, name: 'stage7_readiness_discovery', checksum: sha256('0fc0a7777f7e96a3dc1167b2f897fe3ca983c45d347352b2fa7fb532aca63993'), tag: '0012_stage7_readiness_discovery' },
  { version: 14, name: 'stage7_migration_body_digests', checksum: sha256('81a82af6942df1ae906d6e3b76d4bd9906dfc5efb65cd30cb8e2aabd372c91a3'), tag: '0013_stage7_migration_body_digests' },
].map((entry) => Object.freeze(entry)));

const SELF_CHECKSUM_SENTINEL = '__INDICATE_MIGRATION_SELF_CHECKSUM_V1__';
const CORE_MIGRATION_IDENTITY = { version: 1, name: 'stage2_core_schema' } as const;

type MigrationIdentity = Pick<ReviewedMigration, 'version' | 'name'>;

interface SqlToken {
  readonly type: 'word' | 'number' | 'string' | 'symbol';
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

interface SqlStatement {
  readonly start: number;
  readonly text: string;
}

function skipSqlNonCode(content: string, index: number): number | null {
  if (content.startsWith('--', index)) {
    const newline = content.indexOf('\n', index + 2);
    return newline < 0 ? content.length : newline + 1;
  }
  if (content.startsWith('/*', index)) {
    let depth = 1;
    let cursor = index + 2;
    while (cursor < content.length && depth > 0) {
      if (content.startsWith('/*', cursor)) {
        depth += 1;
        cursor += 2;
      } else if (content.startsWith('*/', cursor)) {
        depth -= 1;
        cursor += 2;
      } else {
        cursor += 1;
      }
    }
    if (depth !== 0) throw new Error('migration_body_invalid:unterminated_block_comment');
    return cursor;
  }
  const quote = content[index];
  if (quote === "'" || quote === '"') {
    let cursor = index + 1;
    while (cursor < content.length) {
      if (content[cursor] === quote) {
        if (content[cursor + 1] === quote) {
          cursor += 2;
          continue;
        }
        return cursor + 1;
      }
      cursor += 1;
    }
    throw new Error('migration_body_invalid:unterminated_quote');
  }
  const dollarTag = content.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/u)?.[0];
  if (dollarTag !== undefined) {
    const closing = content.indexOf(dollarTag, index + dollarTag.length);
    if (closing < 0) throw new Error('migration_body_invalid:unterminated_dollar_quote');
    return closing + dollarTag.length;
  }
  return null;
}

function findStatementEnd(content: string, start: number): number {
  let cursor = start;
  while (cursor < content.length) {
    const skipped = skipSqlNonCode(content, cursor);
    if (skipped !== null) {
      cursor = skipped;
      continue;
    }
    if (content[cursor] === ';') return cursor + 1;
    cursor += 1;
  }
  throw new Error('migration_body_invalid:unterminated_insert');
}

function registrationStatements(content: string): readonly SqlStatement[] {
  const statements: SqlStatement[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    const skipped = skipSqlNonCode(content, cursor);
    if (skipped !== null) {
      cursor = skipped;
      continue;
    }
    const insert = content.slice(cursor).match(/^INSERT\b/iu)?.[0];
    if (insert !== undefined) {
      const end = findStatementEnd(content, cursor + insert.length);
      const text = content.slice(cursor, end);
      if (/^INSERT\s+INTO\s+(?:public\s*\.\s*)?indicate_schema_migrations\b/iu.test(text)) {
        statements.push({ start: cursor, text });
      }
      cursor = end;
      continue;
    }
    cursor += 1;
  }
  return statements;
}

function tokenizeRegistration(statement: string): readonly SqlToken[] {
  const tokens: SqlToken[] = [];
  let cursor = 0;
  while (cursor < statement.length) {
    const character = statement[cursor]!;
    if (/\s/u.test(character)) {
      cursor += 1;
      continue;
    }
    if (statement.startsWith('--', cursor) || statement.startsWith('/*', cursor)) {
      cursor = skipSqlNonCode(statement, cursor) ?? cursor + 1;
      continue;
    }
    if (character === "'") {
      const start = cursor;
      let value = '';
      cursor += 1;
      while (cursor < statement.length) {
        if (statement[cursor] === "'") {
          if (statement[cursor + 1] === "'") {
            value += "'";
            cursor += 2;
            continue;
          }
          cursor += 1;
          tokens.push({ type: 'string', value, start, end: cursor });
          break;
        }
        value += statement[cursor];
        cursor += 1;
      }
      if (tokens.at(-1)?.start !== start) throw new Error('migration_registration_invalid:unterminated_string');
      continue;
    }
    const word = statement.slice(cursor).match(/^[A-Za-z_][A-Za-z0-9_$]*/u)?.[0];
    if (word !== undefined) {
      tokens.push({ type: 'word', value: word.toLowerCase(), start: cursor, end: cursor + word.length });
      cursor += word.length;
      continue;
    }
    const number = statement.slice(cursor).match(/^\d+/u)?.[0];
    if (number !== undefined) {
      tokens.push({ type: 'number', value: number, start: cursor, end: cursor + number.length });
      cursor += number.length;
      continue;
    }
    if ('(),.;=*'.includes(character)) {
      tokens.push({ type: 'symbol', value: character, start: cursor, end: cursor + 1 });
      cursor += 1;
      continue;
    }
    throw new Error('migration_registration_invalid:unsupported_token');
  }
  return tokens;
}

function canonicalizeRegistration(
  normalized: string,
  statement: SqlStatement,
  migration: MigrationIdentity,
): string {
  const tokens = tokenizeRegistration(statement.text);
  let cursor = 0;
  const consume = (type: SqlToken['type'], value?: string): SqlToken => {
    const token = tokens[cursor];
    if (token?.type !== type || (value !== undefined && token.value !== value)) {
      throw new Error('migration_registration_invalid:unexpected_structure');
    }
    cursor += 1;
    return token;
  };

  consume('word', 'insert');
  consume('word', 'into');
  if (tokens[cursor]?.type === 'word' && tokens[cursor]?.value === 'public') {
    cursor += 1;
    consume('symbol', '.');
  }
  consume('word', 'indicate_schema_migrations');
  consume('symbol', '(');
  consume('word', 'version');
  consume('symbol', ',');
  consume('word', 'name');
  consume('symbol', ',');
  consume('word', 'checksum');
  consume('symbol', ')');
  consume('word', 'values');

  const matchingChecksums: SqlToken[] = [];
  do {
    consume('symbol', '(');
    const version = consume('number');
    consume('symbol', ',');
    const name = consume('string');
    consume('symbol', ',');
    const checksum = consume('string');
    consume('symbol', ')');
    if (Number(version.value) === migration.version && name.value === migration.name) {
      matchingChecksums.push(checksum);
    }
    if (tokens[cursor]?.value !== ',') break;
    cursor += 1;
  } while (true);

  if (tokens[cursor]?.type === 'word' && tokens[cursor]?.value === 'on') {
    while (tokens[cursor]?.value !== ';' && cursor < tokens.length) cursor += 1;
  }
  consume('symbol', ';');
  if (cursor !== tokens.length) throw new Error('migration_registration_invalid:trailing_tokens');
  if (matchingChecksums.length !== 1) throw new Error('migration_registration_invalid:self_row_not_unique');

  const checksum = matchingChecksums[0]!;
  if (!/^[a-z0-9][a-z0-9:_-]*$/u.test(checksum.value)) {
    throw new Error('migration_registration_invalid:checksum_literal');
  }
  const checksumStart = statement.start + checksum.start + 1;
  const checksumEnd = statement.start + checksum.end - 1;
  return `${normalized.slice(0, checksumStart)}${SELF_CHECKSUM_SENTINEL}${normalized.slice(checksumEnd)}`;
}

/**
 * Canonical migration body: normalize CRLF to LF and hash the entire migration,
 * replacing only the checksum literal in the migration's unique self-registration
 * row with a stable sentinel. Migration 0000 has no registration and is hashed in
 * full. Missing, malformed, or duplicate required registrations fail closed.
 */
export function canonicalMigrationBody(content: string, migration: MigrationIdentity): string {
  const normalized = content.replaceAll('\r\n', '\n');
  const registrations = registrationStatements(normalized);
  if (migration.version === CORE_MIGRATION_IDENTITY.version && migration.name === CORE_MIGRATION_IDENTITY.name) {
    if (registrations.length !== 0) throw new Error('migration_registration_invalid:unexpected_core_registration');
    return normalized;
  }
  if (registrations.length !== 1) throw new Error('migration_registration_invalid:not_unique');
  return canonicalizeRegistration(normalized, registrations[0]!, migration);
}

export function migrationBodyChecksum(content: string, migration: MigrationIdentity): string {
  return sha256(createHash('sha256').update(canonicalMigrationBody(content, migration), 'utf8').digest('hex'));
}

export function matchesReviewedMigrationManifest(
  applied: readonly Pick<ReviewedMigration, 'version' | 'name' | 'checksum'>[],
): boolean {
  return applied.length === REVIEWED_MIGRATION_MANIFEST.length
    && REVIEWED_MIGRATION_MANIFEST.every((expected, index) => {
      const actual = applied[index];
      return actual?.version === expected.version
        && actual.name === expected.name
        && actual.checksum === expected.checksum;
    });
}

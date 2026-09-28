import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

const REF = 'cmqipmerhfpfqoeasibs';
const SCRIPT = 'scripts/check-bootstrap-identity.mjs';

function run(...args: readonly string[]): { code: number; out: string } {
  try {
    return { code: 0, out: execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' }) };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { code: failure.status ?? 1, out: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

describe('check-bootstrap-identity', () => {
  it('menerima kedua bentuk yang diizinkan guard', () => {
    const pooler = run('--ref', REF, '--supabase-url', `https://${REF}.supabase.co`, '--pool', `postgresql://indicate_runtime.${REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`, '--direct', `postgresql://postgres.${REF}:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`);
    expect(pooler.code).toBe(0);
    expect(pooler.out).toContain('would pass');

    const direct = run('--ref', REF, '--pool', `postgresql://indicate_runtime.${REF}:pw@db.${REF}.supabase.co:5432/postgres`, '--direct', `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`);
    expect(direct.code).toBe(0);
  });

  it('menolak pooler tanpa ref di username walau password memuat ref', () => {
    const result = run('--ref', REF, '--pool', `postgresql://postgres:pw-${REF}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`, '--direct', `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`);
    expect(result.code).toBe(1);
    expect(result.out).toContain('pooler username must be');
  });

  it('menolak ref project lain, username kosong, dan host asing', () => {
    const foreign = run('--ref', REF, '--pool', `postgresql://postgres.zyxwvuts9876:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`, '--direct', `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`);
    expect(foreign.code).toBe(1);

    const emptyUser = run('--ref', REF, '--pool', `postgresql://:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`, '--direct', `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`);
    expect(emptyUser.code).toBe(1);

    const foreignHost = run('--ref', REF, '--pool', `postgresql://indicate_runtime.${REF}:pw@db.${REF}.supabase.co:5432/postgres`, '--direct', `postgresql://postgres:pw@db.other.supabase.co:5432/postgres`);
    expect(foreignHost.code).toBe(1);
  });

  it('menolak NEXT_PUBLIC_SUPABASE_URL project lain', () => {
    const result = run('--ref', REF, '--supabase-url', 'https://zyxwvuts9876.supabase.co', '--pool', `postgresql://indicate_runtime.${REF}:pw@db.${REF}.supabase.co:5432/postgres`, '--direct', `postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`);
    expect(result.code).toBe(1);
    expect(result.out).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('tidak pernah mencetak password', () => {
    const secret = 'zzTOP-SECRET-PASSWORD-zz';
    const result = run('--ref', REF, '--pool', `postgresql://indicate_runtime.${REF}:${secret}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`, '--direct', `postgresql://postgres:${secret}@db.${REF}.supabase.co:5432/postgres`);
    expect(result.out).not.toContain(secret);
  });

  it('menolak input yang tidak lengkap', () => {
    expect(run('--ref', REF, '--pool', 'postgresql://a:b@c:5432/d').code).toBe(2);
    expect(run('--pool', 'postgresql://a:b@c:5432/d', '--direct', 'postgresql://a:b@c:5432/d').code).toBe(2);
  });
});

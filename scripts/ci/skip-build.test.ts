import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ci', 'skip-build.sh');
const SUITE = path.join(REPO_ROOT, 'scripts', 'ci', 'skip-build.test.sh');

/** Shell that resolves GNU coreutils, which the script's `grep -vE` requires. */
const GIT_USR_BIN = 'C:/Program Files/Git/usr/bin';
const SHELL = process.platform === 'win32' ? `${GIT_USR_BIN}/sh.exe` : '/bin/sh';

/**
 * Environment for the child shell.
 *
 * @remarks Git's `sh` inherits `PATH` rather than prepending its own
 * `usr/bin`, so on a host where Windows ships a non-GNU `grep` the child
 * resolves that one instead and every `grep -vE` exits on usage. Prepending
 * `usr/bin` is what makes the contract suite actually execute here.
 */
function childEnv(): NodeJS.ProcessEnv {
  if (process.platform !== 'win32') return process.env;
  return { ...process.env, PATH: `${GIT_USR_BIN};C:/Program Files/Git/mingw64/bin;${process.env.PATH ?? ''}` };
}

function runSuite(): { status: number | null; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(SHELL, [SUITE], { cwd: REPO_ROOT, encoding: 'utf8', env: childEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const failure = error as { status?: number | null; stdout?: string; stderr?: string };
    return { status: failure.status ?? null, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

describe('Vercel ignored build step', () => {
  it('has both the gate and its contract test on disk', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    expect(existsSync(SUITE)).toBe(true);
  });

  it(
    'skips a build only for a resolvable docs-only diff, and builds on every doubt',
    // The suite creates nine throwaway repositories, which costs about three
    // seconds alone and noticeably more when the whole suite runs in parallel.
    () => {
      const result = runSuite();
      // Status 2 means the suite refused to run because this host has no
      // GNU-compatible grep. That is an environment fact, not a contract
      // violation, so it is reported rather than asserted.
      if (result.status === 2) {
        expect(result.stderr).toContain('no GNU-compatible grep');
        return;
      }
      const report = `${result.stdout}\n${result.stderr}`;
      expect(report).not.toContain('FAIL');
      // Assert the cases actually ran, so a suite that silently skipped its
      // body cannot pass this test.
      expect(report).toMatch(/\d+ passed, 0 failed/);
      expect(report).toContain('previous SHA unset on a docs-only push');
      expect(report).toContain('docs-only tip over an undeployed code change');
      expect(result.status).toBe(0);
    },
    60_000,
  );
});

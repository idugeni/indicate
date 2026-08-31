import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '../..');
const releaseScript = join(projectRoot, 'scripts/run-stage7-release.mjs');
const helperUrl = pathToFileURL(join(projectRoot, 'scripts/stage7-evidence-directory.mjs')).href;
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const path of temporaryRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

function runRelease(configuredPath: string) {
  return spawnSync(process.execPath, [releaseScript], {
    cwd: projectRoot,
    env: { ...process.env, STAGE7_EVIDENCE_DIR: configuredPath },
    encoding: 'utf8',
  });
}

describe('Stage 7 release evidence containment', () => {
  it.each(['.', '..', '../outside', '.stage7-evidence/../outside'])('rejects root, ancestor, and traversal path %s before running a gate', (configuredPath) => {
    const result = runRelease(configuredPath);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/stage7_evidence_path_/u);
    expect(`${result.stdout}${result.stderr}`).not.toContain('[stage7] runtime-config: running');
  });

  it('rejects absolute evidence paths before running a gate', () => {
    const result = runRelease(tmpdir());
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain('stage7_evidence_path_must_be_relative');
    expect(`${result.stdout}${result.stderr}`).not.toContain('[stage7] runtime-config: running');
  });

  it('rejects a symlink component without touching its external target', () => {
    const external = mkdtempSync(join(tmpdir(), 'indicate-stage7-external-'));
    temporaryRoots.push(external);
    const marker = join(external, 'marker.txt');
    writeFileSync(marker, 'preserved');
    const evidenceRoot = join(projectRoot, '.stage7-evidence');
    mkdirSync(evidenceRoot, { recursive: true });
    const linkName = `escape-${crypto.randomUUID()}`;
    const link = join(evidenceRoot, linkName);
    symlinkSync(external, link, 'dir');
    try {
      const result = runRelease(`.stage7-evidence/${linkName}`);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('stage7_evidence_symlink_rejected');
      expect(readFileSync(marker, 'utf8')).toBe('preserved');
    } finally {
      rmSync(link, { force: true });
    }
  });

  it('removes only known evidence artifacts and preserves unrelated files', () => {
    const repository = mkdtempSync(join(tmpdir(), 'indicate-stage7-repository-'));
    temporaryRoots.push(repository);
    const evidence = join(repository, '.stage7-evidence', 'run');
    mkdirSync(evidence, { recursive: true });
    writeFileSync(join(evidence, 'quality-diagnostics.json'), 'stale');
    writeFileSync(join(evidence, 'unrelated.txt'), 'preserved');
    const program = `import { prepareStage7EvidenceDirectory } from ${JSON.stringify(helperUrl)}; await prepareStage7EvidenceDirectory(process.argv[1], '.stage7-evidence/run');`;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program, repository], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(() => readFileSync(join(evidence, 'quality-diagnostics.json'))).toThrow();
    expect(readFileSync(join(evidence, 'unrelated.txt'), 'utf8')).toBe('preserved');
  });
});

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { APPLICATION_HOST, DNS_AUTHORITY, SHARED_RESOURCES } from '@/infrastructure/deployment/topology';
import { createValidRuntimeEnvironment } from '../helpers/runtime-environment';

const projectRoot = resolve(import.meta.dirname, '../..');

describe('Stage 1 policy integration', () => {
  it.each([
    'scripts/check-dependency-policy.mjs',
    'scripts/check-import-boundaries.mjs',
    'scripts/check-deployment-policy.mjs',
    'scripts/check-client-secrets.mjs',
  ])('passes %s', (script) => {
    expect(() => execFileSync(process.execPath, [script], { cwd: projectRoot, stdio: 'pipe' })).not.toThrow();
  });

  it('keeps typed topology aligned with the deployable contract', () => {
    const contract = JSON.parse(readFileSync(resolve(projectRoot, 'deployment/stage1-contract.json'), 'utf8')) as {
      resources: Record<string, number | boolean>;
      cloudflare: { authoritativeNameservers: boolean };
      vercel: { domainAssociation: string; nameserverTransferAllowed: boolean; wildcardRegistrationAllowed: boolean };
    };
    expect(SHARED_RESOURCES).toHaveLength(8);
    expect(SHARED_RESOURCES.every((resource) => resource.count === 1 && !resource.tenantScoped)).toBe(true);
    expect(DNS_AUTHORITY.provider).toBe('cloudflare');
    expect(contract.cloudflare.authoritativeNameservers).toBe(true);
    expect(APPLICATION_HOST).toMatchObject({
      provider: 'vercel',
      projectCount: 1,
      responsibility: 'application_hosting_only',
      domainAssociation: 'exact_only',
      nameserverTransferAllowed: false,
      wildcardRegistrationAllowed: false,
    });
    expect(contract.resources.perTenantResources).toBe(false);
  });

  it('fails configuration validation closed and never prints secret values', () => {
    const sentinel = 'TOP_SECRET_SENTINEL_123';
    const environment = createValidRuntimeEnvironment({
      CLOUDFLARE_API_TOKEN: sentinel,
      MVP_ROOT_HOSTS: 'invalid,duplicate.example.web.id,duplicate.example.web.id',
    });
    const result = spawnSync('npm', ['run', 'config:validate'], {
      cwd: projectRoot,
      env: { ...process.env, ...environment },
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).not.toContain(sentinel);
    expect(result.stderr).toContain('MVP_ROOT_HOSTS');
  });

  it('accepts a complete valid deployment configuration without outputting credentials', () => {
    const environment = createValidRuntimeEnvironment();
    const result = spawnSync('npm', ['run', 'config:validate'], {
      cwd: projectRoot,
      env: { ...process.env, ...environment },
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"rootHostCount": 3');
    expect(result.stdout).not.toContain(environment.CLOUDFLARE_API_TOKEN);
  });
});



describe('policy negative fixtures', () => {
  it('rejects reverse infrastructure-to-application imports', () => {
    const fixture = resolve(projectRoot, 'tests/fixtures/policy/import');
    const result = spawnSync(process.execPath, ['scripts/check-import-boundaries.mjs'], {
      cwd: projectRoot,
      env: { ...process.env, IMPORT_POLICY_FIXTURE_ROOT: fixture },
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain('infrastructure cannot import application');
  });

  it('rejects transitive server environment access from a client graph', () => {
    const fixture = resolve(projectRoot, 'tests/fixtures/policy/client');
    const result = spawnSync(process.execPath, ['scripts/check-client-secrets.mjs'], {
      cwd: projectRoot,
      env: { ...process.env, CLIENT_POLICY_FIXTURE_ROOT: fixture },
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain('reachable from a client module');
  });

  it.each([
    ['environment', 'env', /plaintext|production-looking credential/u],
    ['environment rc', 'envrc', /plaintext|production-looking credential/u],
    ['PEM', 'pem', /production-looking credential/u],
    ['private-key', 'key', /production-looking credential/u],
    ['PKCS#12', 'p12', /key-store artifact/u],
    ['PKCS#12 pfx', 'pfx', /key-store artifact/u],
    ['Java key store', 'jks', /key-store artifact/u],
    ['Terraform variables', 'tfvars', /plaintext|production-looking credential/u],
    ['TOML', 'toml', /plaintext|production-looking credential/u],
    ['INI', 'ini', /plaintext|production-looking credential/u],
    ['properties', 'properties', /plaintext|production-looking credential/u],
    ['shell', 'shell', /plaintext|production-looking credential/u],
    ['Markdown', 'markdown', /production-looking credential/u],
    ['source fixture', 'source', /production-looking credential/u],
  ])('rejects production-looking credentials in %s artifacts', (_kind, directory, expected) => {
    const fixture = resolve(projectRoot, 'tests/fixtures/policy/stage7', directory);
    const result = spawnSync(process.execPath, ['scripts/check-stage7-policy.mjs'], {
      cwd: projectRoot,
      env: { ...process.env, STAGE7_POLICY_FIXTURE_ROOT: fixture },
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(expected);
  });

  it('accepts placeholder and near-match values in newly scanned configuration formats', () => {
    const fixture = resolve(projectRoot, 'tests/fixtures/policy/stage7/near-match');
    const result = spawnSync(process.execPath, ['scripts/check-stage7-policy.mjs'], {
      cwd: projectRoot,
      env: { ...process.env, STAGE7_POLICY_FIXTURE_ROOT: fixture },
      encoding: 'utf8',
    });
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  });

  it('rejects Vercel wildcard and per-tenant resource provisioning operations', () => {
    const fixture = resolve(projectRoot, 'tests/fixtures/policy/deployment');
    const result = spawnSync(process.execPath, ['scripts/check-deployment-policy.mjs'], {
      cwd: projectRoot,
      env: { ...process.env, DEPLOYMENT_POLICY_FIXTURE_ROOT: fixture },
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain('prohibited infrastructure operation');
  });
});

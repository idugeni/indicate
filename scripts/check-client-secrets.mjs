import { access, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

import ts from 'typescript';

const root = resolve(new URL('..', import.meta.url).pathname);
const applicationRoots = [join(root, 'app'), join(root, 'src')];
const fixtureRoot = process.env.CLIENT_POLICY_FIXTURE_ROOT ? resolve(process.env.CLIENT_POLICY_FIXTURE_ROOT) : null;
const sensitiveNames = [
  'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_POOL_URL', 'DATABASE_DIRECT_URL',
  'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ORIGIN_SECRET', 'VERCEL_API_TOKEN', 'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY', 'UPSTASH_REDIS_REST_TOKEN', 'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET', 'GENERIC_WEBHOOK_SECRET', 'CRON_SECRET',
];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', ...(fixtureRoot ? ['.fixture'] : [])]);

async function walk(directory, extensions) {
  try {
    await access(directory);
  } catch {
    return [];
  }
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path, extensions));
    else if (extensions.has(extname(path))) files.push(path);
  }
  return files;
}

function importsFrom(content, file) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}

function resolveLocalImport(specifier, importer, allFiles) {
  let base;
  if (specifier.startsWith('@/')) {
    const path = specifier.slice(2);
    const [first] = path.split('/');
    base = ['domain', 'application', 'ports', 'infrastructure', 'shared', 'config'].includes(first)
      ? join(root, 'src', path)
      : join(root, path);
  } else if (specifier.startsWith('.')) base = resolve(importer, '..', specifier);
  else return null;
  const candidates = [base, ...[...sourceExtensions].map((extension) => `${base}${extension}`), ...[...sourceExtensions].map((extension) => join(base, `index${extension}`))];
  return candidates.find((candidate) => allFiles.has(candidate)) ?? null;
}

const sourceFiles = fixtureRoot ? await walk(fixtureRoot, sourceExtensions) : (await Promise.all(applicationRoots.map((directory) => walk(directory, sourceExtensions)))).flat();
const allFiles = new Set(sourceFiles);
const contentByFile = new Map(await Promise.all(sourceFiles.map(async (file) => [file, await readFile(file, 'utf8')])));
const clientRoots = sourceFiles.filter((file) => /^\s*['"]use client['"];?/m.test(contentByFile.get(file) ?? ''));
const reachable = new Set();
const queue = [...clientRoots];
while (queue.length > 0) {
  const file = queue.shift();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  for (const specifier of importsFrom(contentByFile.get(file) ?? '', file)) {
    const dependency = resolveLocalImport(specifier, file, allFiles);
    if (dependency && !reachable.has(dependency)) queue.push(dependency);
  }
}

const violations = [];
for (const file of reachable) {
  const content = contentByFile.get(file) ?? '';
  if (/['"]server-only['"]|@\/config\/server|src\/config\/server|process\.env/.test(content)) {
    violations.push(`${relative(fixtureRoot ?? root, file)} is reachable from a client module and accesses a server boundary`);
  }
  for (const name of sensitiveNames) {
    if (content.includes(name)) violations.push(`${relative(fixtureRoot ?? root, file)} references ${name} in the client graph`);
  }
}

if (!fixtureRoot) {
  const publicConfig = await readFile(join(root, 'src/config/public.ts'), 'utf8');
  for (const name of sensitiveNames) {
    if (publicConfig.includes(name)) violations.push(`src/config/public.ts references ${name}`);
  }

  const clientOutput = join(root, '.next', 'static');
  try {
    await access(clientOutput);
    const forbiddenValues = [process.env.SECRET_SCAN_SENTINEL, ...sensitiveNames.map((name) => process.env[name])]
      .filter((value) => typeof value === 'string' && value.length >= 8);
    for (const file of await walk(clientOutput, new Set(['.js', '.json', '.map', '.css']))) {
      const content = await readFile(file, 'utf8');
      for (const name of sensitiveNames) {
        if (content.includes(name)) violations.push(`${relative(root, file)} contains server environment key ${name}`);
      }
      for (const value of forbiddenValues) {
        if (content.includes(value)) violations.push(`${relative(root, file)} contains a configured secret sentinel`);
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') throw error;
  }
}

if (violations.length > 0) {
  console.error([...new Set(violations)].sort().join('\n'));
  process.exit(1);
}
console.log(`Client graph and built-output secret boundary policy passed (${reachable.size} client-reachable modules checked).`);

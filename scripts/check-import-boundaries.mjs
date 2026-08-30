import { access, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const fixtureRoot = process.env.IMPORT_POLICY_FIXTURE_ROOT;
const sourceRoot = fixtureRoot ? join(resolve(fixtureRoot), 'src') : join(projectRoot, 'src');
const appRoot = fixtureRoot ? join(resolve(fixtureRoot), 'app') : join(projectRoot, 'app');
const sourceExtensions = new Set(fixtureRoot ? ['.ts', '.tsx', '.fixture'] : ['.ts', '.tsx']);
const layerRules = {
  domain: new Set(['domain', 'shared']),
  application: new Set(['application', 'domain', 'ports', 'shared']),
  ports: new Set(['ports', 'domain', 'shared']),
  infrastructure: new Set(['infrastructure', 'domain', 'ports', 'shared', 'config']),
  shared: new Set(['shared']),
  config: new Set(['config', 'shared']),
  app: new Set(['app', 'application', 'domain', 'ports', 'infrastructure', 'shared', 'config']),
};

async function walk(directory) {
  try {
    await access(directory);
  } catch {
    return [];
  }
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function layerFor(path) {
  if (path.startsWith(appRoot)) return 'app';
  if (!path.startsWith(sourceRoot)) return 'app';
  const relativePath = relative(sourceRoot, path);
  return relativePath.split(sep)[0];
}

function importedLayer(specifier, file) {
  if (specifier.startsWith('@/src/')) return specifier.split('/')[2];
  if (specifier.startsWith('@/')) {
    const candidate = specifier.split('/')[1];
    return candidate === 'app' ? 'app' : candidate;
  }
  if (!specifier.startsWith('.')) return null;
  const resolved = resolve(file, '..', specifier);
  if (resolved.startsWith(appRoot)) return 'app';
  if (resolved.startsWith(sourceRoot)) return layerFor(resolved);
  return null;
}

function importSpecifiers(content, file) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const values = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      values.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
        values.push(node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return values;
}

const files = [...await walk(sourceRoot), ...await walk(appRoot)];
if (!fixtureRoot) {
  for (const rootFile of ['proxy.ts', 'instrumentation.ts']) files.push(join(projectRoot, rootFile));
}
const violations = [];
for (const file of files) {
  const sourceLayer = layerFor(file);
  const allowed = layerRules[sourceLayer];
  if (!allowed) continue;
  const content = await readFile(file, 'utf8');
  for (const specifier of importSpecifiers(content, file)) {
    const targetLayer = importedLayer(specifier, file);
    if (targetLayer && !allowed.has(targetLayer)) {
      violations.push(`${relative(fixtureRoot ? resolve(fixtureRoot) : projectRoot, file)}: ${sourceLayer} cannot import ${targetLayer} (${specifier})`);
    }
    if (sourceLayer === 'domain' && /^(?:next|react|server-only|@?supabase|@?upstash|drizzle)/.test(specifier)) {
      violations.push(`${relative(projectRoot, file)}: domain layer imports a framework or provider (${specifier})`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.sort().join('\n'));
  process.exit(1);
}
console.log(`Import boundary policy passed (${files.length} files checked).`);

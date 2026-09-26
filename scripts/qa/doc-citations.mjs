import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');

/** Directories whose markdown is vendored upstream: never rewritten, so never linted. */
const VENDORED = ['docs/vercel-multi-tenant', '.agents', 'node_modules', '.next', '.git'];

/** Roots a repo-relative citation may be written against, in resolution order. */
const SEARCH_ROOTS = ['', 'src', 'src/app', 'src/modules', 'src/core', 'src/data', 'scripts', 'docs', '.github', 'workers'];

const DOC_GLOBS = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'SECURITY.md', 'SUPPORT.md', 'CODE_OF_CONDUCT.md', 'THIRD-PARTY-NOTICES.md', 'docs', '.github', 'workers', 'src', 'public'];

/** A citation is backticked, or the target of a markdown link, and ends in `:line`. */
const CITATION = /(?:`|\]\()([A-Za-z0-9_./[\]-]+\.(?:ts|tsx|mjs|js|sql|json|yml|yaml|prisma|sh)):(\d+)(?:`|\))/gu;

/** A bare `name.ts:12` has no root, so no reader can resolve it. */
const BARE_FILENAME = /`([A-Za-z0-9_-]+\.(?:ts|tsx|mjs|js|sql)):(\d+)`/gu;

function isVendored(relativePath) {
  return VENDORED.some((prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`));
}

function listMarkdown(target, out) {
  const absolute = join(ROOT, target);
  let stats;
  try {
    stats = statSync(absolute);
  } catch {
    return out;
  }
  if (stats.isFile()) {
    if (target.endsWith('.md') && !isVendored(target)) out.push(target);
    return out;
  }
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue;
    listMarkdown(posix.join(target, entry.name), out);
  }
  return out;
}

const lineCounts = new Map();
function splitLines(absolute) {
  const text = readFileSync(absolute, 'utf8');
  return text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
}
function lineCountOf(repoPath) {
  if (!lineCounts.has(repoPath)) {
    try {
      lineCounts.set(repoPath, splitLines(join(ROOT, repoPath)).length);
    } catch {
      lineCounts.set(repoPath, null);
    }
  }
  return lineCounts.get(repoPath);
}

function resolveCitation(cited) {
  const normalized = cited.split('/').join(sep);
  for (const root of SEARCH_ROOTS) {
    const candidate = root === '' ? normalized : join(root, normalized);
    if (lineCountOf(candidate) !== null) return candidate;
  }
  return null;
}

const documents = DOC_GLOBS.flatMap((glob) => listMarkdown(glob, [])).sort();
const problems = [];
let checked = 0;

for (const document of documents) {
  const lines = readFileSync(join(ROOT, document), 'utf8').split('\n');
  let insideFence = false;
  lines.forEach((text, index) => {
    const at = `${document}:${index + 1}`;
    if (/^\s*(?:```|~~~)/.test(text)) {
      insideFence = !insideFence;
      return;
    }
    if (insideFence) return;
    CITATION.lastIndex = 0;
    for (const match of text.matchAll(CITATION)) {
      const [, cited, line] = match;
      if (!cited.includes('/')) continue;
      checked += 1;
      const resolvedPath = resolveCitation(cited);
      if (resolvedPath === null) {
        problems.push(`${at} - berkas tidak ada: ${cited}:${line}`);
        continue;
      }
      const total = lineCountOf(resolvedPath);
      const lineNumber = Number(line);
      if (lineNumber > total) {
        problems.push(`${at} - ${cited}:${line} di luar jangkauan (${resolvedPath} punya ${total} baris)`);
        continue;
      }
      const target = splitLines(join(ROOT, resolvedPath))[lineNumber - 1];
      if (target === undefined || target.trim() === '') {
        problems.push(`${at} - ${cited}:${line} menunjuk baris kosong di ${resolvedPath}`);
      }
    }
    BARE_FILENAME.lastIndex = 0;
    for (const match of text.matchAll(BARE_FILENAME)) {
      problems.push(`${at} - sitasi tanpa root tidak bisa diverifikasi: ${match[1]}:${match[2]} (tulis path relatif repo)`);
    }
  });
}

process.stdout.write(`doc-citations: ${checked} sitasi diperiksa di ${documents.length} berkas markdown${VENDORED.length > 0 ? ` (${VENDORED.slice(0, 2).join(', ')} dilewati)` : ''}\n`);
for (const problem of problems) process.stdout.write(`  GAGAL ${problem}\n`);
if (problems.length > 0) {
  process.stdout.write(`doc-citations: ${problems.length} masalah\n`);
  process.exit(1);
}
process.stdout.write('doc-citations: semua sitasi resolve\n');

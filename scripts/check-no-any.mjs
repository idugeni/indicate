import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src', 'scripts', 'workers'];
const extensions = new Set(['.ts', '.tsx', '.mts', '.cts']);
const patterns = [':\\s*any\\b', '<\\s*any\\s*>', '\\bas\\s+any\\b', '\\bany\\s*\\[\\]'];

function stripStringsAndComments(line) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1] ?? '';
    if (quote !== null) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '/') break;
    out += ch;
    i += 1;
  }
  return out;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(path, files);
    } else if ([...extensions].some((ext) => path.endsWith(ext))) {
      files.push(path);
    }
  }
  return files;
}

const violations = [];
for (const root of roots) {
  let files = [];
  try {
    files = walk(root);
  } catch {
    continue;
  }
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    let inBlock = false;
    lines.forEach((raw, index) => {
      let line = raw;
      if (inBlock) {
        const end = line.indexOf('*/');
        if (end === -1) return;
        line = line.slice(end + 2);
        inBlock = false;
      }
      const start = line.indexOf('/*');
      if (start !== -1) {
        const end = line.indexOf('*/', start + 2);
        if (end === -1) {
          line = line.slice(0, start);
          inBlock = true;
        } else {
          line = line.slice(0, start) + line.slice(end + 2);
        }
      }
      const code = stripStringsAndComments(line).replace(/\.any\b/g, '');
      for (const pattern of patterns) {
        if (new RegExp(pattern).test(code)) {
          violations.push(`${file}:${index + 1}: ${raw.trim()}`);
          break;
        }
      }
      if (/eslint-disable.*no-explicit-any/.test(code)) {
        violations.push(`${file}:${index + 1}: eslint-disable for no-explicit-any`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`check:no-any gagal — ${violations.length} temuan:\n${violations.join('\n')}`);
  process.exit(1);
}
console.log('check:no-any bersih — tidak ada tipe any eksplisit.');

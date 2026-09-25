const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const [key, value] = process.argv[i].split('=');
  args.set(key, value ?? true);
}

const base = (args.get('--url') ?? process.env.PRIME_URL ?? 'https://indicate.website').toString().replace(/\/$/, '');
const paths = (args.get('--paths') ?? '/').toString().split(',').map((value) => value.trim()).filter((value) => value !== '');
const attempts = Number((args.get('--attempts') ?? 4).toString());
const timeoutMs = Number((args.get('--timeout') ?? 300000).toString());
const maxMs = Number((args.get('--max-ms') ?? 15000).toString());
const marker = (args.get('--expect-marker') ?? '').toString();

// A route whose dynamic boundary never resolves still answers 200 with a shell:
// React emits the pending-boundary placeholders and the request runs until the
// platform cuts the stream. Measured on the control-plane landing, a resolved
// page answers in 179-1006 ms while an unresolved one runs past 125000 ms, so
// latency separates the two cases by two orders of magnitude and needs no
// assumption about page copy. Two consecutive fast answers are required because
// a single fast answer can be a cache layer that never revalidates.
const shellSlow = (ms) => ms > maxMs;

async function fetchOnce(path) {
  const started = performance.now();
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.text();
  return {
    status: response.status,
    bytes: Buffer.byteLength(body),
    cache: response.headers.get('x-vercel-cache') ?? '-',
    ms: Math.round(performance.now() - started),
    markerPresent: marker === '' ? null : body.includes(marker),
  };
}

async function prime(path) {
  const history = [];
  let consecutiveFast = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let entry;
    try {
      const result = await fetchOnce(path);
      entry = { attempt, ...result };
    } catch (error) {
      entry = { attempt, status: 'ERR', bytes: 0, cache: '-', ms: timeoutMs, markerPresent: null, reason: error instanceof Error ? error.message : String(error) };
    }
    history.push(entry);

    const answered = entry.status === 200;
    const fast = answered && !shellSlow(entry.ms);
    const markerOk = entry.markerPresent !== false;
    consecutiveFast = fast && markerOk ? consecutiveFast + 1 : 0;
    if (consecutiveFast >= 2) return { path, primed: true, history };
  }
  return { path, primed: false, history };
}

function verdict(entry) {
  if (entry.status === 'ERR') return `ERROR ${entry.reason ?? ''}`;
  if (entry.status !== 200) return `status ${entry.status}`;
  if (shellSlow(entry.ms)) return 'SHELL (stream never resolved)';
  if (entry.markerPresent === false) return 'MARKER MISSING';
  return 'resolved';
}

function row(entry) {
  const status = String(entry.status).padEnd(5);
  const bytes = String(entry.bytes).padStart(9);
  const ms = String(entry.ms).padStart(8);
  const cache = String(entry.cache).padEnd(12);
  return `  #${entry.attempt} ${status} ${bytes} B ${ms} ms  ${cache}  ${verdict(entry)}`;
}

const started = performance.now();
console.log(`priming ${base} [${paths.join(' ')}]`);
console.log(`shell threshold: ${maxMs} ms per answer, need 2 consecutive resolved answers`);
if (marker !== '') console.log(`required marker: ${marker}`);
console.log(`timeout per attempt: ${timeoutMs} ms, attempts: ${attempts}\n`);

const results = [];
for (const path of paths) {
  const result = await prime(path);
  results.push(result);
  console.log(path);
  for (const entry of result.history) console.log(row(entry));
  console.log('');
}

const failed = results.filter((result) => !result.primed);
const elapsed = Math.round((performance.now() - started) / 1000);
for (const result of failed) console.log(`NOT PRIMED ${result.path} after ${result.history.length} attempt(s)`);
console.log(`${results.length - failed.length}/${results.length} primed in ${elapsed}s`);
process.exit(failed.length === 0 ? 0 : 1);

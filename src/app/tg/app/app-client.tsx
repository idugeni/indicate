'use client';

import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface TelegramUser {
  readonly id: number;
  readonly first_name?: string;
}

interface TelegramWebApp {
  readonly initData: string;
  readonly initDataUnsafe?: { readonly user?: TelegramUser };
  readonly colorScheme: 'light' | 'dark';
  ready(): void;
  expand(): void;
}

declare global {
  interface Window {
    readonly Telegram?: { readonly WebApp?: TelegramWebApp };
  }
}

interface Org {
  readonly id: string;
  readonly name: string;
  readonly subscription: { readonly status: string } | null;
}

interface ArticleSummary {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly regionId: string | null;
  readonly createdAt: string;
}

interface ArticleDetail {
  readonly id: string;
  readonly regionId: string;
  readonly title: string;
  readonly body: string;
  readonly source: string;
  readonly slug: string;
  readonly status: string;
  readonly version: number;
}

interface Site {
  readonly id: string;
  readonly normalizedHostname: string;
  readonly regionId: string | null;
  readonly status: string;
}

interface Region {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

interface JobSummary {
  readonly id: string;
  readonly articleTitle: string;
  readonly state: string;
  readonly createdAt: string;
}

interface JobDetail {
  readonly id: string;
  readonly state: string;
  readonly createdAt: string;
  readonly targets: readonly { readonly siteId: string; readonly state: string }[];
  readonly urls: readonly string[];
  readonly successfulCount: number | null;
}

type Tab = 'home' | 'articles' | 'jobs' | 'org';

const dark: Record<string, string> = {
  bg: '#141126',
  card: '#1e1a33',
  line: '#2e2752',
  text: '#f2eefc',
  dim: '#a89fd1',
  accent: '#c9a227',
  danger: '#e5484d',
  ok: '#3fb68b',
};

async function post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as { readonly error?: { readonly message?: string } } | null;
  if (!response.ok) throw new Error(typeof data?.error?.message === 'string' ? data.error.message : `Permintaan gagal (${response.status}).`);
  return data as T;
}

function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    if (/unavailable|404/i.test(error.message)) return 'Tidak tersedia. Coba lagi dari tab Organisasi.';
    return 'Gagal memuat. Ketuk Muat ulang.';
  }
  return 'Gagal memuat. Ketuk Muat ulang.';
}

export function MiniAppClient() {
  const [scriptReady, setScriptReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [orgs, setOrgs] = useState<readonly Org[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');

  const webApp = scriptReady ? (window.Telegram?.WebApp ?? null) : null;
  const initData = webApp === null || webApp.initData === '' ? null : webApp.initData;

  useEffect(() => {
    webApp?.ready();
    webApp?.expand();
  }, [webApp]);

  useEffect(() => {
    if (initData === null) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await post<{ organizations: readonly Org[] }>('/api/tg/app/session', { initData });
        if (cancelled) return;
        setOrgs(session.organizations);
        const saved = window.localStorage.getItem('tg-org');
        const pick = session.organizations.some((org) => org.id === saved) ? (saved as string) : session.organizations[0]?.id ?? null;
        setOrgId(pick);
      } catch {
        if (!cancelled) setDenied(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initData]);

  const switchOrg = useCallback((id: string) => {
    window.localStorage.setItem('tg-org', id);
    setOrgId(id);
    setTab('home');
  }, []);

  const call = useCallback(
    async <T,>(path: string, payload: Record<string, unknown>): Promise<T> => {
      if (initData === null || orgId === null) throw new Error('Belum siap.');
      return post<T>(path, { ...payload, initData, organizationId: orgId });
    },
    [initData, orgId],
  );

  const activeOrg = useMemo(() => orgs.find((org) => org.id === orgId) ?? null, [orgs, orgId]);

  if (!scriptReady)
    return (
      <main style={center}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
        Memuat…
      </main>
    );
  if (initData === null) {
    return (
      <main style={center}>
        <p>Mini App ini hanya terbuka dari Telegram dan hanya untuk pemilik.</p>
      </main>
    );
  }
  if (denied || (orgs.length === 0 && orgId === null)) {
    return (
      <main style={center}>
        <p>{denied ? 'Akses ditolak.' : 'Memuat organisasi…'}</p>
      </main>
    );
  }
  return (
    <main style={shell}>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <header style={head}>
        <div>
          <div style={orgName}>{activeOrg?.name ?? '…'}</div>
          <div style={dim}>{activeOrg === null ? '…' : activeOrg.subscription === null ? 'Tanpa langganan' : `Langganan: ${activeOrg.subscription.status}`}</div>
        </div>
      </header>
      {tab === 'home' && <Home call={call} go={setTab} />}
      {tab === 'articles' && <Articles call={call} />}
      {tab === 'jobs' && <Jobs call={call} />}
      {tab === 'org' && <Orgs orgs={orgs} activeId={orgId} onPick={switchOrg} />}
      <nav style={nav}>
        {(['home', 'articles', 'jobs', 'org'] as const).map((key) => (
          <button key={key} type="button" style={tab === key ? tabActive : tabBtn} onClick={() => setTab(key)}>
            {key === 'home' ? 'Beranda' : key === 'articles' ? 'Artikel' : key === 'jobs' ? 'Tayang' : 'Org'}
          </button>
        ))}
      </nav>
    </main>
  );
}

type Call = <T>(path: string, payload: Record<string, unknown>) => Promise<T>;

function useLoad<T>(key: string, loader: () => Promise<T>): { data: T | null; error: string | null; reload: () => void } {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
    let cancelled = false;
    loaderRef.current().then(
      (data) => {
        if (!cancelled) setState({ data, error: null });
      },
      (failure: unknown) => {
        if (!cancelled) setState({ data: null, error: friendlyError(failure) });
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loader dibaca versi terbaru via ref; key+tick yang memicu muat ulang
  }, [key, tick]);
  return { data: state.data, error: state.error, reload: () => setTick((value) => value + 1) };
}

function Home({ call, go }: { call: Call; go: (tab: Tab) => void }) {
  const articles = useLoad('articles', () => call<{ articles: readonly ArticleSummary[] }>('/api/tg/app/articles', {}));
  const jobs = useLoad('jobs', () => call<{ jobs: readonly JobSummary[] }>('/api/tg/app/jobs', {}));
  const sites = useLoad('sites', () => call<{ sites: readonly Site[] }>('/api/tg/app/sites', {}));
  const list = articles.data?.articles ?? [];
  const jobList = jobs.data?.jobs ?? [];
  const activeSites = (sites.data?.sites ?? []).filter((site) => site.status === 'active').length;
  const failed = jobList.filter((job) => job.state === 'failed').length;
  const cards: { label: string; value: number; tab: Tab }[] = [
    { label: 'Artikel', value: list.length, tab: 'articles' },
    { label: 'Situs aktif', value: activeSites, tab: 'articles' },
    { label: 'Job', value: jobList.length, tab: 'jobs' },
    { label: 'Job gagal', value: failed, tab: 'jobs' },
  ];
  return (
    <section>
      {(articles.error !== null || jobs.error !== null || sites.error !== null) && <p style={err}>{articles.error ?? jobs.error ?? sites.error}</p>}
      <div style={grid}>
        {cards.map((card) => (
          <button key={card.label} type="button" style={cardBtn} onClick={() => go(card.tab)}>
            <div style={big}>{card.value}</div>
            <div style={dim}>{card.label}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function Articles({ call }: { call: Call }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const loaded = useLoad('articles', () => call<{ articles: readonly ArticleSummary[] }>('/api/tg/app/articles', {}));
  const list = (loaded.data?.articles ?? []).filter((article) => article.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <section>
      <div style={row}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul…" style={input} />
        <button
          type="button"
          style={btnAcc}
          onClick={() => {
            setSelectedId(null);
            setEditing(true);
          }}
        >
          ＋ Baru
        </button>
      </div>
      {loaded.error !== null && <p style={err}>{loaded.error}</p>}
      {list.map((article) => (
        <button
          key={article.id}
          type="button"
          style={rowBtn}
          onClick={() => {
            setSelectedId(article.id);
            setEditing(false);
          }}
        >
          <div style={rowTitle}>{article.title}</div>
          <div style={dim}>{article.status}</div>
        </button>
      ))}
      {editing && <ArticleEditor call={call} articleId={selectedId} done={() => { setEditing(false); loaded.reload(); }} />}
      {!editing && selectedId !== null && <ArticleDetail call={call} articleId={selectedId} refresh={() => loaded.reload()} />}
    </section>
  );
}

function ArticleEditor({ call, articleId, done }: { call: Call; articleId: string | null; done: () => void }) {
  const detail = useLoad(articleId === null ? 'new' : `edit-${articleId}`, async () => {
    if (articleId === null) return null;
    return call<{ article: ArticleDetail }>('/api/tg/app/article', { articleId });
  });
  const sites = useLoad('sites', () => call<{ regions: readonly Region[]; sites: readonly Site[] }>('/api/tg/app/sites', {}));
  const regions = (sites.data?.regions ?? []).filter((region) => region.status === 'active');
  if (articleId !== null && detail.data === null) return <p style={dim}>{detail.error ?? 'Memuat…'}</p>;
  return (
    <ArticleForm
      key={articleId ?? 'new'}
      call={call}
      articleId={articleId}
      initial={detail.data?.article ?? null}
      regions={regions}
      done={done}
    />
  );
}

function ArticleForm({ call, articleId, initial, regions, done }: {
  call: Call;
  articleId: string | null;
  initial: ArticleDetail | null;
  regions: readonly Region[];
  done: () => void;
}) {
  const [regionId, setRegionId] = useState(initial?.regionId ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const finalSlug = slug.trim() !== '' ? slug.trim() : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await call('/api/tg/app/article-save', {
        article: articleId === null
          ? { regionId, title, body, source, slug: finalSlug, status: 'draft' }
          : { id: articleId, regionId, title, body, source, slug },
      });
      done();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div style={card}>
      <h3 style={h3}>{articleId === null ? 'Artikel baru' : 'Ubah artikel'}</h3>
      {articleId === null && (
        <select value={regionId} onChange={(event) => setRegionId(event.target.value)} style={input}>
          <option value="">Pilih region…</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
      )}
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Judul" style={input} />
      <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Isi" rows={6} style={input} />
      <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Sumber" style={input} />
      <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="slug-artikel" style={input} />
      {error !== null && <p style={err}>{error}</p>}
      <div style={row}>
        <button type="button" style={btnAcc} disabled={saving} onClick={() => void save()}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button type="button" style={btn} onClick={done}>
          Batal
        </button>
      </div>
    </div>
  );
}

function ArticleDetail({ call, articleId, refresh }: { call: Call; articleId: string; refresh: () => void }) {
  const detail = useLoad(`detail-${articleId}`, () => call<{ article: ArticleDetail }>('/api/tg/app/article', { articleId }));
  const sites = useLoad('sites', () => call<{ sites: readonly Site[]; regions: readonly Region[] }>('/api/tg/app/sites', {}));
  const [publishing, setPublishing] = useState(false);
  const [checked, setChecked] = useState<readonly string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const article = detail.data?.article ?? null;
  const hostnames = new Map((sites.data?.sites ?? []).map((site) => [site.id, site.normalizedHostname] as const));
  const act = async (path: string, payload: Record<string, unknown>, ok: string) => {
    setNotice(null);
    try {
      await call(path, { articleId, ...payload });
      setNotice(ok);
      refresh();
    } catch (failure) {
      setNotice(friendlyError(failure));
    }
  };
  if (detail.data === null) return <p style={dim}>{detail.error ?? 'Memuat…'}</p>;
  return (
    <div style={card}>
      <h3 style={h3}>{article?.title}</h3>
      <div style={dim}>Status: {article?.status}</div>
      {notice !== null && <p style={err}>{notice}</p>}
      <div style={row}>
        <button type="button" style={btn} onClick={() => void act('/api/tg/app/article-transition', { action: article?.status === 'archived' ? 'restore' : 'archive' }, 'Berhasil.')}>
          {article?.status === 'archived' ? 'Pulihkan' : 'Arsipkan'}
        </button>
        <button
          type="button"
          style={btnAcc}
          disabled={publishing}
          onClick={() => {
            setPublishing(true);
            setChecked([]);
          }}
        >
          Terbitkan
        </button>
      </div>
      {publishing && (
        <PublishSheet
          call={call}
          articleId={articleId}
          sites={(sites.data?.sites ?? []).filter((site) => site.status === 'active')}
          hostnames={hostnames}
          checked={checked}
          onToggle={(id) => setChecked((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))}
          done={(message) => {
            setPublishing(false);
            setNotice(message);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function PublishSheet({ call, articleId, sites, hostnames, checked, onToggle, done }: {
  call: Call;
  articleId: string;
  sites: readonly Site[];
  hostnames: ReadonlyMap<string, string>;
  checked: readonly string[];
  onToggle: (id: string) => void;
  done: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const publish = async (siteIds: readonly string[]) => {
    if (siteIds.length === 0) {
      done('Centang dulu situsnya.');
      return;
    }
    setBusy(true);
    try {
      await call('/api/tg/app/publish', { articleId, siteIds: [...siteIds] });
      done('Publikasi antre diproses.');
    } catch (failure) {
      done(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  };
  const suggest = async () => {
    if (checked.length === 0) {
      done('Centang dulu situsnya.');
      return;
    }
    setBusy(true);
    try {
      const out = await call<{ overrides: Record<string, { title?: string; description?: string }> }>('/api/tg/app/suggest', { articleId, siteIds: [...checked] });
      const lines = Object.entries(out.overrides).map(([siteId, override]) => `• ${hostnames.get(siteId) ?? siteId}\n  ${override.title ?? '(judul kanonis)'}`);
      setSuggestion(lines.length === 0 ? 'Tidak ada saran.' : lines.join('\n\n'));
    } catch (failure) {
      done(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={card}>
      {sites.map((site) => (
        <label key={site.id} style={checkRow}>
          <input type="checkbox" checked={checked.includes(site.id)} onChange={() => onToggle(site.id)} />
          {hostnames.get(site.id) ?? site.id}
        </label>
      ))}
      <div style={row}>
        <button type="button" style={btnAcc} disabled={busy} onClick={() => void publish(checked)}>
          Terbitkan
        </button>
        <button type="button" style={btnAcc} disabled={busy} onClick={() => void publish(sites.map((site) => site.id))}>
          Semua Situs
        </button>
        <button type="button" style={btn} disabled={busy} onClick={() => void suggest()}>
          Saran
        </button>
      </div>
      {suggestion !== null && <pre style={pre}>{suggestion}</pre>}
    </div>
  );
}

function Jobs({ call }: { call: Call }) {
  const loaded = useLoad('jobs', () => call<{ jobs: readonly JobSummary[] }>('/api/tg/app/jobs', {}));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <section>
      {loaded.error !== null && <p style={err}>{loaded.error}</p>}
      {(loaded.data?.jobs ?? []).map((job) => (
        <button key={job.id} type="button" style={rowBtn} onClick={() => setSelectedId(job.id)}>
          <div style={rowTitle}>{job.articleTitle}</div>
          <div style={dim}>{job.state}</div>
        </button>
      ))}
      {selectedId !== null && <JobDetail call={call} jobId={selectedId} refresh={() => loaded.reload()} />}
    </section>
  );
}

function JobDetail({ call, jobId, refresh }: { call: Call; jobId: string; refresh: () => void }) {
  const detail = useLoad(`job-${jobId}`, () => call<JobDetail>('/api/tg/app/job', { jobId }));
  const sites = useLoad('sites', () => call<{ sites: readonly Site[] }>('/api/tg/app/sites', {}));
  const [notice, setNotice] = useState<string | null>(null);
  const hostnames = new Map((sites.data?.sites ?? []).map((site) => [site.id, site.normalizedHostname] as const));
  const job = detail.data ?? null;
  const act = async (action: 'retry' | 'unpublish') => {
    setNotice(null);
    try {
      await call('/api/tg/app/job', { jobId, action });
      setNotice('Berhasil.');
      refresh();
    } catch (failure) {
      setNotice(friendlyError(failure));
    }
  };
  if (job === null) return <p style={dim}>{detail.error ?? 'Memuat…'}</p>;
  return (
    <div style={card}>
      <div style={dim}>Status: {job.state}</div>
      {job.targets.map((target) => (
        <div key={target.siteId} style={dim}>
          • {hostnames.get(target.siteId) ?? target.siteId}: {target.state}
        </div>
      ))}
      {job.urls.map((url) => (
        <div key={url} style={dim}>
          {url}
        </div>
      ))}
      {notice !== null && <p style={err}>{notice}</p>}
      <div style={row}>
        <button type="button" style={btn} onClick={() => void act('retry')}>
          Ulangi
        </button>
        <button type="button" style={btnDanger} onClick={() => void act('unpublish')}>
          Tarik
        </button>
      </div>
    </div>
  );
}

function Orgs({ orgs, activeId, onPick }: { orgs: readonly Org[]; activeId: string | null; onPick: (id: string) => void }) {
  return (
    <section>
      {orgs.map((org) => (
        <button key={org.id} type="button" style={rowBtn} onClick={() => onPick(org.id)}>
          <div style={rowTitle}>
            {org.id === activeId ? '● ' : '○ '}
            {org.name}
          </div>
          <div style={dim}>{org.subscription === null ? 'Tanpa langganan' : org.subscription.status}</div>
        </button>
      ))}
    </section>
  );
}

const shell: CSSProperties = { background: dark.bg, color: dark.text, minHeight: '100dvh', padding: '16px 16px 76px', fontFamily: 'system-ui, sans-serif' };
const center: CSSProperties = { ...shell, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
const head: CSSProperties = { marginBottom: 12 };
const orgName: CSSProperties = { fontSize: 18, fontWeight: 700 };
const dim: CSSProperties = { color: dark.dim, fontSize: 13 };
const nav: CSSProperties = { position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', background: dark.card, borderTop: `1px solid ${dark.line}` };
const tabBtn: CSSProperties = { flex: 1, padding: '12px 4px', background: 'transparent', border: 'none', color: dark.dim, fontSize: 14 };
const tabActive: CSSProperties = { ...tabBtn, color: dark.accent, fontWeight: 700 };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const cardBtn: CSSProperties = { background: dark.card, border: `1px solid ${dark.line}`, borderRadius: 12, padding: 16, color: dark.text, textAlign: 'left' };
const big: CSSProperties = { fontSize: 28, fontWeight: 800 };
const card: CSSProperties = { background: dark.card, border: `1px solid ${dark.line}`, borderRadius: 12, padding: 12, marginTop: 12 };
const row: CSSProperties = { display: 'flex', gap: 8, marginTop: 8 };
const rowBtn: CSSProperties = { display: 'block', width: '100%', background: dark.card, border: `1px solid ${dark.line}`, borderRadius: 12, padding: 12, marginTop: 8, color: dark.text, textAlign: 'left' };
const rowTitle: CSSProperties = { fontWeight: 600, marginBottom: 4 };
const btn: CSSProperties = { background: dark.line, color: dark.text, border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 14 };
const btnAcc: CSSProperties = { ...btn, background: dark.accent, color: '#141126', fontWeight: 700 };
const btnDanger: CSSProperties = { ...btn, background: dark.danger, color: '#fff', fontWeight: 700 };
const input: CSSProperties = { width: '100%', boxSizing: 'border-box', background: dark.bg, color: dark.text, border: `1px solid ${dark.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, marginTop: 8 };
const h3: CSSProperties = { margin: '0 0 4px', fontSize: 16 };
const err: CSSProperties = { color: '#ff9d9d', fontSize: 13 };
const pre: CSSProperties = { whiteSpace: 'pre-wrap', fontSize: 13, color: dark.text };
const checkRow: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', fontSize: 14 };

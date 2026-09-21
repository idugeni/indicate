'use client';

import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { SearchList, StatusDot } from '@/app/tg/app/components/data-list';
import { MatrixPanel } from '@/app/tg/app/components/matrix-panel';
import { CardsSkeleton, EmptyState, ListSkeleton, SectionError } from '@/app/tg/app/components/section-states';
import { useTelegram } from '@/app/tg/app/hooks/use-telegram';
import { miniAppPalette, type MiniAppPalette } from '@/app/tg/app/theme';

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

interface SubscriptionState {
  readonly state: string;
  readonly version: number | null;
}

interface InvoiceSummary {
  readonly id: string;
  readonly number: string;
  readonly amountIdr: number;
  readonly status: string;
  readonly paidAt: string | null;
  readonly dueAt: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly paymentMethod: string;
}

interface InvoiceDetailRecord {
  readonly id: string;
  readonly number: string;
  readonly amountIdr: number;
  readonly status: string;
  readonly paidAt: string | null;
  readonly dueAt: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly paymentMethod: string;
  readonly billingNote: string | null;
  readonly voidedAt: string | null;
  readonly voidReason: string | null;
}

type Tab = 'harian' | 'home' | 'articles' | 'jobs' | 'org';

function themeVars(theme: MiniAppPalette): CSSProperties {
  return {
    '--tg-bg': theme.bg,
    '--tg-card': theme.card,
    '--tg-line': theme.line,
    '--tg-text': theme.text,
    '--tg-dim': theme.dim,
    '--tg-accent': theme.accent,
    '--tg-danger': theme.danger,
    '--tg-ok': theme.ok,
  } as CSSProperties;
}

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

function formatRp(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function MiniAppClient() {
  const tg = useTelegram();
  const theme = miniAppPalette(tg.colorScheme);
  const vars = themeVars(theme);
  const [denied, setDenied] = useState(false);
  const [orgs, setOrgs] = useState<readonly Org[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [tab, setTab] = useState<Tab>('harian');

  const tgRef = useRef(tg);
  useEffect(() => {
    tgRef.current = tg;
  });

  const initData = tg.ready && typeof window !== 'undefined' ? (window.Telegram?.WebApp?.initData ?? null) : null;
  const resolvedInitData = initData === null || initData === '' ? null : initData;

  useEffect(() => {
    if (resolvedInitData === null) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await post<{ organizations: readonly Org[] }>('/api/tg/app/session', { initData: resolvedInitData });
        if (cancelled) return;
        setOrgs(session.organizations);
        const saved = tgRef.current.loadOrg();
        const pick = session.organizations.some((org) => org.id === saved) ? (saved as string) : session.organizations[0]?.id ?? null;
        setOrgId(pick);
      } catch {
        if (!cancelled) setDenied(true);
      } finally {
        if (!cancelled) setSessionDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedInitData]);

  const switchOrg = useCallback((id: string) => {
    tg.saveOrg(id);
    tg.haptic('medium');
    setOrgId(id);
    setTab('harian');
  }, [tg]);

  const reloadOrgs = useCallback(async () => {
    if (resolvedInitData === null) return;
    try {
      const session = await post<{ organizations: readonly Org[] }>('/api/tg/app/session', { initData: resolvedInitData });
      setOrgs(session.organizations);
    } catch {
      tg.haptic('error');
    }
  }, [resolvedInitData, tg]);

  const call = useCallback(
    async <T,>(path: string, payload: Record<string, unknown>): Promise<T> => {
      if (resolvedInitData === null || orgId === null) throw new Error('Belum siap.');
      return post<T>(path, { ...payload, initData: resolvedInitData, organizationId: orgId });
    },
    [resolvedInitData, orgId],
  );

  const activeOrg = useMemo(() => orgs.find((org) => org.id === orgId) ?? null, [orgs, orgId]);

  if (!tg.ready)
    return (
      <main style={{ ...center, ...vars }}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        {tg.failed ? (
          <>
            <p>Gagal memuat Telegram. Periksa koneksi lalu coba lagi.</p>
            <button type="button" style={btnAcc} onClick={() => window.location.reload()}>
              Coba lagi
            </button>
          </>
        ) : (
          <div style={{ width: '100%' }}>
            <ListSkeleton rows={3} theme={theme} />
          </div>
        )}
      </main>
    );
  if (resolvedInitData === null) {
    return (
      <main style={{ ...center, ...vars }}>
        <p>Mini App ini hanya terbuka dari Telegram dan hanya untuk pemilik.</p>
      </main>
    );
  }
  if (denied || !sessionDone || orgId === null) {
    return (
      <main style={{ ...center, ...vars }}>
        {denied ? (
          <p>Akses ditolak.</p>
        ) : !sessionDone || orgId === null ? (
          <div style={{ width: '100%' }}>
            <ListSkeleton rows={3} theme={theme} />
          </div>
        ) : (
          <EmptyState title="Tidak ada organisasi" hint="Minta akses pemilik ke Dashboard." theme={theme} />
        )}
      </main>
    );
  }
  return (
    <main style={{ ...shell, ...vars }}>
      <header style={head}>
        <div>
          <div style={orgName}>{activeOrg?.name ?? '…'}</div>
          <div style={dim}>{activeOrg === null ? '…' : activeOrg.subscription === null ? 'Tanpa langganan' : `Langganan: ${activeOrg.subscription.status}`}</div>
        </div>
      </header>
      {tab === 'harian' && <Digest call={call} theme={theme} />}
      {tab === 'home' && <Home call={call} go={setTab} theme={theme} />}
      {tab === 'articles' && <Articles call={call} theme={theme} tg={tg} />}
      {tab === 'jobs' && <Jobs call={call} theme={theme} tg={tg} />}
      {tab === 'org' && <Orgs orgs={orgs} activeId={orgId} onPick={switchOrg} call={call} theme={theme} tg={tg} onChanged={() => void reloadOrgs()} />}
      <nav style={nav}>
        {(['harian', 'home', 'articles', 'jobs', 'org'] as const).map((key) => (
          <button
            key={key}
            type="button"
            style={tab === key ? tabActive : tabBtn}
            onClick={() => {
              tg.haptic('light');
              setTab(key);
            }}
          >
            {key === 'harian' ? 'Harian' : key === 'home' ? 'Beranda' : key === 'articles' ? 'Artikel' : key === 'jobs' ? 'Tayang' : 'Org'}
          </button>
        ))}
      </nav>
    </main>
  );
}

type Call = <T>(path: string, payload: Record<string, unknown>) => Promise<T>;
type TelegramApi = ReturnType<typeof useTelegram>;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loader reads the latest version via ref; key+tick trigger the reload
  }, [key, tick]);
  return { data: state.data, error: state.error, reload: () => setTick((value) => value + 1) };
}

interface DigestEntry {
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly articles: number;
  readonly published: number;
  readonly failed: number;
}

interface DigestTotals {
  readonly articles: number;
  readonly published: number;
  readonly failed: number;
}

function Digest({ call, theme }: { call: Call; theme: MiniAppPalette }) {
  const loaded = useLoad('digest', () =>
    call<{ date: string; organizations: readonly DigestEntry[]; totals: DigestTotals; partial: boolean }>('/api/tg/app/digest', {}));
  if (loaded.data === null && loaded.error === null) return <CardsSkeleton theme={theme} />;
  if (loaded.data === null) return <SectionError message={loaded.error ?? 'Gagal memuat.'} onRetry={loaded.reload} theme={theme} />;
  const { date, organizations, totals, partial } = loaded.data;
  const publishedOrgs = organizations.filter((org) => org.published > 0 || org.articles > 0).length;
  return (
    <div>
      <div style={dim}>Ringkasan harian • {date}{partial ? ' • sebagian gagal dimuat' : ''}</div>
      <div style={grid}>
        <div style={cardBtn}>
          <div style={big}>{publishedOrgs}/{organizations.length}</div>
          <div style={dim}>org publish</div>
        </div>
        <div style={cardBtn}>
          <div style={big}>{totals.published}</div>
          <div style={dim}>tayang situs</div>
        </div>
        <div style={cardBtn}>
          <div style={big}>{totals.articles}</div>
          <div style={dim}>artikel</div>
        </div>
        <div style={cardBtn}>
          <div style={big}>{totals.failed}</div>
          <div style={dim}>job gagal</div>
        </div>
      </div>
      {organizations.map((org) => (
        <div key={org.organizationId} style={rowBtn}>
          <div style={rowTitle}>{org.name}</div>
          <div style={dim}>
            {org.articles} artikel • {org.published} tayang{org.failed > 0 ? ` • ${org.failed} gagal` : ''}
          </div>
          <StatusDot value={org.failed > 0 ? 'failed' : org.published > 0 || org.articles > 0 ? 'published' : 'queued'} theme={theme} />
        </div>
      ))}
    </div>
  );
}

function Home({ call, go, theme }: { call: Call; go: (tab: Tab) => void; theme: MiniAppPalette }) {
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
  const loading =
    articles.data === null && jobs.data === null && sites.data === null &&
    articles.error === null && jobs.error === null && sites.error === null;
  const error = articles.error ?? jobs.error ?? sites.error;
  if (loading) return <CardsSkeleton theme={theme} />;
  return (
    <section>
      {error !== null && (
        <SectionError
          message={error}
          onRetry={() => {
            articles.reload();
            jobs.reload();
            sites.reload();
          }}
          theme={theme}
        />
      )}
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

function Articles({ call, theme, tg }: { call: Call; theme: MiniAppPalette; tg: TelegramApi }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const loaded = useLoad('articles', () => call<{ articles: readonly ArticleSummary[] }>('/api/tg/app/articles', {}));
  useEffect(() => {
    if (publishing) {
      tg.showBack(() => {
        tg.haptic('light');
        setPublishing(false);
      });
      return () => tg.hideBack();
    }
    if (editing) {
      tg.showBack(() => {
        tg.haptic('light');
        setEditing(false);
      });
      return () => tg.hideBack();
    }
    if (selectedId !== null) {
      tg.showBack(() => {
        tg.haptic('light');
        setSelectedId(null);
      });
      return () => tg.hideBack();
    }
    tg.hideBack();
    return undefined;
  }, [publishing, editing, selectedId, tg]);
  const statusOptions = useMemo(
    () => [...new Set((loaded.data?.articles ?? []).map((article) => article.status))].map((status) => ({ value: status, label: status })),
    [loaded.data],
  );
  return (
    <section>
      <button
        type="button"
        style={{ ...btnAcc, width: '100%' }}
        onClick={() => {
          setSelectedId(null);
          setEditing(true);
        }}
      >
        ＋ Baru
      </button>
      {loaded.data === null && loaded.error === null ? (
        <ListSkeleton rows={5} theme={theme} />
      ) : (
        <>
          {loaded.error !== null && <SectionError message={loaded.error} onRetry={loaded.reload} theme={theme} />}
          <SearchList
            items={loaded.data?.articles ?? []}
            keyOf={(article) => article.id}
            renderItem={(article) => (
              <button
                type="button"
                style={rowBtn}
                onClick={() => {
                  setSelectedId(article.id);
                  setEditing(false);
                }}
              >
                <div style={rowTitle}>{article.title}</div>
                <StatusDot value={article.status} theme={theme} />
              </button>
            )}
            searchKeys={(article) => article.title}
            placeholder="Cari judul…"
            emptyTitle="Belum ada artikel"
            emptyHint="Buat artikel pertama dari tombol di atas."
            statusFilter={{ label: 'Status', options: statusOptions, getValue: (article) => article.status }}
            theme={theme}
          />
        </>
      )}
      {editing && <ArticleEditor call={call} articleId={selectedId} theme={theme} tg={tg} done={() => { setEditing(false); loaded.reload(); }} />}
      {!editing && selectedId !== null && <ArticleDetail call={call} articleId={selectedId} refresh={() => loaded.reload()} theme={theme} tg={tg} publishing={publishing} setPublishing={setPublishing} />}
    </section>
  );
}

function ArticleEditor({ call, articleId, theme, tg, done }: { call: Call; articleId: string | null; theme: MiniAppPalette; tg: TelegramApi; done: () => void }) {
  const detail = useLoad(articleId === null ? 'new' : `edit-${articleId}`, async () => {
    if (articleId === null) return null;
    return call<{ article: ArticleDetail }>('/api/tg/app/article', { articleId });
  });
  const sites = useLoad('sites', () => call<{ regions: readonly Region[]; sites: readonly Site[] }>('/api/tg/app/sites', {}));
  const regions = (sites.data?.regions ?? []).filter((region) => region.status === 'active');
  if (articleId !== null && detail.data === null) {
    if (detail.error !== null) return <SectionError message={detail.error} onRetry={detail.reload} theme={theme} />;
    return <ListSkeleton rows={4} theme={theme} />;
  }
  return (
    <ArticleForm
      key={articleId ?? 'new'}
      call={call}
      articleId={articleId}
      initial={detail.data?.article ?? null}
      regions={regions}
      done={done}
      tg={tg}
    />
  );
}

function ArticleForm({ call, articleId, initial, regions, done, tg }: {
  call: Call;
  articleId: string | null;
  initial: ArticleDetail | null;
  regions: readonly Region[];
  done: () => void;
  tg: TelegramApi;
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
      tg.haptic('success');
      done();
    } catch (failure) {
      tg.haptic('error');
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

function ArticleDetail({ call, articleId, refresh, theme, tg, publishing, setPublishing }: { call: Call; articleId: string; refresh: () => void; theme: MiniAppPalette; tg: TelegramApi; publishing: boolean; setPublishing: (open: boolean) => void }) {
  const detail = useLoad(`detail-${articleId}`, () => call<{ article: ArticleDetail }>('/api/tg/app/article', { articleId }));
  const sites = useLoad('sites', () => call<{ sites: readonly Site[]; regions: readonly Region[] }>('/api/tg/app/sites', {}));
  const [checked, setChecked] = useState<readonly string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const article = detail.data?.article ?? null;
  const hostnames = new Map((sites.data?.sites ?? []).map((site) => [site.id, site.normalizedHostname] as const));
  const act = async (path: string, payload: Record<string, unknown>, ok: string) => {
    setNotice(null);
    try {
      await call(path, { articleId, ...payload });
      setNotice(ok);
      tg.haptic('success');
      refresh();
    } catch (failure) {
      setNotice(friendlyError(failure));
      tg.haptic('error');
    }
  };
  if (detail.data === null) {
    if (detail.error !== null) return <SectionError message={detail.error} onRetry={detail.reload} theme={theme} />;
    return <ListSkeleton rows={4} theme={theme} />;
  }
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
          onClose={() => setPublishing(false)}
          tg={tg}
        />
      )}
    </div>
  );
}

function PublishSheet({ call, articleId, sites, hostnames, checked, onToggle, done, onClose, tg }: {
  call: Call;
  articleId: string;
  sites: readonly Site[];
  hostnames: ReadonlyMap<string, string>;
  checked: readonly string[];
  onToggle: (id: string) => void;
  done: (message: string) => void;
  onClose: () => void;
  tg: TelegramApi;
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
      tg.haptic('success');
      done('Publikasi antre diproses.');
    } catch (failure) {
      tg.haptic('error');
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
        <button type="button" style={btn} disabled={busy} onClick={onClose}>
          Tutup
        </button>
      </div>
      {suggestion !== null && <pre style={pre}>{suggestion}</pre>}
    </div>
  );
}

function Jobs({ call, theme, tg }: { call: Call; theme: MiniAppPalette; tg: TelegramApi }) {
  const loaded = useLoad('jobs', () => call<{ jobs: readonly JobSummary[] }>('/api/tg/app/jobs', {}));
  const articles = useLoad('articles', () => call<{ articles: readonly ArticleSummary[] }>('/api/tg/app/articles', {}));
  const sites = useLoad('sites', () => call<{ sites: readonly Site[] }>('/api/tg/app/sites', {}));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedId === null) {
      tg.hideBack();
      return undefined;
    }
    tg.showBack(() => {
      tg.haptic('light');
      setSelectedId(null);
    });
    return () => tg.hideBack();
  }, [selectedId, tg]);
  const statusOptions = useMemo(
    () => [...new Set((loaded.data?.jobs ?? []).map((job) => job.state))].map((state) => ({ value: state, label: state })),
    [loaded.data],
  );
  const selectArticle = (articleId: string) => {
    const title = articles.data?.articles.find((article) => article.id === articleId)?.title;
    if (title === undefined) return;
    const job = [...(loaded.data?.jobs ?? [])].reverse().find((item) => item.articleTitle === title);
    if (job !== undefined) setSelectedId(job.id);
  };
  return (
    <section>
      {loaded.data === null && loaded.error === null ? (
        <ListSkeleton rows={5} theme={theme} />
      ) : (
        <>
          {loaded.error !== null && <SectionError message={loaded.error} onRetry={loaded.reload} theme={theme} />}
          {articles.data !== null && sites.data !== null && loaded.data !== null && (
            <MatrixPanel
              call={call}
              articles={articles.data.articles}
              sites={sites.data.sites}
              jobs={loaded.data.jobs}
              onSelectArticle={selectArticle}
              theme={theme}
            />
          )}
          <SearchList
            items={loaded.data?.jobs ?? []}
            keyOf={(job) => job.id}
            renderItem={(job) => (
              <button type="button" style={rowBtn} onClick={() => setSelectedId(job.id)}>
                <div style={rowTitle}>{job.articleTitle}</div>
                <StatusDot value={job.state} theme={theme} />
              </button>
            )}
            searchKeys={(job) => `${job.articleTitle} ${job.state}`}
            placeholder="Cari tayang…"
            emptyTitle="Belum ada job tayang"
            statusFilter={{ label: 'Status', options: statusOptions, getValue: (job) => job.state }}
            theme={theme}
          />
        </>
      )}
      {selectedId !== null && <JobDetail call={call} jobId={selectedId} refresh={() => loaded.reload()} theme={theme} tg={tg} />}
    </section>
  );
}

function JobDetail({ call, jobId, refresh, theme, tg }: { call: Call; jobId: string; refresh: () => void; theme: MiniAppPalette; tg: TelegramApi }) {
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
      tg.haptic('success');
      refresh();
    } catch (failure) {
      setNotice(friendlyError(failure));
      tg.haptic('error');
    }
  };
  if (job === null) {
    if (detail.error !== null) return <SectionError message={detail.error} onRetry={detail.reload} theme={theme} />;
    return <ListSkeleton rows={3} theme={theme} />;
  }
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

function Orgs({ orgs, activeId, onPick, call, theme, tg, onChanged }: {
  orgs: readonly Org[];
  activeId: string | null;
  onPick: (id: string) => void;
  call: Call;
  theme: MiniAppPalette;
  tg: TelegramApi;
  onChanged: () => void;
}) {
  const active = orgs.find((org) => org.id === activeId) ?? null;
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
      {active !== null && <OrgSubscription key={`sub-${active.id}`} call={call} org={active} theme={theme} tg={tg} onChanged={onChanged} />}
      {active !== null && <OrgInvoices key={`invoices-${active.id}`} call={call} org={active} theme={theme} />}
    </section>
  );
}

function OrgSubscription({ call, org, theme, tg, onChanged }: {
  call: Call;
  org: Org;
  theme: MiniAppPalette;
  tg: TelegramApi;
  onChanged: () => void;
}) {
  const loaded = useLoad(`sub-${org.id}`, () => call<SubscriptionState>('/api/tg/app/subscription', { action: 'state' }));
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const state = loaded.data?.state ?? null;
  const version = loaded.data?.version ?? null;
  const update = async (status: string, label: string) => {
    if (!window.confirm(`${label} langganan ${org.name}?`)) return;
    setBusy(status);
    setNotice(null);
    try {
      await call('/api/tg/app/subscription', {
        action: 'update',
        status,
        ...(version === null ? {} : { expectedVersion: version }),
      });
      tg.haptic('success');
      loaded.reload();
      onChanged();
    } catch (failure) {
      tg.haptic('error');
      setNotice(friendlyError(failure));
    } finally {
      setBusy(null);
    }
  };
  if (loaded.data === null && loaded.error === null) return <ListSkeleton rows={2} theme={theme} />;
  if (loaded.data === null) return <SectionError message={loaded.error ?? 'Gagal memuat.'} onRetry={loaded.reload} theme={theme} />;
  const actions: readonly { status: string; label: string }[] =
    state === 'active'
      ? [{ status: 'suspended', label: 'Tangguhkan' }, { status: 'cancelled', label: 'Batalkan' }]
      : state === 'suspended'
        ? [{ status: 'active', label: 'Aktifkan' }, { status: 'cancelled', label: 'Batalkan' }]
        : [{ status: 'active', label: 'Aktifkan' }];
  return (
    <div style={card}>
      <h3 style={h3}>Langganan</h3>
      <StatusDot value={state ?? 'none'} theme={theme} />
      {notice !== null && <p style={err}>{notice}</p>}
      <div style={row}>
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            style={action.status === 'active' ? btnAcc : btnDanger}
            disabled={busy !== null}
            onClick={() => void update(action.status, action.label)}
          >
            {busy === action.status ? 'Menyimpan…' : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrgInvoices({ call, org, theme }: { call: Call; org: Org; theme: MiniAppPalette }) {
  const loaded = useLoad(`invoices-${org.id}`, () =>
    call<{ state: string; invoices: readonly InvoiceSummary[] }>('/api/tg/app/invoices', {}));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (loaded.data === null && loaded.error === null) return <ListSkeleton rows={3} theme={theme} />;
  if (loaded.data === null) return <SectionError message={loaded.error ?? 'Gagal memuat.'} onRetry={loaded.reload} theme={theme} />;
  const invoices = loaded.data.invoices;
  const unpaid = invoices.filter((invoice) => invoice.status === 'unpaid');
  const settled = invoices.filter((invoice) => invoice.status !== 'unpaid');
  const unpaidTotal = unpaid.reduce((sum, invoice) => sum + invoice.amountIdr, 0);
  const issue = async () => {
    const due = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    setBusy(true);
    setNotice(null);
    try {
      await call('/api/tg/app/invoices', { action: 'issue', dueAt: due });
      loaded.reload();
    } catch (error) {
      setNotice(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };
  const pay = async (invoice: InvoiceSummary) => {
    setBusy(true);
    setNotice(null);
    try {
      await call('/api/tg/app/invoices', {
        action: 'pay',
        invoiceId: invoice.id,
        expectedVersion: invoice.version,
        paidAt: new Date().toISOString(),
      });
      loaded.reload();
    } catch (error) {
      setNotice(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };
  const share = async (invoice: InvoiceSummary) => {
    const text = [
      `Tagihan ${invoice.number} — ${org.name}`,
      `Nominal: ${formatRp(invoice.amountIdr)}`,
      invoice.dueAt === null ? null : `Jatuh tempo: ${formatDate(invoice.dueAt)}`,
      `Status: ${invoice.status === 'unpaid' ? 'BELUM BAYAR' : invoice.status.toUpperCase()}`,
    ].filter((line): line is string => line !== null).join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
        await navigator.clipboard.writeText(text);
        setNotice('Ringkasan tagihan disalin, tempel ke chat klien.');
      } else {
        setNotice(text);
      }
    } catch {
      setNotice(text);
    }
  };
  return (
    <div style={card}>
      <h3 style={h3}>Faktur</h3>
      {notice !== null && <div style={dim}>{notice}</div>}
      {unpaid.length > 0 && (
        <div style={dim}>
          {unpaid.length} belum bayar • {formatRp(unpaidTotal)}
        </div>
      )}
      <div style={row}>
        <button type="button" style={btnAcc} disabled={busy} onClick={() => void issue()}>
          Terbitkan tagihan
        </button>
      </div>
      {unpaid.length > 0 && (
        <>
          <div style={dim}>Belum bayar</div>
          {unpaid.map((invoice) => (
            <div key={invoice.id} style={rowBtn}>
              <button type="button" style={{ ...rowBtn, marginTop: 0, border: 'none', padding: 0 }} onClick={() => setSelectedId(invoice.id)}>
                <div style={rowTitle}>{invoice.number}</div>
                <div style={dim}>
                  {formatRp(invoice.amountIdr)} • {invoice.dueAt === null ? 'tanpa jatuh tempo' : `tempo ${formatDate(invoice.dueAt)}`}
                </div>
              </button>
              <StatusDot value={invoice.status} theme={theme} />
              <div style={row}>
                <button type="button" style={btn} disabled={busy} onClick={() => void share(invoice)}>
                  Bagikan
                </button>
                <button type="button" style={btnAcc} disabled={busy} onClick={() => void pay(invoice)}>
                  Tandai lunas
                </button>
              </div>
            </div>
          ))}
        </>
      )}
      <div style={dim}>Riwayat</div>
      {settled.length === 0 ? (
        <EmptyState title="Belum ada faktur lunas" hint="Faktur lunas dan void tampil di sini." theme={theme} />
      ) : (
        settled.map((invoice) => (
          <button key={invoice.id} type="button" style={rowBtn} onClick={() => setSelectedId(invoice.id)}>
            <div style={rowTitle}>{invoice.number}</div>
            <div style={dim}>
              {formatRp(invoice.amountIdr)} • {invoice.paidAt === null ? 'belum lunas' : formatDate(invoice.paidAt)}
            </div>
            <StatusDot value={invoice.status} theme={theme} />
          </button>
        ))
      )}
      {selectedId !== null && <InvoiceDetail call={call} invoiceId={selectedId} theme={theme} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function InvoiceDetail({ call, invoiceId, theme, onClose }: {
  call: Call;
  invoiceId: string;
  theme: MiniAppPalette;
  onClose: () => void;
}) {
  const detail = useLoad(`invoice-${invoiceId}`, () => call<{ invoice: InvoiceDetailRecord }>('/api/tg/app/invoices', { invoiceId }));
  if (detail.data === null) {
    if (detail.error !== null) return <SectionError message={detail.error} onRetry={detail.reload} theme={theme} />;
    return <ListSkeleton rows={3} theme={theme} />;
  }
  const invoice = detail.data.invoice;
  return (
    <div style={card}>
      <h3 style={h3}>{invoice.number}</h3>
      <StatusDot value={invoice.status} theme={theme} />
      <div style={dim}>Terbit: {formatDate(invoice.createdAt)}</div>
      <div style={dim}>Lunas: {invoice.paidAt === null ? '-' : formatDate(invoice.paidAt)}</div>
      {invoice.dueAt !== null && <div style={dim}>Jatuh tempo: {formatDate(invoice.dueAt)}</div>}
      <div style={dim}>Metode: {invoice.paymentMethod}</div>
      {invoice.billingNote !== null && invoice.billingNote !== '' && <div style={dim}>Catatan: {invoice.billingNote}</div>}
      {invoice.status === 'voided' && (
        <div style={dim}>
          Dibatalkan: {invoice.voidedAt === null ? '-' : formatDate(invoice.voidedAt)}
          {invoice.voidReason === null || invoice.voidReason === '' ? '' : ` • Alasan: ${invoice.voidReason}`}
        </div>
      )}
      <div style={row}>
        <button type="button" style={btn} onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}

const shell: CSSProperties = { background: 'var(--tg-bg)', color: 'var(--tg-text)', minHeight: '100svh', paddingTop: 'calc(16px + var(--tg-safe-top, 0px))', paddingRight: 16, paddingBottom: 'calc(76px + var(--tg-safe-bottom, 0px))', paddingLeft: 16, fontFamily: 'system-ui, sans-serif' };
const center: CSSProperties = { ...shell, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
const head: CSSProperties = { marginBottom: 12 };
const orgName: CSSProperties = { fontSize: 18, fontWeight: 700 };
const dim: CSSProperties = { color: 'var(--tg-dim)', fontSize: 13 };
const nav: CSSProperties = { position: 'fixed', left: 0, right: 0, bottom: 'var(--tg-safe-bottom, 0px)', display: 'flex', background: 'var(--tg-card)', borderTop: '1px solid var(--tg-line)' };
const tabBtn: CSSProperties = { flex: 1, padding: '12px 4px', background: 'transparent', border: 'none', color: 'var(--tg-dim)', fontSize: 14 };
const tabActive: CSSProperties = { ...tabBtn, color: 'var(--tg-accent)', fontWeight: 700 };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const cardBtn: CSSProperties = { background: 'var(--tg-card)', border: '1px solid var(--tg-line)', borderRadius: 12, padding: 16, color: 'var(--tg-text)', textAlign: 'left' };
const big: CSSProperties = { fontSize: 28, fontWeight: 800 };
const card: CSSProperties = { background: 'var(--tg-card)', border: '1px solid var(--tg-line)', borderRadius: 12, padding: 12, marginTop: 12 };
const row: CSSProperties = { display: 'flex', gap: 8, marginTop: 8 };
const rowBtn: CSSProperties = { display: 'block', width: '100%', background: 'var(--tg-card)', border: '1px solid var(--tg-line)', borderRadius: 12, padding: 12, marginTop: 8, color: 'var(--tg-text)', textAlign: 'left' };
const rowTitle: CSSProperties = { fontWeight: 600, marginBottom: 4 };
const btn: CSSProperties = { background: 'var(--tg-line)', color: 'var(--tg-text)', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 14 };
const btnAcc: CSSProperties = { ...btn, background: 'var(--tg-accent)', color: '#141126', fontWeight: 700 };
const btnDanger: CSSProperties = { ...btn, background: 'var(--tg-danger)', color: '#fff', fontWeight: 700 };
const input: CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--tg-bg)', color: 'var(--tg-text)', border: '1px solid var(--tg-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginTop: 8 };
const h3: CSSProperties = { margin: '0 0 4px', fontSize: 16 };
const err: CSSProperties = { color: 'var(--tg-danger)', fontSize: 13 };
const pre: CSSProperties = { whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--tg-text)' };
const checkRow: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', fontSize: 14 };

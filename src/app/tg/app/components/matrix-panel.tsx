'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PublishMatrix } from '@/app/tg/app/components/publish-matrix';
import type { MiniAppPalette } from '@/app/tg/app/theme';

interface MatrixPanelArticle {
  readonly id: string;
  readonly title: string;
}

interface MatrixPanelSite {
  readonly id: string;
  readonly normalizedHostname: string;
}

interface MatrixPanelJob {
  readonly id: string;
  readonly articleTitle: string;
}

interface MatrixPanelTarget {
  readonly siteId: string;
  readonly state: string;
}

type MatrixPanelCall = <T>(path: string, payload: Record<string, unknown>) => Promise<T>;

function mapTargetState(raw: string): 'live' | 'failed' | 'queued' {
  const value = raw.toLowerCase();
  if (/fail|gagal|error/.test(value)) return 'failed';
  if (/success|live|publish|tayang/.test(value)) return 'live';
  return 'queued';
}

export function MatrixPanel({
  call,
  articles,
  sites,
  jobs,
  onSelectArticle,
  theme,
}: {
  readonly call: MatrixPanelCall;
  readonly articles: readonly MatrixPanelArticle[];
  readonly sites: readonly MatrixPanelSite[];
  readonly jobs: readonly MatrixPanelJob[];
  readonly onSelectArticle: (articleId: string) => void;
  readonly theme: MiniAppPalette;
}) {
  const [targets, setTargets] = useState<ReadonlyMap<string, readonly MatrixPanelTarget[]>>(new Map());

  useEffect(() => {
    const jobByTitle = new Map<string, string>();
    for (const job of jobs) {
      if (!jobByTitle.has(job.articleTitle)) jobByTitle.set(job.articleTitle, job.id);
    }
    const missing = new Set<string>();
    for (const article of articles) {
      const jobId = jobByTitle.get(article.title);
      if (jobId !== undefined && !targets.has(jobId)) missing.add(jobId);
    }
    if (missing.size === 0) return undefined;
    let cancelled = false;
    for (const jobId of missing) {
      call<{ targets: readonly MatrixPanelTarget[] }>('/api/tg/app/job', { jobId }).then(
        (detail) => {
          if (!cancelled) setTargets((prev) => new Map(prev).set(jobId, detail.targets));
        },
        () => {
          if (!cancelled) setTargets((prev) => new Map(prev).set(jobId, []));
        },
      );
    }
    return () => {
      cancelled = true;
    };
  }, [articles, jobs, call, targets]);

  const matrixSites = useMemo(
    () => sites.map((site) => ({ id: site.id, hostname: site.normalizedHostname })),
    [sites],
  );

  const cell = useCallback(
    (articleId: string, siteId: string): 'live' | 'failed' | 'queued' | null => {
      const article = articles.find((item) => item.id === articleId);
      if (article === undefined) return null;
      const job = jobs.find((item) => item.articleTitle === article.title);
      if (job === undefined) return null;
      const list = targets.get(job.id);
      if (list === undefined) return null;
      const target = list.find((item) => item.siteId === siteId);
      if (target === undefined) return null;
      return mapTargetState(target.state);
    },
    [articles, jobs, targets],
  );

  return (
    <PublishMatrix
      articles={articles}
      sites={matrixSites}
      cell={cell}
      onSelectArticle={onSelectArticle}
      theme={theme}
    />
  );
}

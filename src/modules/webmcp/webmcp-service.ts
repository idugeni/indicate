import 'server-only';

import type { NetworkContentService } from '@/modules/delivery/network-content-service';
import type { DeliveryRepository } from '@/modules/delivery/ports';
import type { ArticleListItem, ResolvedSiteContext } from '@/modules/delivery/models';
import { isNetworkArticle } from '@/modules/delivery/models';

import { errorResult, parseWebMcpArgs, textResult } from './webmcp-tools';
import type { WebMcpCallResult, WebMcpParsedArgs, WebMcpToolName } from './webmcp-tools';

export const WEBMCP_CACHE_PATH = '/mcp';
const WEBMCP_BODY_MAX_CHARS = 8000;
const WEBMCP_CHANNEL_LIMIT = 20;

export type WebMcpThrottle = { readonly allowed: true } | { readonly allowed: false; readonly retryAfterSeconds: string };

export interface WebMcpServiceDeps {
  readonly content: Pick<NetworkContentService, 'load'>;
  readonly repository: Pick<DeliveryRepository, 'loadSiteCategories'>;
  readonly locale: string;
  readonly checkSearchThrottle: (hostname: string, requestId: string) => Promise<WebMcpThrottle>;
}

interface ArticleSummary {
  readonly title: string;
  readonly slug: string;
  readonly url: string;
  readonly description: string;
  readonly category: { readonly slug: string; readonly name: string } | null;
  readonly publishedAt: string;
}

function summarizeArticle(hostname: string, item: ArticleListItem): ArticleSummary {
  return {
    title: item.title,
    slug: item.slug,
    url: item.href.startsWith('/') ? `https://${hostname}${item.href}` : item.href,
    description: item.description,
    category: item.categorySlug === null || item.categoryName === null ? null : { slug: item.categorySlug, name: item.categoryName },
    publishedAt: item.publishedAt,
  };
}

async function siteInfo(deps: WebMcpServiceDeps, context: ResolvedSiteContext): Promise<WebMcpCallResult> {
  const site = await deps.content.load(context, {}, { path: WEBMCP_CACHE_PATH, locale: deps.locale });
  if (site === null) return errorResult('Portal is temporarily unavailable.');
  const seen = new Map<string, string>();
  for (const article of site.articles) {
    if (article.categorySlug !== null && article.categoryName !== null && !seen.has(article.categorySlug)) {
      seen.set(article.categorySlug, article.categoryName);
      if (seen.size >= WEBMCP_CHANNEL_LIMIT) break;
    }
  }
  return textResult({
    siteName: site.settings.seoSiteName ?? site.settings.name,
    description: site.settings.seoDefaultDescription ?? site.settings.description,
    tagline: site.settings.tagline,
    region: site.regionName,
    locale: site.settings.locale,
    url: `https://${context.normalizedHostname}/`,
    channels: [...seen].map(([slug, name]) => ({ slug, name })),
    recentCount: site.articles.length,
  });
}

async function searchArticles(
  deps: WebMcpServiceDeps,
  context: ResolvedSiteContext,
  args: WebMcpParsedArgs['search_articles'],
  requestId: string,
): Promise<WebMcpCallResult> {
  const throttle = await deps.checkSearchThrottle(context.normalizedHostname, requestId);
  if (!throttle.allowed) return errorResult(`Search is throttled for this portal. Retry in ${throttle.retryAfterSeconds} seconds.`);
  const site = await deps.content.load(context, { search: args.query }, { path: WEBMCP_CACHE_PATH, locale: deps.locale });
  if (site === null) return errorResult('Portal is temporarily unavailable.');
  const articles = site.articles.slice(0, args.limit).map((item) => summarizeArticle(context.normalizedHostname, item));
  return textResult({ query: args.query, count: articles.length, articles });
}

async function listArticles(
  deps: WebMcpServiceDeps,
  context: ResolvedSiteContext,
  args: WebMcpParsedArgs['list_articles'],
): Promise<WebMcpCallResult> {
  const site = await deps.content.load(
    context,
    args.categorySlug === undefined ? {} : { categorySlug: args.categorySlug },
    { path: WEBMCP_CACHE_PATH, locale: deps.locale },
  );
  if (site === null) return errorResult('Portal is temporarily unavailable.');
  const page = site.articles.slice(args.offset, args.offset + args.limit).map((item) => summarizeArticle(context.normalizedHostname, item));
  return textResult({
    count: page.length,
    windowedTotal: site.articles.length,
    hasMore: site.articles.length > args.offset + args.limit,
    articles: page,
  });
}

async function listCategories(
  deps: WebMcpServiceDeps,
  context: ResolvedSiteContext,
  args: WebMcpParsedArgs['list_categories'],
): Promise<WebMcpCallResult> {
  const categories = await deps.repository.loadSiteCategories(context, args.limit);
  return textResult({ count: categories.length, categories: categories.map((category) => ({ slug: category.slug, name: category.name })) });
}

async function getArticle(
  deps: WebMcpServiceDeps,
  context: ResolvedSiteContext,
  args: WebMcpParsedArgs['get_article'],
): Promise<WebMcpCallResult> {
  const site = await deps.content.load(context, { articleSlug: args.slug }, { path: WEBMCP_CACHE_PATH, locale: deps.locale });
  const head = site?.articles[0];
  if (head === undefined || !isNetworkArticle(head) || typeof head.body !== 'string') return errorResult('Article not found on this portal.');
  const truncated = head.body.length > WEBMCP_BODY_MAX_CHARS;
  return textResult({
    title: head.title,
    slug: head.slug,
    url: head.href.startsWith('/') ? `https://${context.normalizedHostname}${head.href}` : head.href,
    description: head.description,
    body: truncated ? head.body.slice(0, WEBMCP_BODY_MAX_CHARS) : head.body,
    truncated,
    canonicalUrl: head.canonicalUrl,
    category: head.categorySlug === null || head.categoryName === null ? null : { slug: head.categorySlug, name: head.categoryName },
    tags: [...head.tags].slice(0, 10),
    author: head.authorDisplayName ?? head.authorName,
    publisher: head.publisherName,
    publishedAt: head.publishedAt,
    updatedAt: head.updatedAt,
    imageUrl: head.imageUrl,
  });
}

/**
 * Execute one tenant-scoped WebMCP tool call.
 *
 * @param deps - Delivery reads plus a per-host search throttle.
 * @param context - Exact-hostname tenant context the call is scoped to.
 * @param name - Tool to run.
 * @param rawArgs - Untrusted arguments object from the JSON-RPC caller.
 * @param requestId - Request id carried into the throttle decision.
 * @returns MCP `CallToolResult`, successful or flagged `isError`.
 * @remarks Every read reuses the bounded delivery projections (search winds at
 * 20 rows, listings at 100, categories at the requested limit, articles at one
 * row plus its gallery), then slices to the tool limit in memory. No new
 * unbounded query exists on this path.
 */
export async function executeWebMcpTool(
  deps: WebMcpServiceDeps,
  context: ResolvedSiteContext,
  name: WebMcpToolName,
  rawArgs: unknown,
  requestId: string,
): Promise<WebMcpCallResult> {
  const parsed = parseWebMcpArgs(name, rawArgs);
  if (!parsed.ok) return errorResult(parsed.message);
  const args = parsed.value as WebMcpParsedArgs[typeof name];
  switch (name) {
    case 'site_info':
      return siteInfo(deps, context);
    case 'search_articles':
      return searchArticles(deps, context, args as WebMcpParsedArgs['search_articles'], requestId);
    case 'list_articles':
      return listArticles(deps, context, args as WebMcpParsedArgs['list_articles']);
    case 'list_categories':
      return listCategories(deps, context, args as WebMcpParsedArgs['list_categories']);
    case 'get_article':
      return getArticle(deps, context, args as WebMcpParsedArgs['get_article']);
  }
}

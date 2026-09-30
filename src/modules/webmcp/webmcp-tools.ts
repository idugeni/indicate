import 'server-only';

import { z } from 'zod';

import { SLUG_PATTERN } from '@/modules/site/slug-allocator';

export const WEBMCP_PROTOCOL_VERSION = '2025-06-18';
export const WEBMCP_SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = ['2024-11-05', '2025-03-26', WEBMCP_PROTOCOL_VERSION];
export const WEBMCP_SERVER_NAME = 'indicate-webmcp';
export const WEBMCP_SERVER_VERSION = '0.1.0';

export const WEBMCP_TOOL_NAMES = ['site_info', 'search_articles', 'list_articles', 'list_categories', 'get_article'] as const;
export type WebMcpToolName = (typeof WEBMCP_TOOL_NAMES)[number];

export interface WebMcpInputSchema {
  readonly type: 'object';
  readonly properties: Readonly<Record<string, unknown>>;
  readonly required: readonly string[];
  readonly additionalProperties: false;
}

export interface WebMcpToolDescriptor {
  readonly name: WebMcpToolName;
  readonly description: string;
  readonly inputSchema: WebMcpInputSchema;
  readonly annotations: {
    readonly title: string;
    readonly readOnlyHint: true;
    readonly destructiveHint: false;
    readonly idempotentHint: true;
    readonly openWorldHint: false;
  };
}

const slugField = z.string().trim().toLowerCase().min(1).max(300).regex(SLUG_PATTERN);

const siteInfoArgsSchema = z.object({}).strict();
const searchArticlesArgsSchema = z
  .object({
    query: z.string().trim().min(1).max(120),
    limit: z.number().int().min(1).max(10).default(5),
  })
  .strict();
const listArticlesArgsSchema = z
  .object({
    categorySlug: slugField.optional(),
    limit: z.number().int().min(1).max(10).default(5),
    offset: z.number().int().min(0).max(90).default(0),
  })
  .strict();
const listCategoriesArgsSchema = z
  .object({
    limit: z.number().int().min(1).max(20).default(20),
  })
  .strict();
const getArticleArgsSchema = z
  .object({
    slug: slugField,
  })
  .strict();

const argSchemas = {
  site_info: siteInfoArgsSchema,
  search_articles: searchArticlesArgsSchema,
  list_articles: listArticlesArgsSchema,
  list_categories: listCategoriesArgsSchema,
  get_article: getArticleArgsSchema,
} as const;

export type WebMcpParsedArgs = {
  readonly [K in WebMcpToolName]: z.output<(typeof argSchemas)[K]>;
};

export type WebMcpParseOutcome =
  | { readonly ok: true; readonly value: WebMcpParsedArgs[WebMcpToolName] }
  | { readonly ok: false; readonly message: string };

/**
 * Validate raw `tools/call` arguments against the named tool schema.
 *
 * @param name - Tool whose schema applies.
 * @param raw - Untrusted arguments object from the JSON-RPC caller.
 * @returns Parsed arguments, or a human-readable rejection for `-32602`.
 */
export function parseWebMcpArgs(name: WebMcpToolName, raw: unknown): WebMcpParseOutcome {
  const parsed = argSchemas[name].safeParse(raw ?? {});
  if (parsed.success) return { ok: true, value: parsed.data as WebMcpParsedArgs[WebMcpToolName] };
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'arguments'}: ${issue.message}`).join('; ');
  return { ok: false, message: `Invalid arguments for ${name}: ${issues}` };
}

/**
 * Check whether a tools/call target names a registered tool.
 *
 * @param name - Candidate tool name from the JSON-RPC caller.
 * @returns True when the name is one of the five tenant tools.
 */
export function isWebMcpToolName(name: unknown): name is WebMcpToolName {
  return typeof name === 'string' && (WEBMCP_TOOL_NAMES as readonly string[]).includes(name);
}

function descriptor(
  name: WebMcpToolName,
  title: string,
  description: string,
  inputSchema: WebMcpInputSchema,
): WebMcpToolDescriptor {
  return {
    name,
    description,
    inputSchema,
    annotations: { title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  };
}

export const WEBMCP_TOOLS: readonly WebMcpToolDescriptor[] = [
  descriptor('site_info', 'Portal info', 'Identify this news portal: name, description, region, channel list, and recent coverage count. Call first to scope every later query to this tenant.', {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  }),
  descriptor(
    'search_articles',
    'Search articles',
    'Full-text search over this portal published corpus only. Returns at most 10 lightweight summaries per call; narrow the query instead of paging.',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords, 1 to 120 characters.', minLength: 1, maxLength: 120 },
        limit: { type: 'integer', description: 'Maximum summaries to return (1-10, default 5).', minimum: 1, maximum: 10, default: 5 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  ),
  descriptor(
    'list_articles',
    'List articles',
    'Latest published articles on this portal, optionally filtered by one channel slug. Returns at most 10 summaries per call with an offset cursor capped at 90.',
    {
      type: 'object',
      properties: {
        categorySlug: { type: 'string', description: 'Channel slug from list_categories (kebab-case).', pattern: SLUG_PATTERN.source },
        limit: { type: 'integer', description: 'Maximum summaries to return (1-10, default 5).', minimum: 1, maximum: 10, default: 5 },
        offset: { type: 'integer', description: 'Summaries to skip (0-90, default 0).', minimum: 0, maximum: 90, default: 0 },
      },
      required: [],
      additionalProperties: false,
    },
  ),
  descriptor('list_categories', 'List channels', 'Channel (category) list of this portal, ordered by name. At most 20 entries.', {
    type: 'object',
    properties: {
      limit: { type: 'integer', description: 'Maximum channels to return (1-20, default 20).', minimum: 1, maximum: 20, default: 20 },
    },
    required: [],
    additionalProperties: false,
  }),
  descriptor(
    'get_article',
    'Read article',
    'Read one full published article by slug. Body is plain text truncated at 8000 characters; the result flags truncation so follow-ups stay honest.',
    {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Article slug from a search_articles or list_articles summary (kebab-case).', pattern: SLUG_PATTERN.source },
      },
      required: ['slug'],
      additionalProperties: false,
    },
  ),
];

export interface WebMcpTextContent {
  readonly type: 'text';
  readonly text: string;
}

export interface WebMcpCallResult {
  readonly content: readonly WebMcpTextContent[];
  readonly isError?: boolean;
}

/**
 * Wrap a payload as a successful MCP `CallToolResult`.
 *
 * @param payload - JSON-serializable result body.
 * @returns Text-content result carrying the payload.
 */
export function textResult(payload: unknown): WebMcpCallResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

/**
 * Wrap a failure message as an MCP `CallToolResult` error.
 *
 * @param message - Non-disclosing failure message for the agent.
 * @returns Text-content result flagged with `isError`.
 * @remarks Execution failures stay results (`isError`), never protocol errors:
 * the call reached the right tenant and tool, only the read could not serve.
 */
export function errorResult(message: string): WebMcpCallResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

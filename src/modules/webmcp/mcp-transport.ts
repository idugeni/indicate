import { isWebMcpToolName, parseWebMcpArgs, WEBMCP_PROTOCOL_VERSION, WEBMCP_SERVER_NAME, WEBMCP_SERVER_VERSION, WEBMCP_SUPPORTED_PROTOCOL_VERSIONS } from './webmcp-tools';
import type { WebMcpCallResult, WebMcpToolDescriptor, WebMcpToolName } from './webmcp-tools';

export const MCP_PARSE_ERROR = -32700;
export const MCP_INVALID_REQUEST = -32600;
export const MCP_METHOD_NOT_FOUND = -32601;
export const MCP_INVALID_PARAMS = -32602;
export const MCP_INTERNAL_ERROR = -32603;

const MAX_BATCH_MESSAGES = 10;

export type McpToolExecutor = (name: WebMcpToolName, args: unknown) => Promise<WebMcpCallResult>;

export interface McpDispatchOptions {
  readonly tools: readonly WebMcpToolDescriptor[];
  readonly execute: McpToolExecutor;
  readonly maxBatch?: number;
}

export interface McpDispatchOutcome {
  readonly status: 200 | 202;
  readonly payload: unknown;
}

interface RpcEnvelope {
  readonly id: string | number | null | undefined;
  readonly method: string;
  readonly params: unknown;
}

interface RpcFailure {
  readonly id: string | number | null;
  readonly code: number;
  readonly message: string;
}

function errorPayload(failure: RpcFailure): Record<string, unknown> {
  return { jsonrpc: '2.0', id: failure.id, error: { code: failure.code, message: failure.message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readEnvelope(message: unknown): RpcEnvelope | null {
  if (!isRecord(message)) return null;
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') return null;
  const id = message.id;
  if (id !== undefined && typeof id !== 'string' && typeof id !== 'number' && id !== null) return null;
  return { id, method: message.method, params: message.params };
}

function negotiateProtocol(params: unknown): string {
  const requested = isRecord(params) && typeof params.protocolVersion === 'string' ? params.protocolVersion : null;
  if (requested !== null && WEBMCP_SUPPORTED_PROTOCOL_VERSIONS.includes(requested)) return requested;
  return WEBMCP_PROTOCOL_VERSION;
}

async function dispatchOne(envelope: RpcEnvelope, options: McpDispatchOptions): Promise<Record<string, unknown> | null> {
  const { method, params } = envelope;
  if (method.startsWith('notifications/')) return null;
  const respond = (result: unknown): Record<string, unknown> => ({ jsonrpc: '2.0', id: envelope.id ?? null, result });
  const fail = (code: number, message: string): Record<string, unknown> => errorPayload({ id: envelope.id ?? null, code, message });
  if (envelope.id === undefined) return null;
  switch (method) {
    case 'initialize':
      return respond({
        protocolVersion: negotiateProtocol(params),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: WEBMCP_SERVER_NAME, version: WEBMCP_SERVER_VERSION },
      });
    case 'ping':
      return respond({});
    case 'tools/list':
      return respond({ tools: options.tools });
    case 'tools/call': {
      if (!isRecord(params) || !isWebMcpToolName(params.name)) {
        const label = isRecord(params) && typeof params.name === 'string' ? params.name : 'unknown';
        return fail(MCP_INVALID_PARAMS, `Unknown tool: ${label}.`);
      }
      const parsed = parseWebMcpArgs(params.name, params.arguments);
      if (!parsed.ok) return fail(MCP_INVALID_PARAMS, parsed.message);
      try {
        return respond(await options.execute(params.name, parsed.value));
      } catch {
        return fail(MCP_INTERNAL_ERROR, 'Tool execution failed.');
      }
    }
    default:
      return fail(MCP_METHOD_NOT_FOUND, `Method not found: ${method}.`);
  }
}

/**
 * Dispatch one MCP Streamable-HTTP body without any transport I/O.
 *
 * @param body - Parsed JSON body: one JSON-RPC message or a batch array.
 * @param options - Tool descriptors plus the tenant-bound executor.
 * @returns 200 with a response object (or array for batches), 202 with no payload for notifications only.
 * @remarks Pure dispatch: hostname classification, delivery reads, and HTTP
 * framing stay in the route handler, so this unit stays testable without Next
 * request mocks. Batches are capped to keep one POST from fanning out into an
 * unbounded tool burst.
 */
export async function dispatchMcpMessages(body: unknown, options: McpDispatchOptions): Promise<McpDispatchOutcome> {
  const maxBatch = options.maxBatch ?? MAX_BATCH_MESSAGES;
  if (Array.isArray(body)) {
    if (body.length === 0 || body.length > maxBatch) {
      return { status: 200, payload: errorPayload({ id: null, code: MCP_INVALID_REQUEST, message: 'Invalid batch: send 1 to 10 messages.' }) };
    }
    const envelopes = body.map(readEnvelope);
    if (envelopes.some((envelope) => envelope === null)) {
      return { status: 200, payload: errorPayload({ id: null, code: MCP_INVALID_REQUEST, message: 'Invalid Request.' }) };
    }
    const responses: unknown[] = [];
    for (const envelope of envelopes) {
      const response = await dispatchOne(envelope as RpcEnvelope, options);
      if (response !== null) responses.push(response);
    }
    if (responses.length === 0) return { status: 202, payload: null };
    return { status: 200, payload: responses };
  }
  const envelope = readEnvelope(body);
  if (envelope === null) {
    const code = body === undefined ? MCP_PARSE_ERROR : MCP_INVALID_REQUEST;
    const message = body === undefined ? 'Parse error.' : 'Invalid Request.';
    return { status: 200, payload: errorPayload({ id: null, code, message }) };
  }
  const response = await dispatchOne(envelope, options);
  if (response === null) return { status: 202, payload: null };
  return { status: 200, payload: response };
}

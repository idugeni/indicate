import { describe, expect, it, vi } from 'vitest';

import { dispatchMcpMessages, MCP_INTERNAL_ERROR, MCP_INVALID_PARAMS, MCP_INVALID_REQUEST, MCP_METHOD_NOT_FOUND, MCP_PARSE_ERROR } from '@/modules/webmcp/mcp-transport';
import { WEBMCP_PROTOCOL_VERSION, WEBMCP_SERVER_NAME, WEBMCP_TOOLS } from '@/modules/webmcp/webmcp-tools';

const options = {
  tools: WEBMCP_TOOLS,
  execute: vi.fn(async (name: string) => ({ content: [{ type: 'text' as const, text: `ok:${name}` }] })),
};

function freshOptions() {
  const execute = vi.fn(async (name: string) => ({ content: [{ type: 'text' as const, text: `ok:${name}` }] }));
  return { tools: WEBMCP_TOOLS, execute };
}

describe('dispatchMcpMessages', () => {
  it('initialize menegosiasi versi protokol dan memperkenalkan server', async () => {
    const outcome = await dispatchMcpMessages({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, options);
    expect(outcome.status).toBe(200);
    const payload = outcome.payload as { result: { protocolVersion: string; serverInfo: { name: string } } };
    expect(payload.result.protocolVersion).toBe('2025-03-26');
    expect(payload.result.serverInfo.name).toBe(WEBMCP_SERVER_NAME);
  });

  it('initialize memakai versi terbaru saat klien usang', async () => {
    const outcome = await dispatchMcpMessages({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, options);
    expect((outcome.payload as { result: { protocolVersion: string } }).result.protocolVersion).toBe(WEBMCP_PROTOCOL_VERSION);
  });

  it('tools/list mengiklankan lima tool portal', async () => {
    const outcome = await dispatchMcpMessages({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, options);
    const payload = outcome.payload as { result: { tools: readonly { name: string }[] } };
    expect(payload.result.tools.map((tool) => tool.name).sort()).toEqual(['get_article', 'list_articles', 'list_categories', 'search_articles', 'site_info']);
  });

  it('tools/call meneruskan hasil eksekutor apa adanya', async () => {
    const local = freshOptions();
    const outcome = await dispatchMcpMessages(
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'site_info', arguments: {} } },
      local,
    );
    expect(local.execute).toHaveBeenCalledWith('site_info', {});
    const payload = outcome.payload as { result: { content: readonly { text: string }[] } };
    expect(payload.result.content[0]?.text).toBe('ok:site_info');
  });

  it('tools/call menolak tool tak dikenal dan argumen buruk dengan -32602', async () => {
    const unknown = await dispatchMcpMessages(
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'drop_table', arguments: {} } },
      options,
    );
    expect((unknown.payload as { error: { code: number } }).error.code).toBe(MCP_INVALID_PARAMS);
    const badArgs = await dispatchMcpMessages(
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'search_articles', arguments: { query: '' } } },
      options,
    );
    expect((badArgs.payload as { error: { code: number } }).error.code).toBe(MCP_INVALID_PARAMS);
  });

  it('tools/call yang meledak menjadi -32603', async () => {
    const outcome = await dispatchMcpMessages(
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'site_info', arguments: {} } },
      { tools: WEBMCP_TOOLS, execute: async () => { throw new Error('db down'); } },
    );
    expect((outcome.payload as { error: { code: number } }).error.code).toBe(MCP_INTERNAL_ERROR);
  });

  it('ping menjawab kosong dan metode asing mendapat -32601', async () => {
    const ping = await dispatchMcpMessages({ jsonrpc: '2.0', id: 7, method: 'ping' }, options);
    expect((ping.payload as { result: unknown }).result).toEqual({});
    const missing = await dispatchMcpMessages({ jsonrpc: '2.0', id: 8, method: 'resources/list' }, options);
    expect((missing.payload as { error: { code: number } }).error.code).toBe(MCP_METHOD_NOT_FOUND);
  });

  it('notifikasi saja menjawab 202 tanpa payload', async () => {
    const outcome = await dispatchMcpMessages({ jsonrpc: '2.0', method: 'notifications/initialized' }, options);
    expect(outcome).toEqual({ status: 202, payload: null });
  });

  it('batch campuran mengembalikan array respons tanpa notifikasi', async () => {
    const outcome = await dispatchMcpMessages(
      [
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { jsonrpc: '2.0', id: 2, method: 'resources/list' },
      ],
      options,
    );
    expect(outcome.status).toBe(200);
    expect((outcome.payload as readonly unknown[]).length).toBe(2);
  });

  it('batch kosong, batch raksasa, dan badan non-objek ditolak', async () => {
    const empty = await dispatchMcpMessages([], options);
    expect((empty.payload as { error: { code: number } }).error.code).toBe(MCP_INVALID_REQUEST);
    const huge = await dispatchMcpMessages(new Array(11).fill({ jsonrpc: '2.0', id: 1, method: 'ping' }), options);
    expect((huge.payload as { error: { code: number } }).error.code).toBe(MCP_INVALID_REQUEST);
    const parse = await dispatchMcpMessages(undefined, options);
    expect((parse.payload as { error: { code: number } }).error.code).toBe(MCP_PARSE_ERROR);
    const invalid = await dispatchMcpMessages('ping', options);
    expect((invalid.payload as { error: { code: number } }).error.code).toBe(MCP_INVALID_REQUEST);
  });
});

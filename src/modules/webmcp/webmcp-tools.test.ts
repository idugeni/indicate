import { describe, expect, it } from 'vitest';

import {
  errorResult,
  isWebMcpToolName,
  parseWebMcpArgs,
  textResult,
  WEBMCP_PROTOCOL_VERSION,
  WEBMCP_TOOL_NAMES,
  WEBMCP_TOOLS,
} from '@/modules/webmcp/webmcp-tools';

describe('WEBMCP_TOOLS', () => {
  it('mendaftarkan lima tool baca-saja dengan nama unik', () => {
    expect(WEBMCP_TOOLS.map((tool) => tool.name).sort()).toEqual([...WEBMCP_TOOL_NAMES].sort());
    for (const tool of WEBMCP_TOOLS) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
    }
  });

  it('mewajibkan query untuk pencarian dan slug untuk artikel', () => {
    const byName = new Map(WEBMCP_TOOLS.map((tool) => [tool.name, tool]));
    expect(byName.get('search_articles')?.inputSchema.required).toEqual(['query']);
    expect(byName.get('get_article')?.inputSchema.required).toEqual(['slug']);
    expect(byName.get('site_info')?.inputSchema.required).toEqual([]);
  });
});

describe('parseWebMcpArgs', () => {
  it('menerapkan batas default saat argumen opsional absen', () => {
    expect(parseWebMcpArgs('search_articles', { query: 'rutan' })).toEqual({ ok: true, value: { query: 'rutan', limit: 5 } });
    expect(parseWebMcpArgs('list_articles', {})).toEqual({ ok: true, value: { limit: 5, offset: 0 } });
    expect(parseWebMcpArgs('list_categories', {})).toEqual({ ok: true, value: { limit: 20 } });
  });

  it('menormalkan slug menjadi kebab-case kecil', () => {
    const parsed = parseWebMcpArgs('get_article', { slug: '  Rutan-Wonosobo-2026 ' });
    expect(parsed).toEqual({ ok: true, value: { slug: 'rutan-wonosobo-2026' } });
  });

  it('menolak kueri kosong, terlalu panjang, dan kunci tak dikenal', () => {
    expect(parseWebMcpArgs('search_articles', { query: '' }).ok).toBe(false);
    expect(parseWebMcpArgs('search_articles', { query: 'x'.repeat(121) }).ok).toBe(false);
    expect(parseWebMcpArgs('search_articles', { query: 'rutan', limit: 5, extra: true }).ok).toBe(false);
  });

  it('menolak batas di luar paginasi', () => {
    expect(parseWebMcpArgs('search_articles', { query: 'rutan', limit: 0 }).ok).toBe(false);
    expect(parseWebMcpArgs('search_articles', { query: 'rutan', limit: 11 }).ok).toBe(false);
    expect(parseWebMcpArgs('list_articles', { offset: 91 }).ok).toBe(false);
    expect(parseWebMcpArgs('list_categories', { limit: 21 }).ok).toBe(false);
  });

  it('menolak slug yang bukan kebab-case', () => {
    expect(parseWebMcpArgs('get_article', { slug: 'javascript:alert(1)' }).ok).toBe(false);
    expect(parseWebMcpArgs('get_article', {}).ok).toBe(false);
  });
});

describe('isWebMcpToolName', () => {
  it('mengenali lima nama tool dan menolak sisanya', () => {
    for (const name of WEBMCP_TOOL_NAMES) expect(isWebMcpToolName(name)).toBe(true);
    expect(isWebMcpToolName('drop_table')).toBe(false);
    expect(isWebMcpToolName(null)).toBe(false);
    expect(isWebMcpToolName(42)).toBe(false);
  });
});

describe('hasil MCP', () => {
  it('membungkus payload sebagai konten teks dan menandai error', () => {
    expect(textResult({ a: 1 })).toEqual({ content: [{ type: 'text', text: '{"a":1}' }] });
    expect(errorResult('gagal')).toEqual({ content: [{ type: 'text', text: 'gagal' }], isError: true });
    expect(WEBMCP_PROTOCOL_VERSION).toBe('2025-06-18');
  });
});

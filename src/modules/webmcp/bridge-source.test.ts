import { describe, expect, it } from 'vitest';

import { buildWebMcpBridge, WEBMCP_BRIDGE_PATH, WEBMCP_DEFAULT_PACKS, WEBMCP_MCP_PATH } from '@/modules/webmcp/bridge-source';

describe('buildWebMcpBridge', () => {
  it('menautkan konstanta path dan pack default ke naskah bridge', () => {
    expect(WEBMCP_BRIDGE_PATH).toBe('/.webmcp/bridge.js');
    expect(WEBMCP_MCP_PATH).toBe('/mcp');
    expect(WEBMCP_DEFAULT_PACKS).toBe('site,page');
    const bridge = buildWebMcpBridge();
    expect(bridge).toContain(WEBMCP_DEFAULT_PACKS);
    expect(bridge).toContain(WEBMCP_MCP_PATH);
  });

  it('diam saat browser tanpa permukaan WebMCP', () => {
    const bridge = buildWebMcpBridge();
    expect(bridge).toContain('document.modelContext');
    expect(bridge).toContain("typeof surface.registerTool !== 'function'");
  });

  it('mendaftarkan pack browser statis tanpa round trip server', () => {
    const bridge = buildWebMcpBridge();
    expect(bridge).toContain('get_page_metadata');
    expect(bridge).toContain('list_page_images');
    expect(bridge).toContain('no server round trip');
    expect(bridge).toContain('signatureVerified: false');
  });

  it('memproksi pack situs ke endpoint MCP same-origin', () => {
    const bridge = buildWebMcpBridge();
    expect(bridge).toContain("method: 'tools/list'");
    expect(bridge).toContain("method: 'tools/call'");
    expect(bridge).toContain("credentials: 'same-origin'");
    expect(bridge).toContain('dataset.packs');
    expect(bridge).toContain('dataset.mcpUrl');
  });
});

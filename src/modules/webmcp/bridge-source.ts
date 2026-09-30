export const WEBMCP_BRIDGE_PATH = '/.webmcp/bridge.js';
export const WEBMCP_MCP_PATH = '/mcp';
export const WEBMCP_DEFAULT_PACKS = 'site,page';

/**
 * Build the same-origin WebMCP bridge served at `/.webmcp/bridge.js`.
 *
 * @returns Bridge source registering the `site` and `page` packs on `document.modelContext`.
 * @remarks The bridge is host-independent static text: tenant scoping happens
 * server-side in `/mcp` via the request hostname, so one cached document serves
 * every portal. It no-ops when the browser has no WebMCP surface, leaving the
 * page exactly as before. Pack wiring mirrors the Cloudflare preview this
 * implements: a dynamic pack proxying the site's own MCP server plus a static
 * pack running entirely in the visitor's browser.
 */
export function buildWebMcpBridge(): string {
  return `(function () {
  'use strict';
  function readConfig() {
    var element = document.currentScript;
    var dataset = element && element.dataset ? element.dataset : {};
    var packsRaw = typeof dataset.packs === 'string' && dataset.packs.length > 0 ? dataset.packs : '${WEBMCP_DEFAULT_PACKS}';
    var packs = packsRaw.split(',').map(function (part) { return part.trim(); }).filter(function (part) { return part.length > 0; });
    var mcpUrl = typeof dataset.mcpUrl === 'string' && dataset.mcpUrl.length > 0 ? dataset.mcpUrl : '${WEBMCP_MCP_PATH}';
    return { packs: packs, mcpUrl: mcpUrl };
  }
  function textResult(payload) {
    return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
  }
  function head(limit, value) {
    return (value || '').trim().slice(0, limit);
  }
  function collectHeadings() {
    return Array.prototype.slice.call(document.querySelectorAll('h1, h2'), 0, 10).map(function (node) {
      return { level: node.tagName.toLowerCase(), text: head(200, node.textContent) };
    });
  }
  function collectArticleLinks() {
    return Array.prototype.slice.call(document.querySelectorAll('a[href]'), 0, 200)
      .map(function (node) { return { title: head(120, node.textContent), href: node.getAttribute('href') || '' }; })
      .filter(function (link) { return link.title.length > 0 && link.href.length > 0 && link.href.charAt(0) === '/'; })
      .slice(0, 20);
  }
  function pageMetadata() {
    function meta(name) {
      var node = document.querySelector('meta[name="' + name + '"]');
      return node ? node.getAttribute('content') || '' : '';
    }
    var canonical = document.querySelector('link[rel="canonical"]');
    return {
      title: head(200, document.title),
      canonical: canonical ? canonical.getAttribute('href') || '' : '',
      description: head(300, meta('description')),
      headings: collectHeadings(),
      articleLinks: collectArticleLinks(),
    };
  }
  function pageImages() {
    var nodes = document.images ? document.images : [];
    var images = Array.prototype.slice.call(nodes, 0, 20).map(function (image) {
      return { src: image.currentSrc || image.src || '', alt: head(200, image.alt) };
    });
    return { imageCount: nodes.length, images: images, signatureVerified: false };
  }
  var config = readConfig();
  var surface = document.modelContext;
  if (!surface || typeof surface.registerTool !== 'function') return;
  function safeRegister(tool) {
    try { surface.registerTool(tool); } catch (error) { /* one bad tool never breaks the page */ }
  }
  var rpcId = 0;
  function nextId() { rpcId += 1; return rpcId; }
  function postRpc(payload) {
    return fetch(config.mcpUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (response) { return response.json(); });
  }
  if (config.packs.indexOf('page') !== -1) {
    safeRegister({
      name: 'get_page_metadata',
      description: 'Read this page title, canonical URL, meta description, headings, and article links. Runs entirely in the browser with no server round trip.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: async function () { return textResult(pageMetadata()); },
    });
    safeRegister({
      name: 'list_page_images',
      description: 'List up to 20 images on this page with their current source and alt text. Reports markup only, never fetches or verifies pixels.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: async function () { return textResult(pageImages()); },
    });
  }
  if (config.packs.indexOf('site') !== -1) {
    postRpc({ jsonrpc: '2.0', id: nextId(), method: 'tools/list', params: {} }).then(function (data) {
      var tools = data && data.result && Array.isArray(data.result.tools) ? data.result.tools : [];
      tools.forEach(function (tool) {
        safeRegister({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: async function (args) {
            var response = await postRpc({ jsonrpc: '2.0', id: nextId(), method: 'tools/call', params: { name: tool.name, arguments: args || {} } });
            if (response.error) throw new Error(response.error.message || 'mcp_error');
            return response.result;
          },
        });
      });
    }).catch(function () { /* MCP server unreachable: the page pack still works */ });
  }
})();`;
}

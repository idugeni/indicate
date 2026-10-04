// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import {
  parseSseFrame,
  parseStreamedDraft,
  splitSseFrames,
  streamDraftArticle,
  useAiStream,
} from '@/modules/ai/components/use-ai-stream';

const sseResponse = (body: string, contentType = 'text/event-stream; charset=utf-8'): Response =>
  new Response(body, { status: 200, headers: { 'Content-Type': contentType } });

describe('splitSseFrames', () => {
  it('memisahkan frame lengkap dan menyisakan ekor parsial', () => {
    const { frames, rest } = splitSseFrames('data: {"delta":"a"}\n\ndata: {"delta":"b"}\n\ndata: {"del');
    expect(frames).toHaveLength(2);
    expect(rest).toBe('data: {"del');
  });

  it('melewatkan heartbeat komentar', () => {
    const { frames, rest } = splitSseFrames(': ping\n\ndata: {"delta":"a"}\n\n');
    expect(frames).toHaveLength(1);
    expect(rest).toBe('');
  });
});

describe('parseSseFrame', () => {
  it('mengurai delta, done, dan error', () => {
    expect(parseSseFrame('data: {"delta":"halo"}')).toEqual({ kind: 'delta', delta: 'halo' });
    expect(parseSseFrame('event: done\ndata: {"text":"penuh"}')).toEqual({ kind: 'done', text: 'penuh' });
    expect(parseSseFrame('event: error\ndata: {"error":"sibuk"}')).toEqual({ kind: 'error', error: 'sibuk' });
  });

  it('mengembalikan null untuk heartbeat dan frame rusak', () => {
    expect(parseSseFrame(': ping')).toBeNull();
    expect(parseSseFrame('')).toBeNull();
    expect(parseSseFrame('data: bukan-json')).toBeNull();
    expect(parseSseFrame('data: {"tak-dikenal":1}')).toBeNull();
  });
});

describe('parseStreamedDraft', () => {
  it('mengurai JSON berpagar kode dengan slug', () => {
    const draft = parseStreamedDraft('```json\n{"title":"Banjir Surut","excerpt":"Air surut.","content":"Isi.","slug_suggestion":"banjir-surut"}\n```', 'Topik');
    expect(draft?.slug).toBe('banjir-surut');
  });

  it('memakai topik sebagai judul cadangan dan menolak sampah', () => {
    expect(parseStreamedDraft('{"title":"","excerpt":"","content":""}', 'Cadangan Valid')?.title).toBe('Cadangan Valid');
    expect(parseStreamedDraft('bukan json', 'Topik Valid')).toBeNull();
  });
});

describe('streamDraftArticle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mengakumulasi delta hingga done', async () => {
    const body = `data: ${JSON.stringify({ delta: '{"title":"' })}\n\nevent: done\ndata: ${JSON.stringify({ text: '{"title":"T"}' })}\n\n`;
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(body)));
    const deltas: string[] = [];
    const text = await streamDraftArticle({ organizationId: 'org-1', topic: 'banjir', points: '', onDelta: (delta) => deltas.push(delta) });
    expect(text).toBe('{"title":"T"}');
    expect(deltas.join('')).toBe('{"title":"');
  });

  it('melempar pesan event error agar pemanggil bisa fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse('event: error\ndata: {"error":"sibuk Coba lagi"}\n\n')));
    await expect(streamDraftArticle({ organizationId: 'org-1', topic: 'banjir', points: '' })).rejects.toThrowError(/sibuk/);
  });

  it('melempar saat respons bukan SSE agar fallback non-stream jalan', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } })));
    await expect(streamDraftArticle({ organizationId: 'org-1', topic: 'banjir', points: '' })).rejects.toThrowError(/sibuk/);
  });

  it('meneruskan pesan galat JSON saat status non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Topik minimal 5 karakter.' } }), { status: 400, headers: { 'Content-Type': 'application/json' } })),
    );
    await expect(streamDraftArticle({ organizationId: 'org-1', topic: 'x', points: '' })).rejects.toThrowError(/Topik minimal/);
  });

  it('membatalkan stream yang melebihi batas buffer tanpa fetch nyata', async () => {
    const huge = 'x'.repeat(500_001);
    const body = `data: ${JSON.stringify({ delta: huge })}\n\n`;
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(body)));
    await expect(streamDraftArticle({ organizationId: 'org-1', topic: 'banjir', points: '' })).rejects.toThrowError(/respons terlalu besar/);
  });
});

describe('useAiStream abort', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('abort menghentikan stream dan mengembalikan null tanpa fallback error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown, init?: RequestInit) => new Promise<never>((resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('dibatalkan', 'AbortError')));
      })),
    );
    const { result } = renderHook(() => useAiStream());
    let outcome: string | null | undefined;
    await act(async () => {
      const pending = result.current.start({ organizationId: 'org-1', topic: 'banjir bandang', points: '' });
      result.current.abort();
      outcome = await pending;
    });
    expect(outcome).toBeNull();
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

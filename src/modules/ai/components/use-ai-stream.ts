'use client';

import { useCallback, useRef, useState } from 'react';

import { slugify } from '@/modules/site/slugify';

/** One parsed server-sent event from the draft stream. */
export type DraftStreamEvent =
  | { readonly kind: 'delta'; readonly delta: string }
  | { readonly kind: 'done'; readonly text: string }
  | { readonly kind: 'error'; readonly error: string };

/** Client-side draft shape mirroring the server `EditorialDraft`. */
export interface StreamedDraft {
  readonly title: string;
  readonly excerpt: string;
  readonly content: string;
  readonly slug: string;
}

/**
 * Splits a decoded SSE buffer into complete frames.
 *
 * @param buffer - Decoded text accumulated so far, including a possible partial tail.
 * @returns Complete frames plus the undecoded remainder for the next read.
 */
export function splitSseFrames(buffer: string): { readonly frames: readonly string[]; readonly rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  const frames: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '' || trimmed.startsWith(':')) continue;
    frames.push(part);
  }
  return { frames, rest };
}

/**
 * Parses one complete SSE frame into a draft-stream event.
 *
 * @param frame - Single frame without the trailing blank line.
 * @returns Draft event, or null for heartbeats and unparsable frames.
 */
export function parseSseFrame(frame: string): DraftStreamEvent | null {
  let event: string | null = null;
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(dataLines.join('\n')) as unknown;
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  if (event === 'done' && typeof record.text === 'string') return { kind: 'done', text: record.text };
  if (event === 'error' && typeof record.error === 'string') return { kind: 'error', error: record.error };
  if ((event === null || event === 'message') && typeof record.delta === 'string') {
    return { kind: 'delta', delta: record.delta };
  }
  return null;
}

/**
 * Parses streamed model text into an editorial draft without touching the server parser.
 *
 * @param text - Full streamed text, optionally wrapped in a markdown code fence.
 * @param fallbackTopic - Topic used when the model leaves the title empty.
 * @returns Draft, or null when the text is not parseable draft JSON.
 */
export function parseStreamedDraft(text: string, _fallbackTopic: string): StreamedDraft | null {
  void _fallbackTopic; // Retained only for call-site compatibility; invalid drafts no longer synthesize fields.
  const compact = text.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(compact) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const requiredKeys = ['title', 'excerpt', 'content', 'slug_suggestion'];
  if (Object.keys(record).some((key) => !requiredKeys.includes(key)) || requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(record, key))) return null;
  const title = typeof record.title === 'string' ? record.title.trim().slice(0, 160) : '';
  const excerpt = typeof record.excerpt === 'string' ? record.excerpt.trim().slice(0, 400) : '';
  const content = typeof record.content === 'string' ? record.content.trim().slice(0, 20000) : '';
  const slugSource = typeof record.slug_suggestion === 'string' ? record.slug_suggestion : '';
  if (title === '' || excerpt === '' || content === '' || slugSource.trim() === '') return null;
  return { title, excerpt, content, slug: slugify(slugSource).slice(0, 120) };
}

/** Input for one streamed draft request. */
export interface StreamDraftInput {
  readonly organizationId: string;
  readonly topic: string;
  readonly points: string;
  readonly signal?: AbortSignal | undefined;
  readonly onDelta?: ((delta: string) => void) | undefined;
}

/**
 * Maximum accumulated stream text before aborting an oversized response.
 *
 * @remarks Guards the client against unbounded memory growth from a runaway stream.
 */
export const AI_STREAM_BUFFER_LIMIT = 500_000;

async function readJsonError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { readonly error?: { readonly message?: string } } | null;
  const message = typeof body?.error?.message === 'string' && body.error.message !== '' ? body.error.message : '';
  return message === '' ? 'Layanan AI sedang sibuk. Silakan coba lagi.' : message;
}

/**
 * Streams one article draft over SSE, accumulating text deltas until done.
 *
 * @param input - Tenant, topic, points, abort signal, and an optional delta listener.
 * @returns Full draft text from the terminal done event.
 * @throws {Error} When the endpoint rejects the request, the stream errors, or the payload is not SSE.
 */
export async function streamDraftArticle(input: StreamDraftInput): Promise<string> {
  const response = await fetch('/api/dashboard/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ organizationId: input.organizationId, action: 'draft-article-stream', payload: { topic: input.topic, points: input.points } }),
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  if (!response.ok) throw new Error(await readJsonError(response));
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
  const reader = response.body?.getReader();
  if (reader === undefined || reader === null) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
  const decoder = new TextDecoder();
  let buffer = '';
  let totalText = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    if (buffer.length > AI_STREAM_BUFFER_LIMIT) {
      await reader.cancel().catch(() => undefined);
      throw new Error('respons terlalu besar; stream dihentikan.');
    }
    const split = splitSseFrames(buffer);
    buffer = split.rest;
    for (const frame of split.frames) {
      const event = parseSseFrame(frame);
      if (event === null) continue;
      if (event.kind === 'delta') {
        totalText += event.delta.length;
        if (totalText > AI_STREAM_BUFFER_LIMIT) {
          await reader.cancel().catch(() => undefined);
          throw new Error('respons terlalu besar; stream dihentikan.');
        }
        input.onDelta?.(event.delta);
      } else if (event.kind === 'done') {
        await reader.cancel().catch(() => undefined);
        return event.text;
      } else {
        await reader.cancel().catch(() => undefined);
        throw new Error(event.error === '' ? 'Layanan AI sedang sibuk. Silakan coba lagi.' : event.error);
      }
    }
    if (input.signal?.aborted === true) {
      await reader.cancel().catch(() => undefined);
      throw new Error('Streaming dibatalkan.');
    }
  }
  const tail = parseSseFrame(buffer);
  if (tail !== null && tail.kind === 'done') return tail.text;
  if (tail !== null && tail.kind === 'error') {
    throw new Error(tail.error === '' ? 'Layanan AI sedang sibuk. Silakan coba lagi.' : tail.error);
  }
  throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
}

/** Live state for one streamed draft turn. */
export interface AiStreamState {
  readonly output: string;
  readonly streaming: boolean;
  readonly error: string | null;
  readonly start: (input: Omit<StreamDraftInput, 'signal' | 'onDelta'>) => Promise<string | null>;
  readonly abort: () => void;
}

/**
 * React state for one streamed draft turn with abort support.
 *
 * @remarks Hook signature is frozen: `ai-draft-assist.tsx` consumes `start` and
 * `abort` as-is, so oversized-response handling stays inside `streamDraftArticle`
 * and never changes this return shape.
 * @returns Live output, status flags, plus start and abort controls.
 */
export function useAiStream(): AiStreamState {
  const [output, setOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const start = useCallback(async (input: Omit<StreamDraftInput, 'signal' | 'onDelta'>): Promise<string | null> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStreaming(true);
    setError(null);
    setOutput('');
    try {
      const text = await streamDraftArticle({
        ...input,
        signal: controller.signal,
        onDelta: (delta) => setOutput((current) => current + delta),
      });
      setOutput(text);
      return text;
    } catch (err) {
      if (controller.signal.aborted) return null;
      const message = err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.';
      setError(message);
      throw new Error(message);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setStreaming(false);
    }
  }, []);

  return { output, streaming, error, start, abort };
}

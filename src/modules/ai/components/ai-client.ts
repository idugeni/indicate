'use client';

export type AiAction =
  | 'draft-article'
  | 'suggest-tags'
  | 'summarize-report'
  | 'moderation-reply'
  | 'vision-draft'
  | 'insight-narrative'
  | 'semantic-search'
  | 'seo-titles'
  | 'seo-meta'
  | 'seo-excerpt'
  | 'polish-body'
  | 'classify-article'
  | 'cover-image'
  | 'tts-speak'
  | 'transcribe-audio'
  | 'transcribe-to-article'
  | 'publisher-verify'
  | 'assistant-chat';

/**
 * Memanggil rute bantuan AI dasbor.
 *
 * @param organizationId - Tenant pemilik permintaan.
 * @param action - Aksi AI yang diminta.
 * @param payload - Muatan tervalidasi panjang di sisi server.
 * @returns Badan JSON respons.
 */
export async function callAi(organizationId: string, action: AiAction, payload: Record<string, unknown>): Promise<unknown> {
  const response = await fetch('/api/dashboard/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, action, payload }),
  });
  const body = (await response.json().catch(() => null)) as { readonly error?: { readonly message?: string } } | null;
  if (!response.ok) throw new Error(typeof body?.error?.message === 'string' && body.error.message !== '' ? body.error.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
  return body;
}

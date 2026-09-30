// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AiAssistantDialog } from '@/modules/ai/components/ai-assistant-dialog';

const aiResponse = (reply: string): Response =>
  new Response(JSON.stringify({ ok: true, reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AiAssistantDialog', () => {
  it('menampilkan status kosong saat dibuka', () => {
    render(<AiAssistantDialog organizationId="org-1" open onOpenChange={() => undefined} />);
    expect(screen.getByText('Asisten AI Redaksi')).toBeDefined();
    expect(screen.getByText('Belum ada percakapan. Tanyakan seputar judul, slug, atau alur redaksi.')).toBeDefined();
  });

  it('tidak merender konten saat tertutup', () => {
    render(<AiAssistantDialog organizationId="org-1" open={false} onOpenChange={() => undefined} />);
    expect(screen.queryByText('Asisten AI Redaksi')).toBeNull();
  });

  it('mengirim pertanyaan dan menampilkan balasan asisten', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown, init?: RequestInit) => {
        seen.push(String(url));
        const body = JSON.parse(String(init?.body ?? '{}')) as { readonly action?: string };
        expect(body.action).toBe('assistant-chat');
        return aiResponse('Gunakan slug kecil bertanda hubung.');
      }),
    );
    render(<AiAssistantDialog organizationId="org-1" open onOpenChange={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Tanya asisten redaksi'), { target: { value: 'Bagaimana membuat slug?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
    expect(await screen.findByText('Bagaimana membuat slug?')).toBeDefined();
    expect(await screen.findByText('Gunakan slug kecil bertanda hubung.')).toBeDefined();
    expect(seen).toContain('/api/dashboard/ai');
  });

  it('menampilkan role alert saat layanan sibuk', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Layanan AI sedang sibuk. Silakan coba lagi.' } }), { status: 503 })),
    );
    render(<AiAssistantDialog organizationId="org-1" open onOpenChange={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Tanya asisten redaksi'), { target: { value: 'Susun judul banjir?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
    expect(await screen.findByRole('alert')).toBeDefined();
  });

  it('menonaktifkan kirim tanpa organisasi', () => {
    render(<AiAssistantDialog open onOpenChange={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Tanya asisten redaksi'), { target: { value: 'Halo redaksi' } });
    expect(screen.getByRole('button', { name: 'Kirim' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Pilih organisasi untuk mengaktifkan asisten.')).toBeDefined();
  });

  it('melaporkan balasan lewat kanal assistant', async () => {
    const payloads: Array<{ readonly url: string; readonly body: string }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown, init?: RequestInit) => {
        payloads.push({ url: String(url), body: String(init?.body ?? '') });
        if (String(url).includes('/api/dashboard/integrations')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
        return aiResponse('Balasan redaksi.');
      }),
    );
    render(<AiAssistantDialog organizationId="org-1" open onOpenChange={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Tanya asisten redaksi'), { target: { value: 'Apa itu slug?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
    await screen.findByText('Balasan redaksi.');
    fireEvent.click(screen.getByRole('button', { name: 'Kurang membantu' }));
    await screen.findByText('Masukan tercatat. Terima kasih.');
    const report = payloads.find((entry) => entry.url.includes('/api/dashboard/integrations'));
    expect(report?.body).toContain('ai.insight.report');
    expect(report?.body).toContain('assistant');
  });
});

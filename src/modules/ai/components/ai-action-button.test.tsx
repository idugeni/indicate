// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Search } from 'lucide-react';

import { AiActionButton, AiPending } from '@/modules/ai/components/ai-action-button';

afterEach(() => {
  cleanup();
});

function classNameOf(name: RegExp): string {
  return screen.getByRole('button', { name }).className;
}

/** Exact utility token, so `hover:bg-brass-soft` never satisfies a `bg-brass` check. */
function hasClass(className: string, token: string): boolean {
  return className.split(/\s+/).includes(token);
}

describe('AiActionButton', () => {
  it('memakai teks gelap di atas permukaan brass pada aksi utama', () => {
    render(<AiActionButton busy={false} idleLabel="Buatkan" icon={Search} tone="primary" onClick={() => {}} />);
    expect(hasClass(classNameOf(/Buatkan/), 'text-bg')).toBe(true);
  });

  it('menahan kontras teks saat aksi utama sedang berjalan', () => {
    // brass-soft text on a brass fill measures 1.38:1, which hides "Memproses…".
    render(<AiActionButton busy idleLabel="Buatkan" icon={Search} tone="primary" onClick={() => {}} />);
    const className = classNameOf(/Memproses/);
    expect(hasClass(className, 'text-bg')).toBe(true);
    expect(hasClass(className, 'text-brass-soft')).toBe(false);
  });

  it('mewarnai teksWalking pada permukaan naik saat sekunder berjalan', () => {
    render(<AiActionButton busy idleLabel="Poles isi" icon={Search} onClick={() => {}} />);
    expect(hasClass(classNameOf(/Memproses/), 'text-brass-soft')).toBe(true);
  });

  it('menandai aksi utama yang nonaktif sebagai permukaan terkunci, bukan brass redup', () => {
    render(<AiActionButton busy={false} idleLabel="Buatkan" icon={Search} tone="primary" disabled onClick={() => {}} />);
    const className = classNameOf(/Buatkan/);
    expect(hasClass(className, 'text-paper-dim')).toBe(true);
    expect(hasClass(className, 'bg-brass')).toBe(false);
  });

  it('menandaai status sibuk untuk pembaca layar', () => {
    render(<AiActionButton busy idleLabel="Buatkan" icon={Search} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /Memproses/ }).getAttribute('aria-busy')).toBe('true');
  });

  it('membuat sekunder yang nonaktif terlihat inert, bukan sibuk', () => {
    render(<AiActionButton busy={false} idleLabel="Buat ulang varian" icon={Search} disabled onClick={() => {}} />);
    const className = classNameOf(/Buat ulang/);
    expect(hasClass(className, 'text-paper-faint')).toBe(true);
    expect(hasClass(className, 'ai-busy-glow')).toBe(false);
    expect(hasClass(className, 'text-brass-soft')).toBe(false);
  });

  it('menerima aksi teks tanpa ikon', () => {
    render(<AiActionButton busy={false} idleLabel="Pakai judul" size="xs" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Pakai judul' })).toBeDefined();
  });
});

describe('AiPending', () => {
  it('meng reserving area hasil dengan status yang terbaca pembaca layar', () => {
    render(<AiPending label="Menyusun judul, deskripsi, dan slug" />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Menyusun judul, deskripsi, dan slug');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });
});

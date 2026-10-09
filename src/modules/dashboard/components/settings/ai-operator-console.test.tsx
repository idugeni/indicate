// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiOperatorConsole } from '@/modules/dashboard/components/settings/ai-operator-console';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('AiOperatorConsole', () => {
  it('plans then runs a read-only check', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, executed: false, plan: { steps: [{ id: 'step_1', capabilityId: 'command-center.overview.read', arguments: {} }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, results: [{ id: 'step_1', ok: true, result: { status: 'ok' } }] }) });
    vi.stubGlobal('fetch', mockFetch);
    render(<AiOperatorConsole organizationId="11111111-1111-4111-8111-111111111111" />);
    fireEvent.change(screen.getByLabelText('Apa yang ingin diperiksa?'), { target: { value: 'Ringkas kondisi dashboard' } });
    fireEvent.click(screen.getByRole('button', { name: /Susun rencana/i }));
    expect(await screen.findByText('Rencana tervalidasi (1 langkah)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Jalankan pemeriksaan/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/\"status\": \"ok\"/)).toBeInTheDocument();
  });
});

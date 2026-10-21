// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OrganizationProfileForm } from '@/modules/dashboard/components/settings/organization-profile-form';

const PROFILE = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Portal Contoh',
  slug: 'portal-contoh',
  description: 'Penerbitan berita lokal',
  logoUrl: '/api/network/media/00000000-0000-4000-8000-000000000001',
  contactDetails: { email: 'redaksi@contoh.id', phone: '08123456789', website: 'https://contoh.id', address: 'Semarang', city: 'Kota Semarang' },
  socialLinks: { facebook: 'https://facebook.com/portal-contoh', instagram: 'https://instagram.com/portal-contoh' },
  visualIdentity: { primaryColor: '#1c1850', secondaryColor: '#0d0b26', accentColor: '#d2a93f' },
  version: 3,
  canManage: true,
  canManageLogo: true,
};

function stubFetch(save: (body: unknown) => unknown = () => PROFILE) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
    ok: true,
    json: async () => init?.method === 'POST' ? save(JSON.parse(String(init.body))) : PROFILE,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Form identitas organisasi', () => {
  it('memuat identitas organisasi dan memisahkannya dari pengaturan situs', async () => {
    stubFetch();
    render(<OrganizationProfileForm organizationId={PROFILE.id} organizationName={PROFILE.name} organizationRole="admin" />);
    expect(await screen.findByDisplayValue('Portal Contoh')).toBeDefined();
    expect(screen.getByDisplayValue('Penerbitan berita lokal')).toBeDefined();
    expect(screen.getByDisplayValue('redaksi@contoh.id')).toBeDefined();
    expect(screen.getByDisplayValue('/api/network/media/00000000-0000-4000-8000-000000000001')).toBeDefined();
    expect((screen.getByLabelText('Referensi media logo (dikelola otomatis)') as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByRole('img', { name: 'Logo Portal Contoh' })).toBeDefined();
    expect(screen.getByDisplayValue('Kota Semarang')).toBeDefined();
    expect(screen.getByDisplayValue('https://facebook.com/portal-contoh')).toBeDefined();
    expect(screen.getByDisplayValue('https://instagram.com/portal-contoh')).toBeDefined();
    expect(screen.getByText(/tidak mengubah warna template situs/i)).toBeDefined();
    expect(screen.queryByText(/pengaturan domain/i)).toBeDefined();
  });

  it('mengirim perubahan dengan versi optimistik dan menampilkan sukses', async () => {
    const fetchMock = stubFetch();
    render(<OrganizationProfileForm organizationId={PROFILE.id} organizationName={PROFILE.name} organizationRole="admin" />);
    const nameField = await screen.findByDisplayValue('Portal Contoh');
    fireEvent.change(nameField, { target: { value: 'Portal Contoh Baru' } });
    fireEvent.submit(nameField.closest('form') as HTMLFormElement);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/dashboard/organization', expect.objectContaining({ method: 'POST' })));
    const payload = JSON.parse(String(fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')?.[1]?.body)) as { expectedVersion: number; organizationId: string; name: string; contactDetails: { city: string }; socialLinks: Record<string, string> };
    expect(payload.expectedVersion).toBe(3);
    expect(payload.organizationId).toBe(PROFILE.id);
    expect(payload.name).toBe('Portal Contoh Baru');
    expect(payload.contactDetails.city).toBe('Kota Semarang');
    expect(payload.socialLinks).toEqual({ facebook: 'https://facebook.com/portal-contoh', instagram: 'https://instagram.com/portal-contoh' });
    expect(await screen.findByText('Identitas organisasi berhasil disimpan. Logo publisher dan metadata artikel ikut disinkronkan.')).toBeDefined();
  });

  it('menyediakan pemilih file logo dan menyimpan pilihan hapus lewat submit profil', async () => {
    const fetchMock = stubFetch();
    render(<OrganizationProfileForm organizationId={PROFILE.id} organizationName={PROFILE.name} organizationRole="admin" />);

    expect(await screen.findByLabelText('Pilih gambar profil organisasi')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Hapus logo/i }));
    expect(screen.getByText(/Logo akan dihapus dari profil publisher/i)).toBeDefined();

    fireEvent.submit(screen.getByDisplayValue('Portal Contoh').closest('form') as HTMLFormElement);
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const payload = JSON.parse(String(fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')?.[1]?.body)) as { logoUrl: string };
    expect(payload.logoUrl).toBe('');
  });

  it('menampilkan kegagalan pemuatan tanpa mengganti data dengan mock', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    render(<OrganizationProfileForm organizationId={PROFILE.id} organizationName={PROFILE.name} organizationRole="admin" />);
    expect(await screen.findByText(/Profil organisasi tidak dapat dimuat/i)).toBeDefined();
  });
});

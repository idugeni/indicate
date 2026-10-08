// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { DataView } from '@/modules/dashboard/components/data-view';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

afterEach(() => {
  cleanup();
});

const DASHBOARD = {
  activeDomains: 2,
  activeSites: 1,
  activeArticles: 4,
  archivedArticles: 1,
  activeMedia: 3,
  successfulSiteOutcomes: 0,
  failedSiteOutcomes: 0,
  jobsByState: { queued: 2, published: 1 },
  analytics: {
    articlesByRegion: [{ key: 'reg-1', count: 3 }],
    articlesBySite: [{ key: 'situs-1', count: 2 }],
    articlesByCategory: [{ key: 'kat-1', count: 4 }],
    articlesByPublisher: [{ key: 'pub-1', count: 4 }],
    jobsByState: [{ key: 'queued', count: 2 }],
    jobsBySiteRegionAndState: [],
    outcomesBySiteAndState: [],
    outcomesBySiteRegionAndState: [],
  },
};

describe('Tampilan data dasbor', () => {
  it('merender command center, telemetry, pipeline, dan aksi cepat', () => {
    const handleSelect = vi.fn();
    render(
      <DataView view="dashboard" data={DASHBOARD} currentPage={1} onPageChange={vi.fn()} onRefresh={vi.fn()} onSelectView={handleSelect} />,
    );
    expect(screen.getByText('INDICATE / COMMAND CENTER')).toBeDefined();
    expect(screen.getByText('Active sites')).toBeDefined();
    expect(screen.getByText('Active articles')).toBeDefined();
    expect(screen.getByText('Delivery success')).toBeDefined();
    expect(screen.getByText('Total views')).toBeDefined();
    expect(screen.getByText('What needs your attention?')).toBeDefined();
    expect(screen.getByText('What needs your attention?')).toBeDefined();
    expect(screen.getByText('Delivery success')).toBeDefined();
    expect(screen.getByText('System at a glance')).toBeDefined();
    expect(screen.getByRole('region', { name: 'Quick actions' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Operational pulse' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Write article/i }));
    expect(handleSelect).toHaveBeenCalledWith('editorial');
  });

  it('menampilkan core metrics dan loading state analytics saat data kosong', () => {
    render(<DataView view="dashboard" data={{}} currentPage={1} onPageChange={vi.fn()} onRefresh={vi.fn()} />);
    expect(screen.getByText('INDICATE / COMMAND CENTER')).toBeDefined();
    expect(screen.getByText('Active sites')).toBeDefined();
    expect(screen.getByText('Waiting for telemetry')).toBeDefined();
    expect(screen.getByText('Total views')).toBeDefined();
    expect(screen.getByRole('region', { name: 'Operational pulse' })).toBeDefined();
  });
});

describe('Tampilan data koleksi', () => {  it('menampilkan status kosong dan memanggil muat ulang', () => {
    const reload = vi.fn();
    render(
      <DataView view="configuration" data={{}} currentPage={1} onPageChange={vi.fn()} onRefresh={reload} />,
    );
    expect(screen.getByText('Belum ada data')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /muat ulang data/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('menyatakan batas server sebagai "terbaru", bukan sebagai total', () => {
    const rows = Array.from({ length: 500 }, (unused, index) => ({
      id: `log-${index}`,
      action: 'media.access.authorize',
      targetType: 'media',
      outcome: 'succeeded',
      occurredAt: '2026-09-26T10:15:00.000Z',
      changedFields: [],
      before: null,
      after: null,
    }));
    render(<DataView view="audit" data={{ auditLogs: rows }} currentPage={1} onPageChange={vi.fn()} onRefresh={vi.fn()} />);
    expect(screen.getByText('500 terbaru')).toBeDefined();
    expect(screen.queryByText('500 data')).toBeNull();
    expect(screen.getByText(/dari 500 termuat/)).toBeDefined();
  });

  it('menyatakan jumlah sebenarnya saat belum mencapai batas server', () => {
    render(
      <DataView
        view="audit"
        data={{ auditLogs: [{ id: 'log-1', action: 'x.y', targetType: 'media', outcome: 'succeeded', occurredAt: '2026-09-26T10:15:00.000Z', changedFields: [], before: null, after: null }] }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('1 data')).toBeDefined();
    expect(screen.queryByText(/termuat/)).toBeNull();
  });

  it('menyembunyikan kolom Status saat proyeksi tidak punya field status', () => {
    render(
      <DataView
        view="configuration"
        data={{
          siteSettings: [
            { id: 'ss-1', siteId: 's-1', name: 'Jurnalism - Jawa Tengah', version: 2, description: 'x' },
          ],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Jurnalism - Jawa Tengah')).toBeDefined();
    expect(screen.queryByText('Status')).toBeNull();
    expect(screen.queryByText('UNKNOWN')).toBeNull();
  });

  it('merender tabel situs dengan penomoran halaman', () => {
    const handlePageChange = vi.fn();
    render(
      <DataView
        view="configuration"
        data={{ sites: [{ id: 's-1', normalizedHostname: 'portal.example', status: 'active', version: 1 }] }}
        currentPage={1}
        onPageChange={handlePageChange}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('portal.example')).toBeDefined();
    expect(screen.getByText('1–1 dari 1')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Aksi untuk portal.example' })).toBeDefined();
  });

  it('merender audit dengan aksi, target, waktu, dan hasil', () => {
    render(
      <DataView
        view="audit"
        data={{
          auditLogs: [
            {
              id: 'log-1',
              action: 'media.access.authorize',
              targetType: 'media',
              outcome: 'denied',
              occurredAt: '2026-09-26T10:15:00.000Z',
              changedFields: [],
              before: null,
              after: null,
            },
          ],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Catatan Audit')).toBeDefined();
    expect(screen.getByText('media.access.authorize')).toBeDefined();
    expect(screen.getByText(/^media · \d/)).toBeDefined();
    expect(screen.getAllByText('denied').length).toBeGreaterThan(0);
    expect(screen.queryByText('unknown')).toBeNull();
  });

  it('merender antrean mesin dengan label Indonesia dan ringkasan kosong ringkas', () => {
    render(
      <DataView
        view="operations"
        data={{
          invalidationTasks: [{ id: 'it-1', name: 'site.settings.default_media_replaced · fatos01.my.id', status: 'completed' }],
          objectCleanupTasks: [],
          webhookReplayClaims: [],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Antrean Invalidasi Cache')).toBeDefined();
    expect(screen.getByText('Antrean Pembersihan Objek')).toBeDefined();
    expect(screen.getByText('Klaim Replay Webhook')).toBeDefined();
    expect(screen.getByText('Antrean Pembersihan Objek — tidak ada entri.')).toBeDefined();
    expect(screen.getByText('Klaim Replay Webhook — tidak ada entri.')).toBeDefined();
    // A sidecar table must not spend a full-page empty block; only a lone collection may.
    expect(screen.queryByRole('button', { name: /^muat ulang$/i })).toBeNull();
    expect(screen.getAllByText('completed').length).toBeGreaterThan(0);
  });

  it('memakai empty state penuh saat koleksi tunggal kosong', () => {
    render(
      <DataView
        view="operations"
        data={{ webhookReplayClaims: [] }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /^muat ulang$/i })).toBeDefined();
    expect(screen.getByText('Belum ada data Klaim Replay Webhook. Buat data pertama lewat formulir di halaman ini, atau muat ulang.')).toBeDefined();
  });

  it('membaca status dan kota dari amplop customer bersarang', () => {
    render(
      <DataView
        view="customers"
        data={[
          {
            customer: {
              id: 'org-1',
              name: 'BAPAS KELAS I SEMARANG',
              slug: 'bapas-kelas-i-semarang',
              status: 'active',
              customerMetadata: { city: 'Kota Semarang' },
            },
            subscription: { organizationId: 'org-1', status: 'suspended' },
          },
        ]}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Pelanggan')).toBeDefined();
    expect(screen.getByText('BAPAS KELAS I SEMARANG')).toBeDefined();
    expect(screen.getByText('Kota Semarang')).toBeDefined();
    // Customer status wins so a suspended account is not hidden behind an active subscription.
    expect(screen.getAllByText('active').length).toBeGreaterThan(0);
    expect(screen.queryByText('unknown')).toBeNull();
  });

  it('merender hanya koleksi yang diminta, berlabel Indonesia', () => {
    render(
      <DataView
        view="configuration"
        collections={['domains', 'regions']}
        data={{
          domains: [{ id: 'd-1', normalizedHostname: 'fakta01.my.id', status: 'active', version: 1 }],
          regions: [{ id: 'r-1', name: 'Wonosobo', kind: 'city', status: 'active', version: 1 }],
          roles: [{ id: 'role-1', name: 'admin', status: 'active', version: 1 }],
          sites: [{ id: 's-1', normalizedHostname: 'portal.example', status: 'active', version: 1 }],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Domain')).toBeDefined();
    expect(screen.getByText('Wilayah')).toBeDefined();
    expect(screen.getByText('fakta01.my.id')).toBeDefined();
    expect(screen.getByText('Wonosobo')).toBeDefined();
    expect(screen.queryByText('Peran')).toBeNull();
    expect(screen.queryByText('Situs')).toBeNull();
  });

  it('mengabaikan kunci koleksi yang tidak ada di payload', () => {
    render(
      <DataView
        view="configuration"
        collections={['domains', 'siteSettings']}
        data={{ domains: [{ id: 'd-1', normalizedHostname: 'fakta01.my.id', status: 'active', version: 1 }] }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Domain')).toBeDefined();
    expect(screen.queryByText('Pengaturan Situs')).toBeNull();
    expect(screen.queryByText('Belum ada data')).toBeNull();
  });

  it('memisahkan penerbit dari afiliasi dan meringkas klaim per kota', () => {
    render(
      <DataView
        view="publishers"
        data={{
          publishers: [{ id: 'pub-1', name: 'Humas Rutan', status: 'active', version: 1 }],
          affiliations: [
            { id: 'aff-1', institutionName: 'Rutan II B Wonosobo', cityName: 'Wonosobo', portalCount: 134, active: true, version: 1 },
          ],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Humas Rutan')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Penerbit' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Keterkaitan penerbit & portal' })).toBeDefined();
    expect(screen.getByText('Lembaga yang memasok berita ke jaringan, satu baris per lembaga.')).toBeDefined();
    expect(screen.getByRole('region', { name: 'Afiliasi Resmi' })).toBeDefined();
    expect(screen.getByText('Rutan II B Wonosobo')).toBeDefined();
    expect(screen.getByText('Wonosobo · 134 portal')).toBeDefined();
    expect(screen.queryByText('Tanpa nama')).toBe(null);
    expect(screen.queryByRole('region', { name: 'Situs' })).toBe(null);
  });

  it('memetakan flag aktif afiliasi ke status', () => {
    render(
      <DataView
        view="publishers"
        data={{
          publishers: [{ id: 'pub-1', name: 'Humas Rutan', status: 'active', version: 1 }],
          affiliations: [
            { id: 'aff-1', institutionName: 'Rutan II B Wonosobo', cityName: 'Wonosobo', portalCount: 134, active: true, version: 1 },
            { id: 'aff-2', institutionName: 'RS Husada Wonosobo', cityName: 'Batang', portalCount: 12, active: false, version: 1 },
          ],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByText('unknown')).toBe(null);
    const affiliationRegion = screen.getByRole('region', { name: 'Afiliasi Resmi' });
    const badges = [...affiliationRegion.querySelectorAll('tbody tr')].map((row) =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(badges).toEqual([
      'Rutan II B WonosoboWonosobo · 134 portalactiveactive',
      'RS Husada WonosoboBatang · 12 portalinactiveinactive',
    ]);
  });

  it('berpindah halaman saat koleksi melebihi satu halaman', () => {
    const handlePageChange = vi.fn();
    const manySites = Array.from({ length: 11 }, (slot, i) => ({
      id: `s-${i + 1}`,
      normalizedHostname: `portal-${i + 1}.example`,
      status: 'active',
      version: 1,
    }));
    render(
      <DataView
        view="configuration"
        data={{ sites: manySites }}
        currentPage={1}
        onPageChange={handlePageChange}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('1–10 dari 11')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('mengurutkan baris saat kepala nama diklik', () => {
    render(
      <DataView
        view="configuration"
        data={{
          sites: [
            { id: 's-b', normalizedHostname: 'portal-b.example', status: 'active', version: 1 },
            { id: 's-a', normalizedHostname: 'portal-a.example', status: 'active', version: 1 },
          ],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    const before = screen.getAllByText(/portal-[ab]\.example/).map((el) => el.textContent);
    expect(before).toEqual(['portal-b.example', 'portal-a.example']);
    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Nama' }));
    const after = screen.getAllByText(/portal-[ab]\.example/).map((el) => el.textContent);
    expect(after).toEqual(['portal-a.example', 'portal-b.example']);
  });

  it('menampilkan bilah massal saat baris dipilih', async () => {
    const { toast } = await import('sonner');
    render(
      <DataView
        view="configuration"
        data={{ sites: [{ id: 's-1', normalizedHostname: 'portal.example', status: 'active', version: 1 }] }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih semua baris halaman ini' }));
    expect(screen.getByText('1 baris terpilih')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Salin ID' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Gagal menyalin ID terpilih.'));
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.queryByText('1 baris terpilih')).toBe(null);
  });

  it('menyembunyikan kolom status lewat pengalih kolom', () => {
    render(
      <DataView
        view="configuration"
        data={{ sites: [{ id: 's-1', normalizedHostname: 'portal.example', status: 'active', version: 1 }] }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getAllByText('active')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Alihkan kolom tabel' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Status' }));
    expect(screen.queryByText('active')).toBe(null);
    expect(screen.getByText('portal.example')).toBeDefined();
  });

  it('aksi bulk memakai satu toast progres dinamis dan satu muat ulang', { timeout: 30000 }, async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({}));
    const refresh = vi.fn();
    render(
      <DataView
        view="articles"
        data={{
          articles: [
            { id: 'a-1', title: 'Berita 1', status: 'draft', version: 1 },
            { id: 'a-2', title: 'Berita 2', status: 'draft', version: 1 },
          ],
        }}
        currentPage={1}
        onPageChange={vi.fn()}
        onRefresh={refresh}
        command={command}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Pilih semua baris halaman ini' }));
    await user.click(screen.getByRole('button', { name: 'Arsipkan (2)' }));
    await waitFor(() => expect(command).toHaveBeenCalledTimes(2));
    expect(command).toHaveBeenNthCalledWith(1, 'article.archive', { id: 'a-1', expectedVersion: 1 });
    expect(command).toHaveBeenNthCalledWith(2, 'article.archive', { id: 'a-2', expectedVersion: 1 });
    // One user action, one refresh: the per-command refetch is gone.
    expect(refresh).toHaveBeenCalledTimes(1);
    // One user action, one toast: every progress update reuses the same id, so
    // sonner edits a single toast instead of stacking one per row.
    const ids = vi.mocked(toast.loading).mock.calls.map(([, options]) => options?.id);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Arsipkan: 2 dari 2 baris berhasil.', { id: ids[0] });
  });
});

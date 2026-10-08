'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  KeyRound,
  Link2,
  Mail,
  ShieldCheck,
  UserRound,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import {
  IntegrationSettings,
  type EmailStatus,
} from '@/modules/dashboard/components/settings/integration-settings';
import { AccessKeySettings } from '@/modules/dashboard/components/settings/access-key-settings';
import { LoginMethodsForm } from '@/modules/dashboard/components/settings/login-methods-form';
import { ProfileForm } from '@/modules/dashboard/components/settings/profile-form';
import type { DashboardCommand } from '@/modules/dashboard/command';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

type AccessFocus = 'overview' | 'api' | 'dashboard' | 'identity' | 'profile';

interface KeyRow {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly expiresAt: string | null;
  readonly lastUsedAt: string | null;
  readonly version: number;
}

function rowsFrom(data: unknown, key: 'apiKeys' | 'accessKeys'): readonly KeyRow[] {
  if (typeof data !== 'object' || data === null || !(key in data)) return [];
  const raw = (data as Record<string, unknown>)[key];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.name !== 'string') return [];
    return [
      {
        id: row.id,
        name: row.name,
        status: typeof row.status === 'string' ? row.status : 'unknown',
        expiresAt: typeof row.expiresAt === 'string' ? row.expiresAt : null,
        lastUsedAt: typeof row.lastUsedAt === 'string' ? row.lastUsedAt : null,
        version: typeof row.version === 'number' ? row.version : 0,
      },
    ];
  });
}

function selectEmailStatus(data: unknown): EmailStatus | null {
  if (typeof data !== 'object' || data === null || !('email' in data)) return null;
  const email = (data as Record<string, unknown>).email;
  if (typeof email !== 'object' || email === null) return null;
  const status = email as Record<string, unknown>;
  if (typeof status.configured !== 'boolean' || typeof status.webhook !== 'boolean') return null;
  return {
    configured: status.configured,
    defaultFrom:
      status.defaultFrom === null || typeof status.defaultFrom === 'string'
        ? status.defaultFrom
        : null,
    webhook: status.webhook,
  };
}

function dateLabel(value: string | null): string {
  if (value === null) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const FOCUS_ITEMS: readonly {
  readonly id: AccessFocus;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
}[] = [
  { id: 'overview', label: 'Overview', description: 'Kesehatan akses dan integrasi', icon: Wifi },
  { id: 'api', label: 'API Access', description: 'Kunci, scope, dan surel', icon: KeyRound },
  {
    id: 'dashboard',
    label: 'Dashboard Access',
    description: 'Tautan akses dan pencabutan',
    icon: Link2,
  },
  { id: 'identity', label: 'Identity', description: 'Metode autentikasi akun', icon: ShieldCheck },
  { id: 'profile', label: 'Profile', description: 'Data personal pengguna', icon: UserRound },
];

export function AccessIntegrationsV2({
  data,
  command,
  permissions,
}: {
  readonly data: unknown;
  readonly command: DashboardCommand;
  readonly permissions: ReadonlySet<string>;
}) {
  const [focus, setFocus] = useState<AccessFocus>('overview');
  const [nowMs] = useState(() => Date.now());
  const apiKeys = useMemo(() => rowsFrom(data, 'apiKeys'), [data]);
  const accessKeys = useMemo(() => rowsFrom(data, 'accessKeys'), [data]);
  const email = useMemo(() => selectEmailStatus(data), [data]);
  const activeApiKeys = apiKeys.filter((row) => row.status === 'active');
  const activeAccessKeys = accessKeys.filter((row) => row.status === 'active');
  const expiringKeys = [...apiKeys, ...accessKeys].filter((row) => {
    if (row.status !== 'active' || row.expiresAt === null) return false;
    const expires = Date.parse(row.expiresAt);
    return Number.isFinite(expires) && expires <= nowMs + 30 * 24 * 60 * 60 * 1000;
  });
  const canManageKeys = permissions.has(INTEGRATIONS_PERMISSIONS.apiKeyManage);
  const canTestEmail =
    permissions.has(INTEGRATIONS_PERMISSIONS.superAdmin) ||
    permissions.has(INTEGRATIONS_PERMISSIONS.customerAdmin);

  return (
    <div className="space-y-5">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Identity & Integrations
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            Access & Integrations
          </h1>
          <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-6 text-paper-dim">
            Pusat kendali untuk koneksi akun, kredensial, akses dashboard, dan status layanan
            integrasi organisasi.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[460px]">
          {[
            ['API aktif', String(activeApiKeys.length), 'Kredensial layanan'],
            ['Akses aktif', String(activeAccessKeys.length), 'Tautan dashboard'],
            ['Perlu perhatian', String(expiringKeys.length), 'Kunci ≤ 30 hari'],
            [
              'Surel',
              email?.configured ? 'ON' : 'OFF',
              email?.webhook ? 'Webhook siap' : 'Webhook belum siap',
            ],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-lg border border-hairline bg-bg-raised px-3 py-2.5">
              <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
                {label}
              </p>
              <p className="m-0 mt-1 font-mono text-lg font-semibold text-paper">{value}</p>
              <p className="m-0 mt-0.5 truncate font-sans text-[10px] text-paper-faint">{note}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
        <nav
          aria-label="Area Access & Integrations"
          className="space-y-1 rounded-xl border border-hairline bg-bg-raised p-2"
        >
          {FOCUS_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = focus === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={selected ? 'page' : undefined}
                onClick={() => setFocus(item.id)}
                className={
                  selected
                    ? 'flex w-full items-start gap-3 rounded-lg bg-bg-raised-2 px-3 py-3 text-left text-paper ring-1 ring-brass/30'
                    : 'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-paper-dim transition-colors hover:bg-bg-raised-2 hover:text-paper'
                }
              >
                <Icon
                  className={
                    selected
                      ? 'mt-0.5 h-4 w-4 flex-none text-brass'
                      : 'mt-0.5 h-4 w-4 flex-none text-paper-faint'
                  }
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block font-sans text-xs font-semibold">{item.label}</span>
                  <span className="mt-0.5 block font-sans text-[10px] leading-4 text-paper-faint">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {focus === 'overview' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard icon={Wifi} title="Connection Posture" eyebrow="Current state">
                <div className="space-y-2">
                  {[
                    {
                      label: 'API credentials',
                      good: permissions.has(INTEGRATIONS_PERMISSIONS.apiKeyRead),
                      value: String(apiKeys.length) + ' terdaftar',
                    },
                    {
                      label: 'Dashboard access',
                      good: permissions.has(INTEGRATIONS_PERMISSIONS.apiKeyRead),
                      value: String(accessKeys.length) + ' terdaftar',
                    },
                    {
                      label: 'Transactional email',
                      good: email?.configured === true,
                      value: email?.configured
                        ? (email.defaultFrom ?? 'Configured')
                        : 'Not configured',
                    },
                    {
                      label: 'Email webhook',
                      good: email?.configured === true && email.webhook,
                      value: email?.webhook ? 'Ready' : 'Not configured',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-bg px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {item.good ? (
                          <CheckCircle2
                            className="h-4 w-4 flex-none text-signal"
                            aria-hidden="true"
                          />
                        ) : (
                          <CircleAlert
                            className="h-4 w-4 flex-none text-warning"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate font-sans text-xs text-paper">{item.label}</span>
                      </div>
                      <span className="max-w-[50%] truncate font-mono text-[10px] text-paper-faint">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                icon={CircleAlert}
                title="Attention Queue"
                eyebrow="Actionable exceptions"
              >
                {expiringKeys.length === 0 && email?.configured !== true ? (
                  <p className="m-0 font-sans text-xs leading-5 text-paper-dim">
                    Tidak ada kredensial yang segera kedaluwarsa. Layanan surel juga belum
                    dikonfigurasi pada runtime ini.
                  </p>
                ) : expiringKeys.length === 0 && (email?.webhook === true || email === null) ? (
                  <p className="m-0 flex items-center gap-2 font-sans text-xs text-signal">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Tidak ada tindakan
                    mendesak.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {expiringKeys.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setFocus('api')}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/[0.04] px-3 py-2.5 text-left hover:bg-warning/[0.08]"
                      >
                        <span className="min-w-0 truncate font-sans text-xs text-paper">
                          {row.name}
                        </span>
                        <span className="flex-none font-mono text-[10px] text-warning">
                          {dateLabel(row.expiresAt)}
                        </span>
                      </button>
                    ))}
                    {email?.configured && !email.webhook ? (
                      <button
                        type="button"
                        onClick={() => setFocus('api')}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/[0.04] px-3 py-2.5 text-left hover:bg-warning/[0.08]"
                      >
                        <span className="flex items-center gap-2 font-sans text-xs text-paper">
                          <Mail className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                          Webhook surel
                        </span>
                        <span className="font-mono text-[10px] text-warning">Periksa</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                icon={ShieldCheck}
                title="Permission Boundary"
                eyebrow="Effective access"
              >
                <p className="m-0 font-sans text-xs leading-5 text-paper-dim">
                  Tampilan mengikuti permission tenant yang aktif. Tindakan penerbitan dan
                  pencabutan tetap divalidasi ulang oleh service/API.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[INTEGRATIONS_PERMISSIONS.apiKeyRead, INTEGRATIONS_PERMISSIONS.apiKeyManage].map(
                    (permission) => (
                      <span
                        key={permission}
                        className={
                          permissions.has(permission)
                            ? 'rounded border border-signal/30 px-2 py-1 font-mono text-[10px] text-signal'
                            : 'rounded border border-hairline px-2 py-1 font-mono text-[10px] text-paper-faint'
                        }
                      >
                        {permission} · {permissions.has(permission) ? 'granted' : 'not granted'}
                      </span>
                    ),
                  )}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {focus === 'api' ? (
            <div className="space-y-4">
              <IntegrationSettings
                command={command}
                isPlatform={canTestEmail}
                email={email}
                canManage={canManageKeys}
              />
              {!canManageKeys ? (
                <p className="m-0 rounded-lg border border-hairline bg-bg-raised px-3 py-2 font-sans text-xs text-paper-faint">
                  Anda memiliki akses baca metadata, tetapi tidak memiliki{' '}
                  <code className="font-mono">api_key.manage</code> untuk menerbitkan atau mencabut
                  kredensial.
                </p>
              ) : null}
            </div>
          ) : null}
          {focus === 'dashboard' ? (
            <AccessKeySettings command={command} data={data} canManage={canManageKeys} />
          ) : null}
          {focus === 'identity' ? <LoginMethodsForm /> : null}
          {focus === 'profile' ? <ProfileForm /> : null}
        </div>
      </div>
    </div>
  );
}

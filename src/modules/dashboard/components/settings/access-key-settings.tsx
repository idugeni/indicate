'use client';

import { useId, useMemo, useState, useTransition, type FormEvent } from 'react';
import { Copy, KeyRound, Link2, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface AccessKeyListItem {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly expiresAt: string | null;
  readonly lastUsedAt: string | null;
  readonly version: number;
  readonly createdAt: string;
}

interface IssuedAccessKeyResult {
  readonly key?: { readonly id?: string };
  readonly plaintext?: string;
}

const EXPIRY_PRESETS: ReadonlyArray<{ label: string; days: number }> = [
  { label: '1 hari', days: 1 },
  { label: '7 hari', days: 7 },
  { label: '30 hari', days: 30 },
];

function selectAccessKeys(data: unknown): readonly AccessKeyListItem[] {
  if (typeof data !== 'object' || data === null || !('accessKeys' in data)) return [];
  const raw = (data as { readonly accessKeys?: unknown }).accessKeys;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): readonly AccessKeyListItem[] => {
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
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
      },
    ];
  });
}

function formatDate(value: string | null): string {
  if (value === null) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function AccessKeySettings({
  command,
  data,
  onRefresh,
}: {
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
  readonly data: unknown;
  readonly onRefresh: () => void;
}) {
  const nameId = useId();
  const [presetDays, setPresetDays] = useState(7);
  const [issuedLink, setIssuedLink] = useState<string | null>(null);
  const [isIssuing, startIssueTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const keys = useMemo(() => selectAccessKeys(data), [data]);

  const handleIssue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    if (name === '') {
      toast.error('Isi nama kunci dulu.');
      return;
    }
    startIssueTransition(async () => {
      const expiresAt = new Date(Date.now() + presetDays * 24 * 60 * 60 * 1000).toISOString();
      const result = (await command('access-key.issue', { name, expiresAt })) as IssuedAccessKeyResult | null;
      if (result?.plaintext) {
        setIssuedLink(`${window.location.origin}/auth/access-key?key=${encodeURIComponent(result.plaintext)}`);
        form.reset();
        onRefresh();
      }
    });
  };

  const handleCopyLink = async () => {
    if (!issuedLink) return;
    try {
      await navigator.clipboard.writeText(issuedLink);
      toast.success('Tautan akses tersalin.');
    } catch {
      toast.error('Gagal menyalin tautan.');
    }
  };

  const handleRevoke = (item: AccessKeyListItem) => {
    setRevokingId(item.id);
    void (async () => {
      try {
        await command('access-key.revoke', { accessKeyId: item.id, expectedVersion: item.version });
        onRefresh();
      } finally {
        setRevokingId(null);
      }
    })();
  };

  return (
    <SectionCard icon={KeyRound} title="Kunci Akses Dashboard" eyebrow="Login tanpa kata sandi">
      <p className="m-0 font-sans text-xs leading-relaxed text-paper-dim">
        Terbitkan tautan sekali-klik untuk diri sendiri. Siapa pun yang memegang tautan masuk sebagai Anda di organisasi
        ini sampai masa berlaku habis atau kunci dicabut.
      </p>
      <form noValidate onSubmit={handleIssue} className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={nameId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">
            Nama kunci
          </Label>
          <Input
            id={nameId}
            name="name"
            required
            disabled={isIssuing}
            placeholder="cth: Laptop cadangan"
            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
          />
        </div>
        <div className="space-y-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Berlaku selama</span>
          <div className="flex gap-1.5">
            {EXPIRY_PRESETS.map((preset) => (
              <Button
                key={preset.days}
                type="button"
                variant={presetDays === preset.days ? 'default' : 'outline'}
                size="sm"
                disabled={isIssuing}
                onClick={() => setPresetDays(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
        <Button type="submit" variant="default" disabled={isIssuing} className="w-full">
          {isIssuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>Terbitkan Tautan Akses</span>
        </Button>
        {issuedLink ? (
          <div className="space-y-2 rounded border border-brass/40 bg-bg p-2.5">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-brass">
              Tautan Sekali Lihat (Simpan Sekarang)
            </span>
            <div className="flex items-center justify-between gap-2">
              <code className="min-w-0 break-all font-mono text-[11px] text-paper">{issuedLink}</code>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => void handleCopyLink()} aria-label="Salin tautan akses" className="flex-none">
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </form>
      <div className="mt-4 border-t border-hairline pt-3">
        <p className="m-0 flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-wider text-paper-dim">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Kunci aktif
        </p>
        {keys.length === 0 ? (
          <p className="m-0 mt-1 font-sans text-xs text-paper-faint">Belum ada kunci akses.</p>
        ) : (
          <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
            {keys.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded border border-hairline bg-bg px-2 py-1.5">
                <div className="min-w-0">
                  <p className="m-0 truncate font-sans text-xs font-medium text-paper">{item.name}</p>
                  <p className="m-0 font-mono text-[10px] text-paper-faint">
                    {item.status} · kedaluwarsa {formatDate(item.expiresAt)} · dipakai {formatDate(item.lastUsedAt)}
                  </p>
                </div>
                {item.status === 'active' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokingId === item.id}
                    onClick={() => handleRevoke(item)}
                    aria-label={`Cabut kunci ${item.name}`}
                  >
                    {revokingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>Cabut</span>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { Loader2, UserRound } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

interface Profile {
  readonly displayName: string;
  readonly email: string | null;
  readonly bio: string | null;
  readonly locale: string | null;
  readonly timezone: string | null;
  readonly avatarUrl: string | null;
  readonly oauthAvatarUrl: string | null;
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, { cache: 'no-store', ...init });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as unknown;
}

export function ProfileForm() {
  const bioId = useId();
  const localeId = useId();
  const timezoneId = useId();
  const avatarId = useId();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState('');
  const [locale, setLocale] = useState('');
  const [timezone, setTimezone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarMode, setAvatarMode] = useState<'keep' | 'upload' | 'remove' | 'oauth'>('keep');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const body = (await api('/api/dashboard/profile')) as Profile;
      setProfile(body);
      setBio(body.bio ?? '');
      setLocale(body.locale ?? '');
      setTimezone(body.timezone ?? '');
      setAvatarFile(null);
      setAvatarMode('keep');
    } catch {
      setError('Gagal memuat profil.');
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    void (async () => {
      try {
        let avatar: Record<string, unknown> = { kind: 'keep' };
        if (avatarMode === 'remove') {
          avatar = { kind: 'remove' };
        } else if (avatarMode === 'oauth') {
          avatar = { kind: 'oauth' };
        } else if (avatarMode === 'upload' && avatarFile !== null) {
          const contentType = avatarFile.type;
          const authorized = (await api('/api/dashboard/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'request-upload', contentType, checksumSha256: await sha256Hex(avatarFile) }),
          })) as { key: string; url: string; requiredHeaders: Record<string, string> };
          const put = await fetch(authorized.url, {
            method: 'PUT',
            headers: { ...authorized.requiredHeaders, 'Content-Type': contentType },
            body: avatarFile,
          });
          if (!put.ok) throw new Error(`upload HTTP ${put.status}`);
          avatar = { kind: 'upload', key: authorized.key };
        }
        await api('/api/dashboard/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-profile',
            bio: bio.trim() === '' ? null : bio.trim(),
            locale: locale.trim() === '' ? null : locale.trim(),
            timezone: timezone.trim() === '' ? null : timezone.trim(),
            avatar,
          }),
        });
        setNotice('Profil tersimpan.');
        await reload();
      } catch {
        setError('Penyimpanan gagal. Periksa format isian.');
      } finally {
        setBusy(false);
      }
    })();
  };

  const initials = (profile?.displayName ?? '?').slice(0, 2).toUpperCase();

  return (
    <SectionCard icon={UserRound} title="Profil Saya" eyebrow="Data personal">
      {profile === null ? (
        <p className="m-0 font-mono text-xs text-paper-faint">{error ?? 'Memuat…'}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 flex-none border border-hairline">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-bg-raised-2 font-mono text-sm font-semibold text-brass">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-semibold text-paper">{profile.displayName}</p>
              <p className="truncate font-mono text-[11px] text-paper-faint">{profile.email ?? '—'}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={bioId} className="font-mono text-xs text-paper-dim">
              Bio (maks 500 karakter)
            </Label>
            <Textarea
              id={bioId}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
              rows={3}
              disabled={busy}
              placeholder="Ceritakan peran Anda…"
              className="font-sans text-xs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={localeId} className="font-mono text-xs text-paper-dim">
                Bahasa
              </Label>
              <DashboardSelect
                id={localeId}
                value={locale}
                disabled={busy}
                placeholder="— bawaan —"
                onValueChange={(next) => setLocale(next ?? '')}
              >
                <DashboardSelectItem value="">— bawaan —</DashboardSelectItem>
                <DashboardSelectItem value="id-ID">id-ID</DashboardSelectItem>
                <DashboardSelectItem value="en-US">en-US</DashboardSelectItem>
              </DashboardSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={timezoneId} className="font-mono text-xs text-paper-dim">
                Zona waktu
              </Label>
              <Input
                id={timezoneId}
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                disabled={busy}
                placeholder="Asia/Jakarta"
                className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span id={`${avatarId}-label`} className="font-mono text-xs text-paper-dim">Foto profil</span>
            <RadioGroup
              value={avatarMode}
              onValueChange={(value) => { if (value === 'keep' || value === 'upload' || value === 'oauth' || value === 'remove') setAvatarMode(value); }}
              aria-labelledby={`${avatarId}-label`}
              className="flex flex-wrap gap-2"
              disabled={busy}
            >
              {(['keep', 'upload', 'oauth', 'remove'] as const).map((mode) => (
                <span
                  key={mode}
                  className={`flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 font-sans text-xs transition-colors duration-180 ${avatarMode === mode ? 'border-brass text-paper' : 'border-hairline-strong text-paper-dim hover:text-paper'}`}
                  onClick={() => { if (!busy && !(mode === 'oauth' && profile.oauthAvatarUrl === null)) setAvatarMode(mode); }}
                >
                  <RadioGroupItem
                    id={`${avatarId}-${mode}`}
                    value={mode}
                    disabled={busy || (mode === 'oauth' && profile.oauthAvatarUrl === null)}
                    aria-label={mode === 'keep' ? 'Pertahankan' : mode === 'upload' ? 'Unggah baru' : mode === 'oauth' ? 'Foto dari Google' : 'Hapus'}
                    className="border-hairline-strong data-checked:border-brass"
                  />
                  <span>{mode === 'keep' ? 'Pertahankan' : mode === 'upload' ? 'Unggah baru' : mode === 'oauth' ? 'Foto dari Google' : 'Hapus'}</span>
                </span>
              ))}
            </RadioGroup>
            {avatarMode === 'upload' ? (
              <Input
                id={avatarId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy}
                onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                className="h-9 border-hairline-strong bg-bg px-2 font-sans text-xs text-paper file:mr-2 file:rounded file:border-hairline-strong file:bg-bg-raised-2 file:px-2 file:py-1 file:font-sans file:text-xs file:text-paper"
              />
            ) : null}
          </div>

          {error ? <FormNotice tone="error">{error}</FormNotice> : null}
          {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="submit"
              variant="default"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              <span>Simpan Profil</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              render={<Link href="/update-password">Ganti Kata Sandi</Link>}
            />
          </div>
        </form>
      )}
    </SectionCard>
  );
}

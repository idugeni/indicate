'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { Loader2, UserRound } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
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
            <label htmlFor={bioId} className="font-mono text-xs text-paper-dim">
              Bio (maks 500 karakter)
            </label>
            <textarea
              id={bioId}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
              rows={3}
              disabled={busy}
              placeholder="Ceritakan peran Anda…"
              className="w-full rounded border border-hairline-strong bg-bg px-2.5 py-2 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={localeId} className="font-mono text-xs text-paper-dim">
                Bahasa
              </label>
              <select
                id={localeId}
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
                disabled={busy}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                <option value="">— bawaan —</option>
                <option value="id-ID">id-ID</option>
                <option value="en-US">en-US</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={timezoneId} className="font-mono text-xs text-paper-dim">
                Zona waktu
              </label>
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
            <span className="font-mono text-xs text-paper-dim">Foto profil</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Foto profil">
              {(['keep', 'upload', 'oauth', 'remove'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={avatarMode === mode}
                  onClick={() => setAvatarMode(mode)}
                  disabled={busy || (mode === 'oauth' && profile.oauthAvatarUrl === null)}
                  className={`rounded border px-2.5 py-1.5 font-sans text-xs transition-colors duration-180 disabled:opacity-40 ${avatarMode === mode ? 'border-brass text-paper' : 'border-hairline-strong text-paper-dim hover:text-paper'}`}
                >
                  {mode === 'keep' ? 'Pertahankan' : mode === 'upload' ? 'Unggah baru' : mode === 'oauth' ? 'Foto dari Google' : 'Hapus'}
                </button>
              ))}
            </div>
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
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              <span>Simpan Profil</span>
            </button>
            <Link
              href="/update-password"
              className="inline-flex h-8 items-center rounded border border-hairline-strong px-3.5 font-sans text-xs text-paper-dim transition-colors duration-180 hover:text-paper"
            >
              Ganti Kata Sandi
            </Link>
          </div>
        </form>
      )}
    </SectionCard>
  );
}

'use client';

import { useCallback, useEffect, useId, useState, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { Building2, Loader2, Save, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { SOCIAL_FIELD_DEFS } from '@/modules/site/company-contact';
import { INLINE_COMPRESS, prepareImageUpload } from '@/modules/publishing/compress-image';
import { normalizeImageSource } from '@/modules/publishing/heic-source';

interface OrganizationProfile {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly logoUrl: string | null;
  readonly contactDetails: { readonly email?: string; readonly phone?: string; readonly website?: string; readonly address?: string; readonly city?: string };
  readonly socialLinks?: Readonly<Record<string, string>>;
  readonly visualIdentity: { readonly primaryColor?: string; readonly secondaryColor?: string; readonly accentColor?: string };
  readonly version: number;
  readonly canManage: boolean;
  readonly canManageLogo?: boolean;
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, init);
  const payload = await response.json().catch(() => null) as { message?: string; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.message ?? payload?.error?.message ?? `HTTP ${response.status}`);
  return payload;
}

function organizationLogoPreviewSource(logoUrl: string, organizationId: string): string | null {
  if (logoUrl === '') return null;
  const mediaReference = /^\/api\/network\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/iu.exec(logoUrl);
  return mediaReference === null
    ? logoUrl
    : `/api/dashboard/organization/logo?organizationId=${encodeURIComponent(organizationId)}&mediaId=${mediaReference[1]}`;
}

const SUPPORTED_LOGO_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/x-icon']);

export function OrganizationProfileForm({ organizationId, organizationName, organizationRole }: {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly organizationRole: string | null;
}) {
  const nameId = useId();
  const descriptionId = useId();
  const logoId = useId();
  const logoFileId = useId();
  const emailId = useId();
  const phoneId = useId();
  const websiteId = useId();
  const addressId = useId();
  const cityId = useId();
  const socialIdPrefix = useId();
  const primaryId = useId();
  const secondaryId = useId();
  const accentId = useId();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [name, setName] = useState(organizationName);
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDraftPreview, setLogoDraftPreview] = useState<string | null>(null);
  const [logoUploadStatus, setLogoUploadStatus] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [newSocialKey, setNewSocialKey] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1c1850');
  const [secondaryColor, setSecondaryColor] = useState('#0d0b26');
  const [accentColor, setAccentColor] = useState('#d2a93f');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const loaded = await requestJson(`/api/dashboard/organization?organizationId=${encodeURIComponent(organizationId)}`) as OrganizationProfile;
      setProfile(loaded);
      setName(loaded.name);
      setDescription(loaded.description ?? '');
      setLogoUrl(loaded.logoUrl ?? '');
      setEmail(loaded.contactDetails.email ?? '');
      setPhone(loaded.contactDetails.phone ?? '');
      setWebsite(loaded.contactDetails.website ?? '');
      setAddress(loaded.contactDetails.address ?? '');
      setCity(loaded.contactDetails.city ?? '');
      const loadedSocialLinks = { ...(loaded.socialLinks ?? {}) };
      setSocialLinks(loadedSocialLinks);
      setNewSocialKey(SOCIAL_FIELD_DEFS.find((field) => !(field.key in loadedSocialLinks))?.key ?? '');
      setPrimaryColor(loaded.visualIdentity.primaryColor ?? '#1c1850');
      setSecondaryColor(loaded.visualIdentity.secondaryColor ?? '#0d0b26');
      setAccentColor(loaded.visualIdentity.accentColor ?? '#d2a93f');
    } catch {
      setError('Profil organisasi tidak dapat dimuat. Periksa akses dan koneksi, lalu muat ulang halaman.');
    }
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) void reload(); });
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => () => {
    if (logoDraftPreview !== null) URL.revokeObjectURL(logoDraftPreview);
  }, [logoDraftPreview]);

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file === undefined) return;
    if (profile === null || !profile.canManageLogo) {
      setLogoUploadStatus('Akun ini tidak memiliki izin untuk mengganti logo publisher.');
      return;
    }

    setIsLogoUploading(true);
    setLogoUploadStatus('Menyiapkan gambar…');
    setError(null);
    void (async () => {
      try {
        const source = await normalizeImageSource(file, {
          onConverting: () => setLogoUploadStatus('Mengonversi HEIC ke JPEG di perangkat…'),
        });
        if (source.size > INLINE_COMPRESS.maxSourceBytes) {
          throw new Error('Ukuran gambar terlalu besar. Pilih gambar dengan ukuran lebih kecil.');
        }
        const prepared = await prepareImageUpload(source, { ...INLINE_COMPRESS, maxDimension: 1024, targetBytes: 184320 });
        if (!SUPPORTED_LOGO_MEDIA_TYPES.has(prepared.mediaType)) {
          throw new Error('Format gambar tidak didukung. Gunakan JPEG, PNG, WebP, atau AVIF.');
        }

        setLogoUploadStatus('Memesan penyimpanan media…');
        const thumbSpec = prepared.thumb === null ? undefined : {
          mediaType: 'image/webp' as const,
          sizeBytes: prepared.thumb.sizeBytes,
          checksum: prepared.thumb.checksum,
        };
        const reserved = await requestJson('/api/dashboard/publishing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            action: 'media.reserve',
            payload: {
              filename: prepared.filename,
              mediaType: prepared.mediaType,
              sizeBytes: prepared.sizeBytes,
              checksum: prepared.checksum,
              purpose: 'organization-asset',
              owner: { kind: 'organization' },
              ...(thumbSpec === undefined ? {} : { thumb: thumbSpec }),
            },
          }),
        }) as {
          readonly reservationId?: string;
          readonly authorization?: { readonly url?: string; readonly requiredHeaders?: Record<string, string> };
          readonly thumb?: { readonly authorization?: { readonly url?: string; readonly requiredHeaders?: Record<string, string> } } | null;
        };
        if (!reserved.reservationId || !reserved.authorization?.url || !reserved.authorization.requiredHeaders) {
          throw new Error('Penyimpanan gambar tidak dapat disiapkan. Coba lagi.');
        }

        setLogoUploadStatus('Mengunggah gambar ke media organisasi…');
        const uploaded = await fetch(reserved.authorization.url, {
          method: 'PUT',
          headers: reserved.authorization.requiredHeaders,
          body: prepared.blob,
        });
        if (!uploaded.ok) throw new Error('Unggahan gambar gagal. Periksa koneksi lalu coba lagi.');

        let completedThumb: { readonly sizeBytes: number; readonly checksum: string } | undefined;
        const thumbAuthorization = reserved.thumb?.authorization;
        if (prepared.thumb !== null && thumbAuthorization?.url && thumbAuthorization.requiredHeaders) {
          const thumbUploaded = await fetch(thumbAuthorization.url, {
            method: 'PUT',
            headers: thumbAuthorization.requiredHeaders,
            body: prepared.thumb.blob,
          });
          if (thumbUploaded.ok) completedThumb = { sizeBytes: prepared.thumb.sizeBytes, checksum: prepared.thumb.checksum };
        }

        setLogoUploadStatus('Memvalidasi media yang diunggah…');
        const dimensions = prepared.width !== null && prepared.height !== null
          ? { widthPx: prepared.width, heightPx: prepared.height }
          : {};
        const completed = await requestJson('/api/dashboard/publishing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            action: 'media.complete',
            payload: {
              reservationId: reserved.reservationId,
              ...dimensions,
              ...(completedThumb === undefined ? {} : { thumb: completedThumb }),
            },
          }),
        }) as { readonly id?: unknown };
        if (typeof completed.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(completed.id)) {
          throw new Error('Media selesai diunggah, tetapi ID gambarnya tidak valid.');
        }

        setLogoDraftPreview(URL.createObjectURL(prepared.blob));
        setLogoUrl(`/api/network/media/${completed.id}`);
        setLogoUploadStatus('Gambar terunggah. Klik Simpan perubahan agar logo ikut diperbarui pada publisher dan artikel.');
      } catch (cause) {
        setLogoUploadStatus(cause instanceof Error ? cause.message : 'Gagal mengunggah logo organisasi.');
      } finally {
        setIsLogoUploading(false);
      }
    })();
  };


  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profile === null || isLogoUploading) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    void (async () => {
      try {
        const saved = await requestJson('/api/dashboard/organization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            expectedVersion: profile.version,
            name,
            description,
            logoUrl: logoUrl.trim(),
            contactDetails: { email, phone, website, address, city },
            socialLinks: Object.fromEntries(Object.entries(socialLinks).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value !== '')),
            visualIdentity: { primaryColor, secondaryColor, accentColor },
          }),
        }) as OrganizationProfile;
        setProfile(saved);
        setName(saved.name);
        setLogoDraftPreview(null);
        setLogoUploadStatus(null);
        setNotice('Identitas organisasi berhasil disimpan. Logo publisher dan metadata artikel ikut disinkronkan.');
      } catch (cause) {
        setError(cause instanceof Error && cause.message.includes('409') ? 'Data organisasi berubah di sesi lain. Muat ulang sebelum menyimpan.' : cause instanceof Error ? cause.message : 'Identitas organisasi gagal disimpan.');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <SectionCard icon={Building2} title="Identitas Organisasi" eyebrow="Profil tenant">
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-hairline bg-bg p-3">
        {(logoDraftPreview ?? organizationLogoPreviewSource(logoUrl, organizationId)) !== null ? (
          <Image src={logoDraftPreview ?? organizationLogoPreviewSource(logoUrl, organizationId)!} alt={`Logo ${name || 'organisasi'}`} width={56} height={56} unoptimized className="h-14 w-14 flex-none rounded-xl border border-hairline bg-bg-raised object-contain p-1" />
        ) : (
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-hairline bg-bg-raised text-paper-faint">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1 text-xs leading-5 text-paper-dim">
          <p className="m-0 font-semibold text-paper">{name || organizationName}</p>
          <p className="m-0 mt-1">{description.trim() || 'Deskripsi organisasi belum tersedia.'}</p>
          <p className="m-0 mt-1">Identitas milik organisasi aktif, bukan pengaturan tampilan situs. Domain, template, SEO situs, integrasi, dan operasi tetap berada di area platform.</p>
          <span className="mt-1 block font-mono text-[10px] text-paper-faint">ID: {organizationId} · Peran: {organizationRole ?? 'Anggota organisasi'}</span>
        </div>
      </div>
      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}
      {profile !== null && !profile.canManage ? <FormNotice tone="muted">Profil dapat dilihat, tetapi hanya pengelola peran atau anggota organisasi yang dapat menyimpan perubahan.</FormNotice> : null}
      {profile === null ? <p className="m-0 py-4 text-sm text-paper-dim">Memuat identitas organisasi…</p> : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={nameId}>Nama organisasi</Label>
              <Input id={nameId} value={name} onChange={(event) => setName(event.target.value)} maxLength={160} minLength={2} required disabled={busy || isLogoUploading || !profile.canManage} />
              <p className="m-0 text-xs text-paper-faint">Slug sistem: {profile.slug} (tidak berubah saat nama diperbarui).</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={descriptionId}>Deskripsi</Label>
              <Textarea id={descriptionId} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} disabled={busy || isLogoUploading || !profile.canManage} placeholder="Jelaskan organisasi dan fokus penerbitannya…" />
              <p className="m-0 text-xs leading-5 text-paper-faint">Jika belum ada deskripsi khusus yang tersimpan, artikel dapat menampilkan bio publisher bawaan. Bio bawaan itu tidak disalin otomatis sebagai deskripsi resmi organisasi.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={logoId}>Logo / gambar profil organisasi</Label>
              <Input id={logoId} type="text" inputMode="url" value={logoUrl} onChange={(event) => { setLogoUrl(event.target.value); setLogoDraftPreview(null); }} placeholder="Unggah gambar atau masukkan URL HTTPS" disabled={busy || isLogoUploading || !profile.canManageLogo} />
              <div className="space-y-1.5">
                <Label htmlFor={logoFileId}>Pilih gambar profil organisasi</Label>
                <div className="flex flex-wrap items-center gap-2">
                <Input
                  id={logoFileId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/x-icon,.ico,.heic,.heif"
                  onChange={handleLogoFileChange}
                  disabled={busy || isLogoUploading || !profile.canManageLogo}
                  className="min-w-0 flex-1"
                />
                <Button type="button" variant="outline" disabled={busy || isLogoUploading || !profile.canManageLogo || logoUrl === ''} onClick={() => { setLogoUrl(''); setLogoDraftPreview(null); setLogoUploadStatus('Logo akan dihapus dari profil publisher setelah perubahan disimpan.'); }}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Hapus logo
                </Button>
                </div>
              </div>
              <p className="m-0 text-xs leading-5 text-paper-faint">Gambar diunggah ke R2 melalui media organisasi dan disimpan sebagai referensi media stabil, bukan URL presigned. Simpan perubahan untuk memperbarui publisher, author box, serta cache metadata artikel.</p>
              {logoUploadStatus ? <FormNotice tone={logoUploadStatus.startsWith('Gagal') || logoUploadStatus.includes('tidak valid') || logoUploadStatus.includes('tidak didukung') ? 'error' : 'muted'}>{logoUploadStatus}</FormNotice> : null}
              {(logoDraftPreview ?? organizationLogoPreviewSource(logoUrl, organizationId)) !== null ? (
                <Image src={logoDraftPreview ?? organizationLogoPreviewSource(logoUrl, organizationId)!} alt="Pratinjau logo organisasi" width={96} height={96} unoptimized className="mt-2 h-24 w-24 rounded-xl border border-hairline bg-bg-raised object-contain p-2" />
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={emailId}>Email kontak</Label>
              <Input id={emailId} type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} disabled={busy || !profile.canManage} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={phoneId}>Telepon</Label>
              <Input id={phoneId} value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} disabled={busy || !profile.canManage} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={websiteId}>Website organisasi (HTTPS)</Label>
              <Input id={websiteId} type="url" value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={2000} placeholder="https://organisasi.id" disabled={busy || !profile.canManage} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={addressId}>Alamat / informasi kontak</Label>
              <Textarea id={addressId} value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} rows={2} disabled={busy || !profile.canManage} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={cityId}>Kota / wilayah</Label>
              <Input id={cityId} value={city} onChange={(event) => setCity(event.target.value)} maxLength={160} disabled={busy || !profile.canManage} />
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-hairline p-4">
            <div>
              <h3 className="m-0 text-sm font-semibold text-paper">Media sosial dan kanal resmi</h3>
              <p className="m-0 mt-1 text-xs text-paper-dim">Kanal yang sudah tercatat pada profil publisher diprefill dari sana. URL baru harus menggunakan HTTPS.</p>
            </div>
            {SOCIAL_FIELD_DEFS.some((field) => field.key in socialLinks) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {SOCIAL_FIELD_DEFS.filter((field) => field.key in socialLinks).map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`${socialIdPrefix}-${field.key}`}>{field.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`${socialIdPrefix}-${field.key}`}
                        type="url"
                        value={socialLinks[field.key] ?? ''}
                        onChange={(event) => setSocialLinks((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder={field.placeholder}
                        maxLength={2000}
                        disabled={busy || !profile.canManage}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Hapus kanal ${field.label}`}
                        disabled={busy || !profile.canManage}
                        onClick={() => {
                          setSocialLinks((current) => {
                            const next = { ...current };
                            delete next[field.key];
                            return next;
                          });
                          setNewSocialKey(field.key);
                        }}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 text-xs text-paper-faint">Belum ada tautan media sosial yang tersimpan.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Pilih kanal untuk ditambahkan"
                value={newSocialKey}
                onChange={(event) => setNewSocialKey(event.target.value)}
                disabled={busy || !profile.canManage || SOCIAL_FIELD_DEFS.every((field) => field.key in socialLinks)}
                className="h-9 min-w-0 flex-1 rounded-md border border-hairline-strong bg-bg px-3 font-sans text-xs text-paper"
              >
                {SOCIAL_FIELD_DEFS.filter((field) => !(field.key in socialLinks)).map((field) => (
                  <option key={field.key} value={field.key}>{field.label}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !profile.canManage || newSocialKey === '' || newSocialKey in socialLinks}
                onClick={() => {
                  setSocialLinks((current) => ({ ...current, [newSocialKey]: '' }));
                  setNewSocialKey(SOCIAL_FIELD_DEFS.find((field) => !(field.key in socialLinks) && field.key !== newSocialKey)?.key ?? '');
                }}
              >
                Tambah kanal
              </Button>
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-hairline p-4">
            <div>
              <h3 className="m-0 text-sm font-semibold text-paper">Identitas visual</h3>
              <p className="m-0 mt-1 text-xs text-paper-dim">Warna merek organisasi, tidak mengubah warna template situs.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {([{ id: primaryId, label: 'Warna utama', value: primaryColor, set: setPrimaryColor }, { id: secondaryId, label: 'Warna sekunder', value: secondaryColor, set: setSecondaryColor }, { id: accentId, label: 'Warna aksen', value: accentColor, set: setAccentColor }] as const).map((color) => (
                <div key={color.id} className="space-y-1.5">
                  <Label htmlFor={color.id}>{color.label}</Label>
                  <div className="flex items-center gap-2">
                    <input id={color.id} type="color" value={color.value} onChange={(event) => color.set(event.target.value)} disabled={busy || !profile.canManage} aria-label={color.label} className="h-9 w-12 rounded border border-hairline bg-bg p-1" />
                    <Input value={color.value} onChange={(event) => color.set(event.target.value)} pattern="^#[0-9a-fA-F]{6}$" maxLength={7} required disabled={busy || !profile.canManage} aria-label={`${color.label} hex`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <p className="m-0 max-w-xl text-xs leading-5 text-paper-faint">Perubahan identitas dicatat dalam audit organisasi. Pengguna memerlukan hak kelola anggota atau peran untuk menyimpan.</p>
            <Button type="submit" disabled={busy || !profile.canManage || name.trim().length < 2}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
              {busy ? 'Menyimpan…' : profile.canManage ? 'Simpan identitas' : 'Hanya lihat'}
            </Button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}

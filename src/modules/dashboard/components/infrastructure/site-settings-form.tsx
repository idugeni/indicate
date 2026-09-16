'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import Image from 'next/image';
import { Loader2, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { MASTER_TEMPLATE_PRESETS } from '@/ui/themes';

const TEMPLATE_IDS = new Set(MASTER_TEMPLATE_PRESETS.map((preset) => preset.id));

function initialTemplateId(colors: Readonly<Record<string, string>> | undefined): string {
  const raw = colors?.templateId;
  return raw !== undefined && TEMPLATE_IDS.has(raw) ? raw : 'clean-blue';
}

interface SiteOption {
  readonly id: string;
  readonly normalizedHostname: string;
}

interface SiteSettingsRow {
  readonly siteId: string;
  readonly name: string;
  readonly description: string;
  readonly tagline: string | null;
  readonly colors: Readonly<Record<string, string>>;
  readonly socialLinks: Readonly<Record<string, string>>;
  readonly seo: Readonly<Record<string, unknown>>;
  readonly navigation: readonly { readonly label: string; readonly path: string }[];
  readonly logoMediaId: string | null;
  readonly faviconMediaId: string | null;
  readonly defaultMediaId: string | null;
  readonly version: number;
}

function stringify(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseRecord(raw: string, label: string): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(raw === '' ? '{}' : raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} harus berupa objek JSON.`);
  }
  return parsed as Readonly<Record<string, unknown>>;
}

function SiteSettingsEditor({
  site,
  settings,
  command,
}: {
  readonly site: SiteOption;
  readonly settings: SiteSettingsRow | undefined;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const nameId = useId();
  const descriptionId = useId();
  const taglineId = useId();
  const templateId = useId();
  const colorsId = useId();
  const logoId = useId();
  const faviconId = useId();
  const defaultMediaId = useId();
  const socialId = useId();
  const seoId = useId();
  const navigationId = useId();

  const [name, setName] = useState(settings?.name ?? site.normalizedHostname);
  const [description, setDescription] = useState(settings?.description ?? '');
  const [tagline, setTagline] = useState(settings?.tagline ?? '');
  const [logoMedia, setLogoMedia] = useState(settings?.logoMediaId ?? '');
  const [faviconMedia, setFaviconMedia] = useState(settings?.faviconMediaId ?? '');
  const [defaultMedia, setDefaultMedia] = useState(settings?.defaultMediaId ?? '');
  const [colors, setColors] = useState(stringify(settings?.colors));
  const [template, setTemplate] = useState(initialTemplateId(settings?.colors));
  const [socialLinks, setSocialLinks] = useState(stringify(settings?.socialLinks));
  const [seo, setSeo] = useState(stringify(settings?.seo));
  const [navigation, setNavigation] = useState(stringify(settings?.navigation ?? []));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const handleTemplateChange = (next: string) => {
    if (!TEMPLATE_IDS.has(next)) return;
    setTemplate(next);
    try {
      const parsed = parseRecord(colors, 'Warna') as Readonly<Record<string, string>>;
      setColors(JSON.stringify({ ...parsed, templateId: next }, null, 2));
    } catch {
      /* textarea tidak valid — template tetap tersimpan saat submit */
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    let colorsValue: Readonly<Record<string, unknown>>;
    let socialValue: Readonly<Record<string, unknown>>;
    let seoValue: Readonly<Record<string, unknown>>;
    let navigationValue: unknown;
    try {
      colorsValue = { ...parseRecord(colors, 'Warna'), templateId: template };
      socialValue = parseRecord(socialLinks, 'Tautan sosial');
      seoValue = parseRecord(seo, 'SEO');
      navigationValue = JSON.parse(navigation === '' ? '[]' : navigation);
      if (!Array.isArray(navigationValue)) throw new Error('Navigasi harus berupa array JSON.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dokumen JSON tidak valid.');
      return;
    }

    startSaveTransition(async () => {
      const result = await command('site.settings.update', {
        siteId: site.id,
        ...(settings === undefined ? {} : { expectedVersion: settings.version }),
        name: name.trim(),
        description: description.trim(),
        tagline: tagline.trim() === '' ? null : tagline.trim(),
        logoMediaId: logoMedia.trim() === '' ? null : logoMedia.trim(),
        faviconMediaId: faviconMedia.trim() === '' ? null : faviconMedia.trim(),
        defaultMediaId: defaultMedia.trim() === '' ? null : defaultMedia.trim(),
        colors: colorsValue,
        socialLinks: socialValue,
        seo: seoValue,
        navigation: navigationValue,
      });
      if (result === null) setError('Penyimpanan gagal. Periksa pesan kesalahan di atas halaman.');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={nameId} className="font-mono text-xs text-paper-dim">
            Nama kanal
          </label>
          <Input
            id={nameId}
            value={name}
            required
            disabled={isSaving}
            onChange={(event) => setName(event.target.value)}
            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={descriptionId} className="font-mono text-xs text-paper-dim">
            Deskripsi
          </label>
          <Input
            id={descriptionId}
            value={description}
            disabled={isSaving}
            onChange={(event) => setDescription(event.target.value)}
            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={taglineId} className="font-mono text-xs text-paper-dim">
          Tagline (slogan)
        </label>
        <Input
          id={taglineId}
          value={tagline}
          disabled={isSaving}
          maxLength={120}
          placeholder="Slogan pendek kanal — kosong = ikut deskripsi"
          onChange={(event) => setTagline(event.target.value)}
          className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor={logoId} className="font-mono text-xs text-paper-dim">
            Logo (ID media)
          </label>
          <Input
            id={logoId}
            value={logoMedia}
            disabled={isSaving}
            spellCheck={false}
            placeholder="UUID media aktif — wajib diisi"
            onChange={(event) => setLogoMedia(event.target.value)}
            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
          />
          {logoMedia.trim() !== '' ? (
            <a
              href={`https://${site.normalizedHostname}/api/network/media/${logoMedia.trim()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-sans text-[11px] text-paper-dim transition-colors duration-180 hover:text-paper"
            >
              <Image
                unoptimized
                src={`https://${site.normalizedHostname}/api/network/media/${logoMedia.trim()}`}
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
                className="h-6 w-6 rounded border border-hairline object-contain"
              />
              <span>Pratinjau logo di kanal</span>
            </a>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={faviconId} className="font-mono text-xs text-paper-dim">
            Favicon (ID media)
          </label>
          <Input
            id={faviconId}
            value={faviconMedia}
            disabled={isSaving}
            spellCheck={false}
            placeholder="UUID media — kosong = tanpa ikon"
            onChange={(event) => setFaviconMedia(event.target.value)}
            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
          />
          {faviconMedia.trim() !== '' ? (
            <a
              href={`https://${site.normalizedHostname}/api/network/media/${faviconMedia.trim()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-sans text-[11px] text-paper-dim transition-colors duration-180 hover:text-paper"
            >
              <Image
                unoptimized
                src={`https://${site.normalizedHostname}/api/network/media/${faviconMedia.trim()}`}
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
                className="h-6 w-6 rounded border border-hairline object-contain"
              />
              <span>Pratinjau favicon di kanal</span>
            </a>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={defaultMediaId} className="font-mono text-xs text-paper-dim">
            Gambar default OG (ID media)
          </label>
          <Input
            id={defaultMediaId}
            value={defaultMedia}
            disabled={isSaving}
            spellCheck={false}
            placeholder="UUID media — kosong = bawaan"
            onChange={(event) => setDefaultMedia(event.target.value)}
            className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
          />
          <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">
            Dipakai untuk Open Graph saat artikel tanpa gambar.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={templateId} className="font-mono text-xs text-paper-dim">
            Layout portal (template)
          </label>
          <select
            id={templateId}
            value={template}
            disabled={isSaving}
            onChange={(event) => handleTemplateChange(event.target.value)}
            className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
          >
            {MASTER_TEMPLATE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">
            {MASTER_TEMPLATE_PRESETS.find((preset) => preset.id === template)?.description}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={colorsId} className="font-mono text-xs text-paper-dim">
            Warna (objek JSON)
          </label>
          <Textarea
            id={colorsId}
            value={colors}
            disabled={isSaving}
            rows={4}
            spellCheck={false}
            onChange={(event) => setColors(event.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={socialId} className="font-mono text-xs text-paper-dim">
          Tautan sosial (objek JSON)
        </label>
        <Textarea
          id={socialId}
          value={socialLinks}
          disabled={isSaving}
          rows={4}
          spellCheck={false}
          onChange={(event) => setSocialLinks(event.target.value)}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={seoId} className="font-mono text-xs text-paper-dim">
          SEO (objek JSON)
        </label>
        <Textarea
          id={seoId}
          value={seo}
          disabled={isSaving}
          rows={4}
          spellCheck={false}
          onChange={(event) => setSeo(event.target.value)}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={navigationId} className="font-mono text-xs text-paper-dim">
          Navigasi (array JSON berisi label + path)
        </label>
        <Textarea
          id={navigationId}
          value={navigation}
          disabled={isSaving}
          rows={4}
          spellCheck={false}
          onChange={(event) => setNavigation(event.target.value)}
          className="font-mono text-xs"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          <span>{isSaving ? 'Menyimpan…' : 'Simpan pengaturan kanal'}</span>
        </button>
      </div>
    </form>
  );
}

export function SiteSettingsForm({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly sites?: readonly SiteOption[];
    readonly siteSettings?: readonly SiteSettingsRow[];
  } | null;

  const siteSelectId = useId();
  const [siteId, setSiteId] = useState('');

  const sites = model?.sites ?? [];
  const activeSiteId = siteId !== '' ? siteId : (sites[0]?.id ?? '');
  const activeSite = sites.find((site) => site.id === activeSiteId);
  const activeSettings = model?.siteSettings?.find((row) => row.siteId === activeSiteId);

  return (
    <SectionCard icon={Settings2} title="Pengaturan kanal" eyebrow="Identitas & SEO">
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <label htmlFor={siteSelectId} className="font-mono text-xs text-paper-dim">
            Pilih kanal
          </label>
          <select
            id={siteSelectId}
            value={activeSiteId}
            onChange={(event) => setSiteId(event.target.value)}
            className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.normalizedHostname}
              </option>
            ))}
          </select>
        </div>

        {activeSite === undefined ? (
          <p className="m-0 font-sans text-xs text-paper-faint">Belum ada kanal. Buat kanal dulu pada panel di atas.</p>
        ) : (
          <SiteSettingsEditor
            key={activeSite.id}
            site={activeSite}
            settings={activeSettings}
            command={command}
          />
        )}
      </div>
    </SectionCard>
  );
}

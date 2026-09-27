'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import {
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface EmailStatus {
  readonly configured: boolean;
  readonly defaultFrom: string | null;
  readonly webhook: boolean;
}

/** Default scopes offered on first open; the field stays free-form by schema. */
const DEFAULT_SCOPES: readonly string[] = ['article.read', 'publishing.read'];

export function IntegrationSettings({
  command,
  isPlatform = false,
  email = null,
}: {
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
  readonly isPlatform?: boolean;
  readonly email?: EmailStatus | null;
}) {
  const [issuedPlaintext, setIssuedPlaintext] = useState<string | null>(null);
  const [scopes, setScopes] = useState<readonly string[]>(DEFAULT_SCOPES);
  const [scopeDraft, setScopeDraft] = useState('');

  const apiKeyNameId = useId();
  const apiKeyScopesId = useId();

  const [isIssuing, startIssueTransition] = useTransition();
  const [isTestingEmail, startEmailTestTransition] = useTransition();
  const [testEmail, setTestEmail] = useState('');
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const addScope = (): void => {
    const next = scopeDraft.trim().replace(/,+$/, '');
    if (next === '') return;
    setScopes((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setScopeDraft('');
  };

  const removeScope = (scope: string): void => {
    setScopes((prev) => prev.filter((item) => item !== scope));
  };

  const handleCopyKey = async () => {
    if (!issuedPlaintext) return;
    try {
      await navigator.clipboard.writeText(issuedPlaintext);
      toast.success('Kunci API tersalin.');
    } catch {
      toast.error('Gagal menyalin kunci API.');
    }
  };

  const handleIssueKey = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    if (name === '') {
      toast.error('Isi nama kunci dulu.');
      return;
    }
    if (scopes.length === 0) {
      toast.error('Isi minimal satu cakupan dulu.');
      return;
    }

    startIssueTransition(async () => {
      const result = (await command('api-key.issue', {
        name,
        scopes: [...scopes],
        expiresAt: null,
      })) as { readonly plaintext?: string } | null;

      if (result?.plaintext) {
        setIssuedPlaintext(result.plaintext);
        form.reset();
      }
    });
  };
  const handleTestEmail = () => {
    if (testEmail.trim().length === 0) return;
    startEmailTestTransition(async () => {
      const result = (await command('email.test', { to: testEmail.trim() })) as { readonly id?: string } | null;
      setTestNotice(result?.id ? 'Surel uji terkirim.' : 'Surel uji gagal. Coba lagi.');
    });
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <SectionCard icon={KeyRound} title="Kunci API" eyebrow="Token akses">

        <form noValidate onSubmit={handleIssueKey} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={apiKeyNameId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">
              Nama kunci
            </Label>
            <Input
              id={apiKeyNameId}
              name="name"
              required
              disabled={isIssuing}
              placeholder="cth: Aplikasi Mobile"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-sans text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={apiKeyScopesId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">
              Hak akses
            </Label>
            <div className="flex gap-1.5">
              <Input
                id={apiKeyScopesId}
                value={scopeDraft}
                disabled={isIssuing}
                onChange={(event) => setScopeDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  addScope();
                }}
                placeholder="cth: sites.manage"
                aria-label="Tambah hak akses"
                className="h-8 min-w-0 flex-1 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addScope}
                disabled={isIssuing || scopeDraft.trim() === ''}
              >
                Tambah
              </Button>
            </div>
            <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
              {scopes.map((scope) => (
                <li key={scope}>
                  <span className="flex items-center gap-1 rounded border border-hairline bg-bg px-1.5 py-0.5 font-mono text-[11px] text-paper">
                    {scope}
                    <button
                      type="button"
                      onClick={() => removeScope(scope)}
                      disabled={isIssuing}
                      aria-label={`Hapus hak akses ${scope}`}
                      className="text-paper-faint transition-colors duration-150 hover:text-error"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {scopes.length === 0 ? (
              <p className="m-0 font-sans text-[11px] text-error">Tambahkan minimal satu hak akses sebelum menerbitkan.</p>
            ) : null}
          </div>

          <Button
            type="submit"
            variant="default"
            disabled={isIssuing || scopes.length === 0}
            className="w-full"
          >
            {isIssuing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Terbitkan Kunci API</span>
          </Button>

          {issuedPlaintext ? (
            <div className="space-y-2 rounded border border-brass/40 bg-bg p-2.5">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-brass">
                Kunci Rahasia Sekali Lihat (Simpan Sekarang)
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="min-w-0 break-all font-mono text-[11px] text-paper">
                  {issuedPlaintext}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => void handleCopyKey()}
                  aria-label="Salin kunci API"
                  className="flex-none"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </SectionCard>

      <SectionCard icon={Mail} title="Surel Transaksi" eyebrow="Notifikasi">
        <dl className="m-0 divide-y divide-hairline/60">
          {[
            { label: 'Status pengiriman', value: email?.configured ? 'Aktif (Resend)' : 'Nonaktif', mono: false },
            { label: 'Pengirim default', value: email?.defaultFrom ?? '—', mono: true },
            { label: 'Penerima status surel', value: email?.webhook ? 'Terpasang' : 'Belum dipasang', mono: false },
          ].map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="font-sans text-[11px] text-paper-dim">{row.label}</dt>
              <dd className={`m-0 min-w-0 truncate text-right text-xs font-medium text-paper ${row.mono ? 'font-mono' : ''}`} title={row.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
        {isPlatform && email?.configured ? (
          <div className="mt-3 border-t border-hairline pt-3">
            <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-wider text-paper-dim">Surel uji</p>
            <p className="m-0 mt-0.5 font-sans text-[11px] text-paper-faint">
              Satu surel percobaan ke alamat mana pun. Hanya admin platform.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                disabled={isTestingEmail}
                placeholder="nama@domain.id"
                aria-label="Alamat surel uji"
                className="h-8 min-w-0 flex-1 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleTestEmail}
                disabled={isTestingEmail || testEmail.trim().length === 0}
                className="w-full sm:w-auto sm:flex-none"
              >
                {isTestingEmail ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                <span>Kirim uji</span>
              </Button>
            </div>
            {testNotice ? (
              <p className="m-0 mt-1 font-sans text-xs text-signal">{testNotice}</p>
            ) : null}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import {
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface EmailStatus {
  readonly configured: boolean;
  readonly defaultFrom: string | null;
  readonly webhook: boolean;
}

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

  const apiKeyNameId = useId();
  const apiKeyScopesId = useId();
  const tgUserId = useId();
  const tgRoleId = useId();
  const tgTgUserId = useId();
  const tgChatId = useId();

  const [isIssuing, startIssueTransition] = useTransition();
  const [isCreatingMapping, startMappingTransition] = useTransition();
  const [isBroadcasting, startBroadcastTransition] = useTransition();
  const [isTestingEmail, startEmailTestTransition] = useTransition();
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testNotice, setTestNotice] = useState<string | null>(null);

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

    startIssueTransition(async () => {
      const result = (await command('api-key.issue', {
        name: String(formData.get('name') ?? '').trim(),
        scopes: String(formData.get('scopes') ?? '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        expiresAt: null,
      })) as { readonly plaintext?: string } | null;

      if (result?.plaintext) {
        setIssuedPlaintext(result.plaintext);
        form.reset();
      }
    });
  };
  const handleCreateMapping = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startMappingTransition(async () => {
      await command('telegram-mapping.create', {
        userId: String(formData.get('userId') ?? '').trim(),
        roleId: String(formData.get('roleId') ?? '').trim(),
        telegramUserId: String(formData.get('telegramUserId') ?? '').trim(),
        telegramChatId: String(formData.get('telegramChatId') ?? '').trim(),
      });
      form.reset();
    });
  };

  const handleBroadcast = () => {
    if (broadcastText.trim().length === 0) return;
    if (!window.confirm('Kirim pengumuman ke SEMUA kanal Telegram aktif? Pesan diantrekan dan dikirim bertahap oleh sistem.')) return;
    startBroadcastTransition(async () => {
      const result = (await command('telegram.broadcast', { text: broadcastText.trim() })) as { readonly enqueued?: number } | null;
      if (result !== null) {
        setBroadcastNotice(`Pengumuman diantrekan ke ${result.enqueued ?? 0} kanal.`);
        setBroadcastText('');
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
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard icon={KeyRound} title="Kunci API" eyebrow="Token akses">

        <form onSubmit={handleIssueKey} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor={apiKeyNameId} className="font-mono text-xs text-paper-dim">
              Nama Kunci
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
            <Label htmlFor={apiKeyScopesId} className="font-mono text-xs text-paper-dim">
              Hak Akses Kunci (pisahkan koma)
            </Label>
            <Input
              id={apiKeyScopesId}
              name="scopes"
              defaultValue="article.read,publishing.read"
              required
              disabled={isIssuing}
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <Button
            type="submit"
            variant="default"
            disabled={isIssuing}
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
            <div className="mt-3 space-y-2 rounded border border-brass/40 bg-bg p-3">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-brass">
                Kunci Rahasia Sekali Lihat (Simpan Sekarang)
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="break-all font-mono text-xs text-paper">
                  {issuedPlaintext}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => void handleCopyKey()}
                  aria-label="Salin kunci API"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </SectionCard>

      <SectionCard icon={Users} title="Telegram" eyebrow="Notifikasi">

        <form onSubmit={handleCreateMapping} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={tgUserId} className="font-mono text-xs text-paper-dim">
                ID Pengguna
              </Label>
              <Input
                id={tgUserId}
                name="userId"
                required
                disabled={isCreatingMapping}
                placeholder="usr_01h..."
                className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={tgRoleId} className="font-mono text-xs text-paper-dim">
                ID Peran
              </Label>
              <Input
                id={tgRoleId}
                name="roleId"
                required
                disabled={isCreatingMapping}
                placeholder="role_editor"
                className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={tgTgUserId} className="font-mono text-xs text-paper-dim">
                Telegram User ID
              </Label>
              <Input
                id={tgTgUserId}
                name="telegramUserId"
                required
                disabled={isCreatingMapping}
                placeholder="109283746"
                className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={tgChatId} className="font-mono text-xs text-paper-dim">
                Telegram Chat ID
              </Label>
              <Input
                id={tgChatId}
                name="telegramChatId"
                required
                disabled={isCreatingMapping}
                placeholder="-100987654321"
                className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="outline"
            disabled={isCreatingMapping}
            className="w-full"
          >
            {isCreatingMapping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            )}
            <span>Tautkan Telegram</span>
          </Button>
        </form>
        {isPlatform ? (
          <div className="mt-5 border-t border-hairline pt-5">
            <p className="m-0 font-sans text-sm font-semibold text-paper">Broadcast platform</p>
            <p className="m-0 mt-1 font-sans text-xs text-paper-dim">
              Satu pesan ke semua kanal aktif. Diantrekan, dikirim bertahap oleh sistem, coba lagi otomatis bila kena batas.
            </p>
            <Textarea
              value={broadcastText}
              onChange={(event) => setBroadcastText(event.target.value)}
              disabled={isBroadcasting}
              rows={3}
              maxLength={4000}
              placeholder="Pengumuman untuk semua kanal…"
              aria-label="Teks pengumuman"
              className="mt-2 font-sans text-xs"
            />
            {broadcastNotice ? (
              <p className="m-0 mt-1 font-sans text-xs text-signal">{broadcastNotice}</p>
            ) : null}
            <Button
              type="button"
              variant="default"
              onClick={handleBroadcast}
              disabled={isBroadcasting || broadcastText.trim().length === 0}
              className="mt-2"
            >
              <span>Kirim Pengumuman</span>
            </Button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard icon={Mail} title="Surel Transaksi" eyebrow="Notifikasi">
        <dl className="m-0 space-y-2 font-sans text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-paper-dim">Status pengiriman</dt>
            <dd className="m-0 font-semibold text-paper">{email?.configured ? 'Aktif (Resend)' : 'Nonaktif'}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-paper-dim">Pengirim default</dt>
            <dd className="m-0 break-all text-right font-mono text-paper">{email?.defaultFrom ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-paper-dim">Penerima status surel</dt>
            <dd className="m-0 font-semibold text-paper">{email?.webhook ? 'Terpasang' : 'Belum dipasang'}</dd>
          </div>
        </dl>
        {isPlatform && email?.configured ? (
          <div className="mt-5 border-t border-hairline pt-5">
            <p className="m-0 font-sans text-sm font-semibold text-paper">Surel uji</p>
            <p className="m-0 mt-1 font-sans text-xs text-paper-dim">
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
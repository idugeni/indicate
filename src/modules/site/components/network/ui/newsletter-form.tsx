'use client';

import { useState, type FormEvent, type ReactNode } from 'react';

import { TemplateButton, TemplateInput } from '@/modules/site/components/network/ui/field';

type NewsletterStatus = 'idle' | 'sending' | 'done' | 'error';

/**
 * Public newsletter signup form posting to the tenant newsletter intake.
 *
 * @param inputId - Unique input id pairing the sr-only label with the field.
 * @param formClassName - Layout classes for the form row from the calling card.
 * @param inputClassName - Shape classes for the email field from the calling card.
 * @param buttonClassName - Shape classes for the submit button from the calling card.
 * @param buttonLabel - Submit label, defaults to Berlangganan. Ignored when buttonChildren is set.
 * @param buttonChildren - Custom submit content (icons, responsive labels).
 * @param buttonAriaLabel - Accessible name when the button content is icon-only at some breakpoints.
 * @param tone - Surface tone for the transient status line; dark uses lighter hues.
 * @returns Self-contained form with live status announcements.
 * @remarks Posts same-host so the tenant classifier resolves the owning site;
 * the server validates, throttles per IP, registers the Resend contact, and
 * sends the Indonesian confirmation email.
 */
export function NewsletterForm({
  inputId,
  formClassName,
  inputClassName,
  buttonClassName,
  buttonLabel = 'Berlangganan',
  buttonChildren,
  buttonAriaLabel,
  tone = 'light',
}: {
  readonly inputId: string;
  readonly formClassName: string;
  readonly inputClassName: string;
  readonly buttonClassName: string;
  readonly buttonLabel?: string | undefined;
  readonly buttonChildren?: ReactNode | undefined;
  readonly buttonAriaLabel?: string | undefined;
  readonly tone?: 'light' | 'dark' | undefined;
}) {
  const [status, setStatus] = useState<NewsletterStatus>('idle');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending') return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    if (email === '') return;
    setStatus('sending');
    void fetch('/api/network/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((response) => {
        setStatus(response.ok ? 'done' : 'error');
      })
      .catch(() => {
        setStatus('error');
      });
  };

  return (
    <form className={formClassName} onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="sr-only">
        Alamat email
      </label>
      <TemplateInput
        id={inputId}
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        placeholder="Masukkan alamat email"
        disabled={status === 'sending'}
        className={inputClassName}
      />
      <TemplateButton
        type="submit"
        disabled={status === 'sending'}
        {...(buttonAriaLabel === undefined ? {} : { 'aria-label': buttonAriaLabel })}
        className={buttonClassName}
      >
        {buttonChildren ?? (status === 'sending' ? 'Mengirim…' : buttonLabel)}
      </TemplateButton>
      <span role="status" className="sr-only">
        {status === 'done' ? 'Berlangganan berhasil. Cek email untuk konfirmasi.' : status === 'error' ? 'Berlangganan gagal. Coba lagi.' : ''}
      </span>
      {status === 'done' ? (
        <span className={`w-full font-sans text-xs ${tone === 'dark' ? 'text-green-400' : 'text-green-700'}`}>Berhasil! Cek email untuk konfirmasi.</span>
      ) : status === 'error' ? (
        <span className={`w-full font-sans text-xs ${tone === 'dark' ? 'text-red-400' : 'text-red-700'}`}>Gagal berlangganan. Coba lagi nanti.</span>
      ) : null}
    </form>
  );
}

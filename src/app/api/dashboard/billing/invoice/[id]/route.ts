import { cookies } from 'next/headers';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { BillingService } from '@/modules/billing/billing-service';
import type { InvoiceRecord } from '@/modules/billing/models';
import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE } from '@/modules/site/company-contact';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleBillingRepository } from '@/data/repos/billing';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

const paramsSchema = z.object({ organizationId: z.uuid().optional() });

/**
 * Escape text for the invoice HTML document.
 *
 * @param value - Raw text to embed in markup.
 * @returns Escaped text safe for HTML interpolation.
 */
export function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Format an IDR amount with the id-ID grouping.
 *
 * @param value - Amount in rupiah.
 * @returns Grouped amount prefixed with Rp.
 */
export function formatIdr(value: number): string {
  return `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
}

/**
 * Format an ISO timestamp for the invoice meta table.
 *
 * @param iso - ISO timestamp; returned unchanged when unparseable.
 * @returns Long id-ID date or the original input.
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(d);
}

/**
 * Render the printable invoice HTML document.
 *
 * @param invoice - Authorized billing record to render.
 * @returns Complete HTML document with paid or void totals.
 */
export function invoiceDocument(invoice: InvoiceRecord): string {
  const voided = invoice.status === 'voided';
  const badge = voided
    ? `<p class="badge void">Void${invoice.voidReason ? ` · ${esc(invoice.voidReason)}` : ''}</p>`
    : `<p class="badge paid">Paid</p>`;
  const phone = COMPANY_PHONE.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  const totals = voided
    ? `<div class="trow grand"><span>Total (${esc(invoice.currency)})</span><span>${esc(formatIdr(invoice.amountIdr))}</span></div>
      ${invoice.voidedAt ? `<p class="void-note">Voided on ${esc(formatDate(invoice.voidedAt))}.</p>` : ''}`
    : `<div class="trow"><span>Subtotal</span><span>${esc(formatIdr(invoice.amountIdr))}</span></div>
      <div class="trow grand"><span>Total (${esc(invoice.currency)})</span><span>${esc(formatIdr(invoice.amountIdr))}</span></div>
      <div class="trow"><span>Amount paid</span><span>${esc(formatIdr(invoice.amountIdr))}</span></div>
      <div class="trow due"><span>Balance due</span><span>Rp0</span></div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Invoice ${esc(invoice.number)} - ${esc(invoice.organizationName)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #e9e6d9; color: #1a2430; font-family: "IBM Plex Sans", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .sheet { max-width: 800px; margin: 32px auto; background: #fff; border: 1px solid #e2ded2; border-top: 4px solid #b88d3a; }
  .inner { padding: 40px 48px 32px; }
  .top { display: flex; justify-content: space-between; gap: 32px; align-items: flex-start; }
  .from { display: flex; gap: 14px; align-items: flex-start; min-width: 0; }
  .from img { width: 46px; height: 50px; flex: none; }
  .company { margin: 0; font-family: Fraunces, Georgia, serif; font-size: 17px; font-weight: 600; }
  .addr { margin: 8px 0 0; font-size: 11.5px; line-height: 1.65; color: #4c5b6b; }
  .inv { text-align: right; flex: none; }
  .eyebrow { margin: 0; font-family: ui-monospace, "IBM Plex Mono", Menlo, Consolas, monospace; font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #5f6b7a; }
  .inv h1 { margin: 4px 0 0; font-family: Fraunces, Georgia, serif; font-size: 28px; font-weight: 600; letter-spacing: -0.01em; }
  .badge { display: inline-block; margin: 10px 0 0; padding: 4px 14px; font-family: ui-monospace, "IBM Plex Mono", Menlo, Consolas, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; border-radius: 999px; }
  .badge.paid { color: #0b5d3b; background: #e6f4ec; border: 1px solid #0b5d3b; }
  .badge.void { color: #b3261e; background: #fdecea; border: 1px solid #b3261e; }
  .parties { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-top: 28px; }
  .panel { background: #f7f5ee; border: 1px solid #e2ded2; padding: 14px 16px; }
  .label { margin: 0; font-family: ui-monospace, "IBM Plex Mono", Menlo, Consolas, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #5f6b7a; }
  .org { margin: 6px 0 0; font-size: 16px; font-weight: 700; }
  .meta-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .meta-table td { padding: 7px 0; border-bottom: 1px solid #e2ded2; vertical-align: top; }
  .meta-table tr:last-child td { border-bottom: none; }
  .meta-table td:first-child { color: #5f6b7a; padding-right: 12px; white-space: nowrap; }
  .meta-table td:last-child { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
  table.items th { font-family: ui-monospace, "IBM Plex Mono", Menlo, Consolas, monospace; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #1a2430; text-align: left; padding: 10px 12px; background: #f0ede1; border-top: 2px solid #1a2430; border-bottom: 1px solid #1a2430; }
  table.items td { padding: 14px 12px; border-bottom: 1px solid #e2ded2; vertical-align: top; }
  td.num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .item-note { color: #4c5b6b; font-size: 12px; }
  .totals { margin: 4px 0 0 45%; font-size: 13px; }
  .trow { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e2ded2; font-variant-numeric: tabular-nums; }
  .trow.grand { font-weight: 700; font-size: 15px; background: #faf6ec; padding: 10px 12px; border-bottom: none; }
  .trow.due span:last-child { font-weight: 700; color: #0b5d3b; }
  .void-note { margin: 12px 0 0; font-size: 12px; color: #b3261e; }
  .foot { margin: 28px 0 0; font-size: 11px; line-height: 1.7; color: #5f6b7a; border-top: 1px solid #e2ded2; padding-top: 12px; }
  .foot code { font-family: ui-monospace, "IBM Plex Mono", Menlo, Consolas, monospace; font-size: 10.5px; }
  .toolbar { max-width: 800px; margin: 24px auto 0; display: flex; gap: 12px; padding: 0 8px; }
  .toolbar button { padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; background: #1a2430; color: #fff; border: none; border-radius: 3px; }
  @page { size: A4; margin: 14mm; }
  @media print {
    body { background: #fff; }
    .sheet { border: none; border-top: 4px solid #b88d3a; margin: 0; max-width: none; }
    .inner { padding: 0; }
    .toolbar { display: none; }
  }
</style>
</head>
<body>
<div class="toolbar"><button type="button" onclick="window.print()">Download / Print PDF</button></div>
<main class="sheet"><div class="inner">
  <header class="top">
    <div class="from">
      <img src="/brand/safenca-mark-dark-master.png" alt="Safenca" width="46" height="50" />
      <div>
        <p class="company">${esc(COMPANY_NAME.toUpperCase())}</p>
        <p class="addr">Jl. Raya Kalierang Gg. Melati RT 001/RW 005, Kalierang, Selomerto,<br />Kabupaten Wonosobo, Jawa Tengah 56361<br />${esc(COMPANY_EMAIL)} · ${esc(phone)}</p>
      </div>
    </div>
    <div class="inv">
      <p class="eyebrow">Invoice</p>
      <h1>${esc(invoice.number)}</h1>
      ${badge}
    </div>
  </header>
  <section class="parties">
    <div class="panel"><p class="label">Billed to</p><p class="org">${esc(invoice.organizationName)}</p></div>
    <table class="meta-table"><tbody>
      <tr><td>Invoice date</td><td>${esc(formatDate(invoice.createdAt))}</td></tr>
      <tr><td>Payment date</td><td>${esc(formatDate(invoice.paidAt))}</td></tr>
      <tr><td>Payment method</td><td>Bank transfer</td></tr>
    </tbody></table>
  </section>
  <table class="items">
    <thead><tr><th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Indicate platform service${invoice.billingNote ? `<br /><span class="item-note">${esc(invoice.billingNote)}</span>` : ''}</td><td class="num">1</td><td class="num">${esc(formatIdr(invoice.amountIdr))}</td><td class="num">${esc(formatIdr(invoice.amountIdr))}</td></tr>
    </tbody>
  </table>
  <section class="totals">${totals}</section>
  <p class="foot">This document was automatically generated by the Indicate billing system from an authorized billing record — no wet signature required.<br />${esc(COMPANY_EMAIL)} · ${esc(phone)} · <code>ID ${esc(invoice.id)} · v${esc(String(invoice.version))}</code></p>
</div></main>
</body>
</html>`;
}

async function handleGET(request: Request, context: { readonly params: Promise<{ readonly id: string }> }) {
  const requestId = resolveRequestId(request);
  const { id } = await context.params;
  const url = new URL(request.url);
  const parsed = paramsSchema.safeParse({ organizationId: url.searchParams.get('organizationId') ?? undefined });
  if (!parsed.success || parsed.data.organizationId === undefined) {
    return new Response('Not Found', { status: 404 });
  }
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) return new Response('Not Found', { status: 404 });
  const serverContext = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(serverContext.bootstrap);
  {
    const authorization = new DrizzleAuthorizationRepository(runtime.db);
    const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
    if (!local.ok || local.value.status !== 'active') return new Response('Not Found', { status: 404 });
    const platformPermissions = await authorization.listPlatformPermissions(local.value.id);
    const actor = {
      actorType: 'user' as const, actorId: local.value.id, verifiedAuthUserId: identity.authUserId,
      organizationId: null, permissionSet: new Set<string>(), platformPermissionSet: new Set(platformPermissions),
      entryPoint: 'dashboard' as const, requestId,
    };
    const service = new BillingService(new DrizzleBillingRepository(runtime.db));
    const result = await service.invoiceDetail(actor, parsed.data.organizationId, id);
    if (!result.ok) return new Response('Not Found', { status: 404 });
    return new Response(invoiceDocument(result.value), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
  }
}

export const GET = withApiAccess('GET /api/dashboard/billing/invoice/[id]', handleGET);

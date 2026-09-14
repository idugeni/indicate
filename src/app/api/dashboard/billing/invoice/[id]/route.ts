import { cookies } from 'next/headers';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { BillingService } from '@/modules/billing/billing-service';
import type { InvoiceRecord } from '@/modules/billing/models';
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

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatIdr(value: number): string {
  return `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(d);
}

function invoiceDocument(invoice: InvoiceRecord): string {
  const voided = invoice.status === 'voided';
  const stamp = voided
    ? `<p class="stamp void">VOID${invoice.voidReason ? ` — ${esc(invoice.voidReason)}` : ''}</p>`
    : `<p class="stamp paid">LUNAS</p>`;
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Faktur ${esc(invoice.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f1f0eb; color: #1a1a1a; font-family: Georgia, 'Times New Roman', serif; }
  .sheet { max-width: 720px; margin: 32px auto; background: #fff; padding: 56px; border: 1px solid #ddd; }
  .kop { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px double #1a1a1a; padding-bottom: 20px; }
  .kop h1 { margin: 0; font-size: 20px; letter-spacing: 0.04em; }
  .kop p { margin: 4px 0 0; font-size: 12px; line-height: 1.6; color: #444; }
  .title { display: flex; justify-content: space-between; align-items: baseline; margin: 32px 0 8px; }
  .title h2 { margin: 0; font-size: 28px; letter-spacing: 0.12em; }
  .meta { font-size: 12px; color: #444; line-height: 1.8; }
  .billto { margin: 24px 0; font-size: 13px; line-height: 1.7; }
  .billto .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #777; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #bbb; padding: 10px 12px; text-align: left; vertical-align: top; }
  th { background: #f5f4f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tr.total td { font-weight: bold; font-size: 15px; }
  .stamp { display: inline-block; margin: 28px 0 0; padding: 8px 20px; font-size: 18px; font-weight: bold; letter-spacing: 0.2em; border: 3px solid; }
  .stamp.paid { color: #0b5d3b; border-color: #0b5d3b; }
  .stamp.void { color: #b3261e; border-color: #b3261e; }
  .foot { margin-top: 32px; font-size: 11px; color: #777; line-height: 1.7; border-top: 1px solid #ddd; padding-top: 12px; }
  .toolbar { max-width: 720px; margin: 24px auto 0; display: flex; gap: 12px; padding: 0 8px; font-family: system-ui, sans-serif; }
  .toolbar button { padding: 10px 20px; font-size: 14px; cursor: pointer; background: #1a1a1a; color: #fff; border: none; }
  @media print {
    body { background: #fff; }
    .sheet { border: none; margin: 0; max-width: none; padding: 0; }
    .toolbar { display: none; }
  }
</style>
</head>
<body>
<div class="toolbar"><button type="button" onclick="window.print()">Unduh / Cetak PDF</button></div>
<main class="sheet">
  <div class="kop">
    <div>
      <h1>PT SANCA PHENA CAKRA</h1>
      <p>Jl. Raya Kalierang Gg. Melati RT 001/RW 005, Kalierang, Selomerto,<br />Kabupaten Wonosobo, Jawa Tengah 56361<br />sancaphenacakra@gmail.com · 0856-4115-9405</p>
    </div>
  </div>
  <div class="title"><h2>FAKTUR</h2></div>
  <div class="meta">Nomor: <strong>${esc(invoice.number)}</strong><br />Diterbitkan: ${esc(formatDate(invoice.createdAt))}<br />Tanggal bayar: ${esc(formatDate(invoice.paidAt))}</div>
  <div class="billto"><span class="label">Ditagihkan kepada</span><br /><strong>${esc(invoice.organizationName)}</strong></div>
  <table>
    <thead><tr><th>Uraian</th><th class="num">Jumlah</th></tr></thead>
    <tbody>
      <tr><td>Layanan platform Indicate${invoice.billingNote ? `<br /><span style="color:#555">${esc(invoice.billingNote)}</span>` : ''}</td><td class="num">${esc(formatIdr(invoice.amountIdr))}</td></tr>
      <tr class="total"><td>Total (${esc(invoice.currency)})</td><td class="num">${esc(formatIdr(invoice.amountIdr))}</td></tr>
    </tbody>
  </table>
  ${stamp}
  ${voided && invoice.voidedAt ? `<p class="meta">Di-void pada ${esc(formatDate(invoice.voidedAt))}.</p>` : ''}
  <p class="foot">Dokumen ini dibuat otomatis oleh sistem Indicate dari catatan penagihan yang sah dan dirender apa adanya dari data berjalan — tidak memerlukan tanda tangan basah.</p>
</main>
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

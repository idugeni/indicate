import { cookies } from 'next/headers';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { BillingService } from '@/modules/billing/billing-service';
import type { InvoiceRecord } from '@/modules/billing/models';
import { terbilangIdr } from '@/modules/billing/terbilang';
import { COMPANY_EMAIL, COMPANY_NAME } from '@/modules/site/company-contact';
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

const MATERAI_THRESHOLD_IDR = 5_000_000;

export interface InvoiceSeals {
  readonly signUrl: string;
  readonly stampUrl: string;
}

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

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
}

/**
 * Render the printable invoice HTML document.
 *
 * @param invoice - Authorized billing record to render.
 * @param seals - Authed seal image URLs for the signature block.
 * @returns Complete HTML document with paid or void totals.
 */
export function invoiceDocument(invoice: InvoiceRecord, seals: InvoiceSeals): string {
  const voided = invoice.status === 'voided';
  const unpaid = invoice.status === 'unpaid';
  const badge = voided
    ? `<div class="badge-void" role="status">VOID${invoice.voidReason ? ` · ${esc(invoice.voidReason)}` : ''}</div>`
    : unpaid
      ? `<div class="badge-unpaid" role="status">BELUM BAYAR</div>`
      : `<div class="badge-paid" role="status">LUNAS</div>`;
  const docKind = voided ? 'Faktur Void' : unpaid ? 'Tagihan Pembayaran' : 'Faktur Lunas &amp; Kuitansi Pembayaran';
  const period = formatMonthYear(invoice.paidAt ?? invoice.createdAt);
  const totals = voided
    ? `<table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tbody>
          <tr>
            <td style="color: var(--ash); padding: 10px 0 5px; border-top: 2px solid var(--volcanic-black); font-weight: 700; font-size: 14px;">Total Tagihan</td>
            <td style="font-family: 'IBM Plex Mono', monospace; text-align: right; padding: 10px 0 5px; border-top: 2px solid var(--volcanic-black); font-weight: 700; font-size: 14px;">${esc(formatIdr(invoice.amountIdr))}</td>
          </tr>
        </tbody>
      </table>
      ${invoice.voidedAt ? `<p class="void-note">Dibatalkan pada ${esc(formatDate(invoice.voidedAt))}.</p>` : ''}`
    : unpaid
      ? `<table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tbody>
          <tr>
            <td style="color: var(--ash); padding: 10px 0 5px; border-top: 2px solid var(--volcanic-black); font-weight: 700; font-size: 14px;">Total Tagihan</td>
            <td style="font-family: 'IBM Plex Mono', monospace; text-align: right; padding: 10px 0 5px; border-top: 2px solid var(--volcanic-black); font-weight: 700; font-size: 14px;">${esc(formatIdr(invoice.amountIdr))}</td>
          </tr>
        </tbody>
      </table>
      ${invoice.dueAt ? `<p class="tax-note">Jatuh tempo: ${esc(formatDate(invoice.dueAt))}. Lunasi sebelum tanggal tersebut agar layanan tidak terhenti.</p>` : ''}`
    : `<table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tbody>
          <tr>
            <td style="color: var(--ash); padding: 5px 0;">Subtotal Tagihan</td>
            <td style="font-family: 'IBM Plex Mono', monospace; text-align: right; padding: 5px 0;">${esc(formatIdr(invoice.amountIdr))}</td>
          </tr>
          <tr>
            <td style="color: var(--ash); padding: 10px 0 5px; border-top: 2px solid var(--volcanic-black); font-weight: 700; font-size: 14px;">Total Tagihan</td>
            <td style="font-family: 'IBM Plex Mono', monospace; text-align: right; padding: 10px 0 5px; border-top: 2px solid var(--volcanic-black); font-weight: 700; font-size: 14px;">${esc(formatIdr(invoice.amountIdr))}</td>
          </tr>
          <tr>
            <td style="color: var(--ash); padding: 5px 0 0;">Jumlah yang Dibayar</td>
            <td style="font-family: 'IBM Plex Mono', monospace; text-align: right; padding: 5px 0 0;">${esc(formatIdr(invoice.amountIdr))}</td>
          </tr>
        </tbody>
      </table>
      <p class="tax-note">Harga di atas sudah termasuk pajak (PPN).</p>
      ${invoice.amountIdr >= MATERAI_THRESHOLD_IDR ? `<p class="tax-note">Transaksi senilai Rp5.000.000 atau lebih wajib dibubuhi meterai sesuai ketentuan bea meterai yang berlaku.</p>` : ''}`;
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Faktur ${esc(invoice.number)} — INDICATE</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
<style>
  :root {
    --volcanic-black: #161311;
    --volcanic-charcoal: #241f1c;
    --ember: #b5502f;
    --mineral-gold: #c99b4a;
    --ash: #736b63;
    --ash-light: #9e958c;
    --paper: #f7f4ee;
    --paper-dim: #ede6dc;
    --signal-teal: #2c6e66;
    --line: #ded5c7;
    --line-subtle: #eae4d9;
    --success: #1e5e3f;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--paper); font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif; color: var(--volcanic-black); padding: 40px 16px; font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .action-bar { max-width: 820px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 12px; }
  .btn { appearance: none; border: none; background: var(--volcanic-black); color: #fff; padding: 10px 20px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 500; cursor: pointer; border-radius: 4px; display: inline-flex; align-items: center; gap: 8px; }
  .btn:hover { background: var(--volcanic-charcoal); }
  .sheet { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid var(--line); box-shadow: 0 20px 40px -15px rgba(22, 19, 17, 0.08); }
  .issuer-band { background: linear-gradient(135deg, var(--volcanic-black) 0%, var(--volcanic-charcoal) 100%); color: var(--paper); padding: 28px 36px; border-bottom: 3px solid var(--mineral-gold); }
  .issuer-band .kop { width: auto; border-collapse: collapse; margin: 0; }
  .issuer-band .kop-mark { vertical-align: middle; padding-right: 14px; }
  .issuer-band .brand-logo { display: block; width: 46px; height: 50px; flex: none; }
  .issuer-band .kop-text { vertical-align: middle; }
  table.layout { width: 100%; border-collapse: collapse; margin: 0; }
  table.layout > tbody > tr > td { vertical-align: top; }
  .issuer-band .brand-name { font-family: 'Fraunces', serif; font-weight: 700; font-size: 22px; letter-spacing: 0.04em; color: #ffffff; }
  .issuer-band .legal-name { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--ash-light); text-transform: uppercase; margin-top: 2px; }
  .issuer-band .legal-name a { color: var(--mineral-gold); text-decoration: none; }
  .issuer-band .legal-name .sep { margin: 0 6px; color: var(--ash); }
  .status-strip { background: var(--paper-dim); border-bottom: 1px solid var(--line); padding: 16px 36px; }
  .status-strip .doc-type { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ash); }
  .status-strip .doc-type strong { color: var(--volcanic-black); display: block; font-size: 13px; letter-spacing: 0.04em; margin-top: 2px; }
  .badge-paid { display: inline-flex; align-items: center; gap: 8px; background: var(--success); color: #ffffff; padding: 6px 14px; border-radius: 100px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; }
  .badge-paid::before { content: "✓"; font-weight: bold; font-size: 11px; }
  .badge-void { display: inline-flex; align-items: center; gap: 8px; background: #b3261e; color: #ffffff; padding: 6px 14px; border-radius: 100px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; }
  .badge-unpaid { display: inline-flex; align-items: center; gap: 8px; background: #8a6d00; color: #ffffff; padding: 6px 14px; border-radius: 100px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; }
  .product-block { padding: 28px 36px 16px; border-bottom: 1px dashed var(--line); }
  .product-block .label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ash); margin-bottom: 4px; }
  .product-name { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 600; color: var(--ember); line-height: 1.1; }
  .product-sub { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--signal-teal); margin-top: 4px; font-weight: 500; }
  .product-desc { font-size: 13px; color: var(--ash); margin-top: 4px; }
  .parties { padding: 20px 36px; border-bottom: 1px solid var(--line); background: #ffffff; }
  .parties .label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ash); margin-bottom: 6px; }
  .parties .name { font-weight: 600; font-size: 16px; color: var(--volcanic-black); }
  .items { padding: 12px 36px 4px; }
  table { width: 100%; border-collapse: collapse; }
  .items table { margin: 16px 0; }
  .items thead th { text-align: left; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ash); padding: 10px 8px; border-bottom: 2px solid var(--volcanic-black); }
  .items thead th.num { text-align: right; }
  .items tbody tr { page-break-inside: avoid; }
  .items tbody td { padding: 14px 8px; border-bottom: 1px solid var(--line-subtle); vertical-align: top; font-size: 13px; }
  .items tbody td.num { text-align: right; font-family: 'IBM Plex Mono', monospace; white-space: nowrap; }
  .item-num { font-family: 'IBM Plex Mono', monospace; color: var(--ash-light); width: 40px; }
  .num-chip { display: inline-block; min-width: 24px; text-align: center; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; color: #ffffff; background: var(--volcanic-black); border-radius: 4px; padding: 3px 0; }
  .item-cat { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ember); margin-bottom: 2px; }
  .item-title { font-weight: 600; font-size: 14px; color: var(--volcanic-black); }
  .qty-pill { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--volcanic-charcoal); border: 1px solid var(--line); border-radius: 100px; padding: 2px 10px; white-space: nowrap; }
  .items tbody td.total { font-weight: 700; color: var(--ember); }
  .item-desc { color: var(--ash); font-size: 12px; margin-top: 3px; line-height: 1.4; }
  .calc-container { padding: 12px 36px; }
  .terbilang-block { background: var(--paper-dim); padding: 14px 16px; border-radius: 4px; border-left: 3px solid var(--mineral-gold); }
  .terbilang-title { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ash); margin-bottom: 4px; }
  .terbilang-text { font-size: 12px; font-style: italic; color: var(--volcanic-charcoal); line-height: 1.4; }
  .tax-note { font-size: 11px; color: var(--ash); margin-top: 8px; text-align: right; line-height: 1.5; }
  .void-note { font-size: 12px; color: #b3261e; margin-top: 8px; text-align: right; }
  .legal-validation { padding: 16px 36px 20px; }
  .legal-clause { font-size: 11px; color: var(--ash); line-height: 1.5; }
  .signature-box { position: relative; z-index: 1; text-align: center; font-size: 12px; padding-left: 64px; }
  .signature-box .auth-badge { display: inline-block; border: 1px dashed var(--signal-teal); padding: 6px 14px; border-radius: 4px; background: #ffffff; color: var(--signal-teal); font-family: 'IBM Plex Mono', monospace; font-size: 10px; margin-bottom: 6px; }
  .signature-box .paraf { display: block; width: 72px; height: auto; margin: 4px auto 0; }
  .signature-box .signee { font-weight: 600; color: var(--volcanic-black); }
  .signature-box .role { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ash); }
  .thanks-block { text-align: center; font-family: 'Fraunces', serif; font-style: italic; font-size: 14px; color: var(--volcanic-charcoal); padding: 20px 36px 24px; }
  .footer { padding: 22px 36px 26px; background: linear-gradient(135deg, var(--volcanic-black) 0%, var(--volcanic-charcoal) 100%); border-top: 3px solid var(--mineral-gold); }
  .footer .refs { text-align: right; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--mineral-gold); line-height: 1.7; white-space: nowrap; }
  .footer .refs span { color: var(--ash-light); }
  .footer .legal { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ash-light); text-align: right; white-space: normal; margin-top: 6px; line-height: 1.6; }
  .sign-area { position: relative; }
  .stamp-overlay { position: absolute; left: 0; top: 108px; width: 140px; height: auto; transform: rotate(-8deg); opacity: 0.94; pointer-events: none; }
  @page { size: A4 portrait; margin: 12mm 10mm; }
  @media print {
    body { padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .action-bar { display: none !important; }
    thead { display: table-header-group; }
    .legal-validation, .footer { page-break-inside: avoid; }
    .sheet { border: none; box-shadow: none; max-width: 100%; width: 100%; }
  }
  @media (max-width: 680px) {
    body { padding: 12px; }
    .issuer-band, .product-block, .parties, .items, .calc-container, .legal-validation, .thanks-block, .footer { padding-left: 18px; padding-right: 18px; }
    .signature-box { text-align: center; }
    .signature-box .paraf { width: 60px; margin: 12px auto 0; }
    .product-block table.layout > tbody > tr > td, .calc-container table.layout > tbody > tr > td, .legal-validation table.layout > tbody > tr > td { display: block; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
    .product-block table.layout > tbody > tr > td:first-child, .calc-container table.layout > tbody > tr > td:first-child, .legal-validation table.layout > tbody > tr > td:first-child { padding-bottom: 16px !important; }
    .items thead th, .items tbody td { padding-left: 6px; padding-right: 6px; }
    .items .col-unit { display: none; }
    .stamp-overlay { width: 90px; }
  }
</style>
</head>
<body>
<div class="action-bar"><button type="button" class="btn" onclick="window.print()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1 2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg> Cetak / Simpan PDF</button></div>
<main class="sheet">
  <header class="issuer-band">
    <table class="kop" role="presentation"><tbody><tr>
      <td class="kop-mark"><img class="brand-logo" src="/brand/safenca-mark-white-transparent.png" alt="Logo SAFENCA" width="46" height="50" /></td>
      <td class="kop-text"><h1 class="brand-name">SAFENCA</h1><p class="legal-name">${esc(COMPANY_NAME)}<span class="sep">|</span><a href="https://safenca.id" target="_blank" rel="noopener">safenca.id</a></p></td>
    </tr></tbody></table>
  </header>
  <section class="status-strip">
    <table class="layout" role="presentation"><tbody><tr>
      <td><div class="doc-type">Jenis Dokumen Resmi<strong>${docKind}</strong></div></td>
      <td style="text-align: right; vertical-align: middle;">${badge}</td>
    </tr></tbody></table>
  </section>
  <section class="product-block">
    <table class="layout" role="presentation"><tbody><tr>
      <td style="width: 50%; padding-right: 12px;">
        <div class="label">Layanan / Produk Terdaftar</div>
        <div class="product-name">INDICATE</div>
        <div class="product-sub">indicate.website</div>
        <p class="product-desc">Infrastruktur Publikasi Digital Terpusat</p>
      </td>
      <td style="width: 50%; padding-left: 12px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 13px;"><tbody>
          <tr><td style="color: var(--ash); white-space: nowrap; padding: 3px 0;">No. Faktur</td><td style="color: var(--ash); width: 14px; text-align: center; padding: 3px 0;">:</td><td style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; text-align: right; padding: 3px 0;">${esc(invoice.number)}</td></tr>
          <tr><td style="color: var(--ash); white-space: nowrap; padding: 3px 0;">Tanggal Terbit</td><td style="color: var(--ash); width: 14px; text-align: center; padding: 3px 0;">:</td><td style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; text-align: right; padding: 3px 0;">${esc(formatDate(invoice.createdAt))}</td></tr>
          ${unpaid
            ? `<tr><td style="color: var(--ash); white-space: nowrap; padding: 3px 0;">Jatuh Tempo</td><td style="color: var(--ash); width: 14px; text-align: center; padding: 3px 0;">:</td><td style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; text-align: right; padding: 3px 0;">${invoice.dueAt === null ? '-' : esc(formatDate(invoice.dueAt))}</td></tr>`
            : `<tr><td style="color: var(--ash); white-space: nowrap; padding: 3px 0;">Tanggal Lunas</td><td style="color: var(--ash); width: 14px; text-align: center; padding: 3px 0;">:</td><td style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; text-align: right; padding: 3px 0;">${invoice.paidAt === null ? '-' : esc(formatDate(invoice.paidAt))}</td></tr>`}
          <tr><td style="color: var(--ash); white-space: nowrap; padding: 3px 0;">Metode Pembayaran</td><td style="color: var(--ash); width: 14px; text-align: center; padding: 3px 0;">:</td><td style="font-family: 'IBM Plex Mono', monospace; font-weight: 500; text-align: right; padding: 3px 0;">${esc(invoice.paymentMethod)}</td></tr>
        </tbody></table>
      </td>
    </tr></tbody></table>
  </section>
  <section class="parties">
    <div class="label">Ditagihkan Kepada</div>
    <div class="name">${esc(invoice.organizationName)}</div>
  </section>
  <section class="items">
    <table>
      <thead><tr><th class="item-num" scope="col">No.</th><th scope="col">Uraian Layanan</th><th class="num" scope="col">Kuantitas</th><th class="num col-unit" scope="col">Harga Satuan (Rp)</th><th class="num" scope="col">Subtotal (Rp)</th></tr></thead>
      <tbody><tr>
        <td class="item-num"><span class="num-chip">1</span></td>
        <td>${period !== '' ? `<div class="item-cat">${esc(period)}</div>` : ''}<div class="item-title">Layanan Publikasi Media Online</div>${invoice.billingNote ? `<div class="item-desc">${esc(invoice.billingNote)}</div>` : `<div class="item-desc">Publikasi konten kegiatan pada jaringan portal media di bawah infrastruktur INDICATE, termasuk penyiapan sistem, integrasi domain, dan orientasi teknis</div>`}</td>
        <td class="num"><span class="qty-pill">1 paket</span></td>
        <td class="num col-unit">${esc(formatIdr(invoice.amountIdr))}</td>
        <td class="num total">${esc(formatIdr(invoice.amountIdr))}</td>
      </tr></tbody>
    </table>
  </section>
  <section class="calc-container">
    <table class="layout" role="presentation"><tbody><tr>
      <td style="width: 55%; padding-right: 12px;">
        <div class="terbilang-block"><div class="terbilang-title">Jumlah Pembayaran Terbilang:</div><div class="terbilang-text">&quot;${esc(terbilangIdr(invoice.amountIdr))}&quot;</div></div>
      </td>
      <td style="width: 45%; padding-left: 12px;">${totals}</td>
    </tr></tbody></table>
  </section>
  <section class="legal-validation">
    <table class="layout" role="presentation"><tbody><tr>
      <td style="width: 50%; padding-right: 12px;"><div class="legal-clause">Dokumen ini dibuat dan diterbitkan secara digital melalui sistem keuangan terpadu ${esc(COMPANY_NAME)}. Mengacu pada ketentuan Pasal 5 ayat (1) UU ITE, bukti pembayaran digital ini dinyatakan sah dan mengikat secara hukum tanpa memerlukan tanda tangan basah.</div></td>
      <td style="width: 50%; padding: 0 12px;">
        <div class="sign-area">
          <div class="signature-box">
            <div class="auth-badge">VERIFIKASI SISTEM ELEKTRONIK</div>
            <img class="paraf" src="${esc(seals.signUrl)}" alt="Paraf digital Eliyanto Sarage" width="72" />
            <div class="signee">Eliyanto Sarage</div>
            <div class="role">Direktur PT Sanca Phena Cakra</div>
          </div>
          <img class="stamp-overlay" src="${esc(seals.stampUrl)}" alt="Stempel LUNAS PT Sanca Phena Cakra" width="140" />
        </div>
      </td>
    </tr></tbody></table>
  </section>
  <div class="thanks-block">Terima kasih atas kerja sama dan kepercayaan Anda.</div>
  <footer class="footer">
    <table class="layout" role="presentation"><tbody><tr><td style="text-align: right; width: 100%;">
      <div class="refs"><span>Bantuan:</span> ${esc(COMPANY_EMAIL)}</div>
      <div class="legal">Jl. Raya Kalierang, Gg. Melati, RT 001/RW 005, Kalierang, Selomerto, Wonosobo, Jawa Tengah 56361</div>
    </td></tr></tbody></table>
  </footer>
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
    const seals: InvoiceSeals = {
      signUrl: `/api/dashboard/billing/invoice/${encodeURIComponent(id)}/seal?type=sign&organizationId=${encodeURIComponent(parsed.data.organizationId)}`,
      stampUrl: `/api/dashboard/billing/invoice/${encodeURIComponent(id)}/seal?type=stamp&organizationId=${encodeURIComponent(parsed.data.organizationId)}`,
    };
    return new Response(invoiceDocument(result.value, seals), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}

export const GET = withApiAccess('GET /api/dashboard/billing/invoice/[id]', handleGET);

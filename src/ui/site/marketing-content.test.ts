import { describe, expect, it } from 'vitest';

import { SERVICE_PATHS } from '@/core/routing/control-plane-paths';
import {
  ABOUT_PRINCIPLES,
  ABOUT_STORY,
  ARTICLE_FALLBACK_IMAGE_URL,
  CAPABILITIES,
  CONTACT_CHECKLIST,
  GUARANTEES,
  LEGAL_ROUTES,
  LIVE_TENANT_APEX,
  LIVE_TENANT_REGIONAL,
  PRIVACY_SECTIONS,
  PROOF_POINTS,
  SERVICE_NAME,
  SERVICE_SUMMARY,
  SERVICE_TAGLINE,
  SITE_PATHS,
  SITE_ROUTES,
  TERMS_SECTIONS,
  USE_CASES,
  VALUE_PROPOSITIONS,
  WORKFLOW_STEPS,
} from '@/ui/site/marketing-content';

describe('navigasi layanan', () => {
  it('mendaftarkan tujuh rute situs dengan href unik berawalan garis miring', () => {
    expect(SITE_ROUTES.map((rute) => rute.href)).toEqual(['/services', '/pricing', '/network', '/partners', '/about', '/faq', '/contact']);
    for (const rute of SITE_ROUTES) {
      expect(rute.label.length).toBeGreaterThan(0);
    }
  });

  it('mendaftarkan rute legal privasi dan ketentuan', () => {
    expect(LEGAL_ROUTES.map((rute) => rute.href)).toEqual(['/privacy', '/terms']);
  });

  it('menjaga SITE_PATHS selaras dengan kontrak routing', () => {
    expect([...SITE_PATHS]).toEqual([...SERVICE_PATHS]);
  });
});

describe('konten pemasaran', () => {
  it('menyediakan identitas layanan yang terisi', () => {
    expect(SERVICE_NAME.length).toBeGreaterThan(0);
    expect(SERVICE_TAGLINE.length).toBeGreaterThan(0);
    expect(SERVICE_SUMMARY.length).toBeGreaterThan(0);
  });

  it('memakai URL fallback aset lokal', () => {
    expect(ARTICLE_FALLBACK_IMAGE_URL.startsWith('/')).toBe(true);
  });

  it('mendaftarkan bukti, proposisi, dan kasus guna yang terisi', () => {
    expect(PROOF_POINTS.length).toBeGreaterThan(0);
    expect(VALUE_PROPOSITIONS.length).toBeGreaterThan(0);
    expect(USE_CASES.length).toBeGreaterThan(0);
    for (const item of [...PROOF_POINTS, ...VALUE_PROPOSITIONS, ...USE_CASES]) {
      expect('term' in item ? item.term.length : item.title.length).toBeGreaterThan(0);
      expect('detail' in item ? item.detail.length : item.description.length).toBeGreaterThan(0);
    }
  });

  it('mewajibkan poin pada setiap kapabilitas', () => {
    expect(CAPABILITIES.length).toBeGreaterThan(0);
    for (const kapabilitas of CAPABILITIES) {
      expect(kapabilitas.points?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('mendaftarkan alur kerja, jaminan, cerita, prinsip, dan checklist kontak', () => {
    expect(WORKFLOW_STEPS.length).toBeGreaterThan(0);
    expect(GUARANTEES.length).toBeGreaterThan(0);
    expect(ABOUT_STORY.length).toBeGreaterThan(0);
    expect(ABOUT_PRINCIPLES.length).toBeGreaterThan(0);
    expect(CONTACT_CHECKLIST.length).toBeGreaterThan(0);
  });
});

describe('dokumen legal', () => {
  it('menomori 24 bagian ketentuan secara berurutan', () => {
    expect(TERMS_SECTIONS).toHaveLength(24);
    TERMS_SECTIONS.forEach((bagian, indeks) => {
      expect(bagian.heading.startsWith(`${indeks + 1}.`)).toBe(true);
      expect(bagian.body.length).toBeGreaterThan(0);
    });
  });

  it('menomori 20 bagian privasi secara berurutan', () => {
    expect(PRIVACY_SECTIONS).toHaveLength(20);
    PRIVACY_SECTIONS.forEach((bagian, indeks) => {
      expect(bagian.heading.startsWith(`${indeks + 1}.`)).toBe(true);
      expect(bagian.body.length).toBeGreaterThan(0);
    });
  });
});

describe('tenant live', () => {
  it('mendaftarkan sembilan apex unik', () => {
    expect(LIVE_TENANT_APEX).toHaveLength(9);
    expect(new Set(LIVE_TENANT_APEX).size).toBe(9);
  });

  it('memasangkan setiap edisi wonosobo ke apex-nya', () => {
    expect(LIVE_TENANT_REGIONAL).toHaveLength(LIVE_TENANT_APEX.length);
    for (const regional of LIVE_TENANT_REGIONAL) {
      expect(regional.startsWith('wonosobo.')).toBe(true);
      expect(LIVE_TENANT_APEX).toContain(regional.replace(/^wonosobo\./, ''));
    }
  });
});

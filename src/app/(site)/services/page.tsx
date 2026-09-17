import type { Metadata } from 'next';

import { CAPABILITIES, GUARANTEES, USE_CASES, VALUE_PROPOSITIONS, WORKFLOW_STEPS } from '@/ui/site/marketing-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import {
  CAPABILITY_ICONS,
  CARD_CLASS,
  FeatureGrid,
  GUARANTEE_ICONS,
  ICON_BOX_CLASS,
  PrimaryCta,
  SecondaryCta,
  Section,
  USE_CASE_ICONS,
  VALUE_ICONS,
  withIcons,
} from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION =
  'Semua yang didapat: website siap tayang, redaksi terpusat, penerbitan multi-situs, dan pendampingan manusia.';

export function generateMetadata(): Metadata {
  return siteMetadata('Layanan', DESCRIPTION, '/services');
}

export default function LayananPage() {
  return (
    <PublicPage
      eyebrow="Layanan"
      title="Semua yang dibutuhkan, tidak ada yang membingungkan"
      description={DESCRIPTION}
      meta={['Terima beres', 'Aktif maks. 1x24 jam', 'Didampingi manusia']}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={
        <>
          <PrimaryCta href="/pricing">Lihat Harga</PrimaryCta>
          <SecondaryCta href="/contact">Hubungi Kami</SecondaryCta>
        </>
      }
    >
      <Section title="Untuk siapa" eyebrow="Audiens">
        <FeatureGrid items={withIcons(USE_CASES, USE_CASE_ICONS)} columns={2} />
      </Section>
      <Section title="Yang Anda dapatkan" description="Cakupan lengkap yang siap dipakai sejak hari pertama." eyebrow="Fitur" tone="raised">
        <FeatureGrid items={withIcons(CAPABILITIES, CAPABILITY_ICONS)} columns={3} />
      </Section>
      <Section title="Kenapa terpusat lebih enak" eyebrow="Alasan">
        <FeatureGrid items={withIcons(VALUE_PROPOSITIONS, VALUE_ICONS)} columns={2} />
      </Section>
      <Section title="Cara mulai (5 langkah)" description="Dari obrolan pertama sampai terbit pertama." eyebrow="Langkah" tone="raised">
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW_STEPS.map((step, index) => (
            <li
              key={step.title}
              className={CARD_CLASS}
            >
              <div className="space-y-3">
                <span className={ICON_BOX_CLASS}>
                  <span className="font-mono text-xs font-semibold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </span>
                <h3 className="m-0 font-sans text-sm font-semibold tracking-tight text-[#1a2430] transition-colors duration-180 group-hover:text-[#8a5f1c]">
                  {step.title}
                </h3>
                <p className="m-0 font-sans text-xs leading-relaxed text-[#4c5b6b]">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Jaminan kami" description="Komitmen yang tertulis, bukan sekadar janji." eyebrow="Jaminan" tone="band">
        <FeatureGrid items={withIcons(GUARANTEES, GUARANTEE_ICONS)} columns={2} />
      </Section>
    </PublicPage>
  );
}

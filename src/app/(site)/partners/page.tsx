import type { Metadata } from 'next';
import { BadgeCheck } from 'lucide-react';

import { siteMetadata } from '@/ui/site/metadata-guard';
import { getPartnerOrganizations } from '@/modules/content/site-content';
import { PartnersExplorer } from '@/modules/site/components/directory/partners-explorer';
import {
  HeaderPrimaryCta,
  HeaderSecondaryCta,
  PrimaryCta,
  SecondaryCta,
  Section,
} from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION =
  'Organisasi pelanggan dengan langganan aktif di Indicate — berbagai institusi yang mempercayakan publikasi dan arsipnya kepada satu ruang redaksi.';

export function generateMetadata(): Metadata {
  return siteMetadata('Partner', DESCRIPTION, '/partners');
}

/**
 * Render JSON-LD for the partner directory so crawlers read the same list
 * visitors see.
 */
function PartnersJsonLd({ partners }: { readonly partners: readonly { readonly name: string }[] }) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Partner berlangganan Indicate',
    description: DESCRIPTION,
    numberOfItems: partners.length,
    itemListElement: partners.map((partner, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: { '@type': 'Organization', name: partner.name },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, '\\u003c') }}
    />
  );
}

export default async function PartnerPage() {
  const partners = await getPartnerOrganizations();

  return (
    <PublicPage
      eyebrow="Partner"
      title="Dipercaya berbagai institusi"
      description={DESCRIPTION}
      meta={[`${partners.length} partner aktif`, 'Langganan terverifikasi', 'Diperbarui per jam']}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={
        <>
          <HeaderPrimaryCta href="/contact">Jadi Partner</HeaderPrimaryCta>
          <HeaderSecondaryCta href="/network">Lihat Jaringan</HeaderSecondaryCta>
        </>
      }
    >
      <PartnersJsonLd partners={partners} />
      <PartnersExplorer partners={partners} />
      <Section title="Menjadi partner" eyebrow="Bergabung" tone="raised">
        <p className="m-0 font-serif text-2xl leading-snug tracking-tight text-[#1a2430]">
          Satu harga pasti per bulan, sudah termasuk pajak. Hubungi kami, bayar manual ke rekening resmi, dan
          organisasi Anda aktif maksimal 1x24 jam.
        </p>
        <ul className="m-0 mt-8 grid list-none gap-3 p-0 sm:grid-cols-2">
          {[
            'Daftar ini hanya memuat organisasi dengan status aktif dan langganan aktif.',
            'Unit yang ditangguhkan atau dibatalkan otomatis hilang dari daftar ini.',
            'Detail biaya dan alur pembelian ada di halaman harga.',
            'Butuh portal baru untuk unit Anda? Sampaikan lewat kontak — penyiapan dibantu tim sampai jalan.',
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-[3px] border border-[#e2ded2] bg-white px-4 py-3.5"
            >
              <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-[3px] border border-[#b88d3a]/40 bg-[#b88d3a]/[0.08] text-[#8a5f1c]">
                <BadgeCheck className="h-4 w-4" />
              </span>
              <span className="font-sans text-sm leading-relaxed text-[#4c5b6b]">{item}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-8 flex flex-wrap gap-3">
          <PrimaryCta href="/pricing">Lihat Harga</PrimaryCta>
          <SecondaryCta href="/contact">Hubungi Kami</SecondaryCta>
        </p>
      </Section>
    </PublicPage>
  );
}

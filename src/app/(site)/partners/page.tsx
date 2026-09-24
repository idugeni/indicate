import type { Metadata } from 'next';

import { siteMetadata } from '@/ui/site/metadata-guard';
import { getPartnerOrganizations } from '@/modules/content/site-content';
import { groupPartners } from '@/modules/site/components/directory/directory-helpers';
import { PartnersExplorer } from '@/modules/site/components/directory/partners-explorer';
import {
  HeaderPrimaryCta,
  HeaderSecondaryCta,
  PrimaryCta,
  Prose,
  SecondaryCta,
  Section,
  StatBand,
} from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION =
  'Organisasi pelanggan dengan langganan aktif di Indicate — puluhan unit pelaksana teknis yang mempercayakan publikasi dan arsipnya kepada satu ruang redaksi.';

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
  const groups = groupPartners(partners);
  const countOf = (family: string): string => String(groups.find((group) => group.family === family)?.items.length ?? 0);

  return (
    <PublicPage
      eyebrow="Partner"
      title="Dipercaya puluhan unit kerja"
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
      <Section title="Partner dalam angka" eyebrow="Fakta" tone="band">
        <StatBand
          items={[
            { value: String(partners.length), label: 'Total partner aktif' },
            { value: countOf('LAPAS'), label: 'Lapas' },
            { value: countOf('RUTAN'), label: 'Rutan' },
            { value: `${countOf('BAPAS')} + ${countOf('LPKA')}`, label: 'Bapas + LPKA' },
          ]}
        />
      </Section>
      <Section title="Menjadi partner" eyebrow="Bergabung" tone="raised">
        <Prose>
          <p className="m-0 font-sans text-lg leading-8 text-[#1a2430]">
            Satu harga pasti per bulan, sudah termasuk pajak. Hubungi kami, bayar manual ke rekening resmi, dan organisasi Anda aktif maksimal 1x24 jam.
          </p>
          <ul className="m-0 grid max-w-3xl list-disc gap-3 pl-5">
            <li>Daftar ini hanya memuat organisasi dengan status aktif dan langganan aktif.</li>
            <li>Unit yang ditangguhkan atau dibatalkan otomatis hilang dari daftar ini.</li>
            <li>Detail biaya dan alur pembelian ada di halaman harga.</li>
            <li>Butuh portal baru untuk unit Anda? Sampaikan lewat kontak — penyiapan dibantu tim sampai jalan.</li>
          </ul>
        </Prose>
        <p className="m-0 mt-6 flex flex-wrap gap-3">
          <PrimaryCta href="/pricing">Lihat Harga</PrimaryCta>
          <SecondaryCta href="/contact">Hubungi Kami</SecondaryCta>
        </p>
      </Section>
    </PublicPage>
  );
}

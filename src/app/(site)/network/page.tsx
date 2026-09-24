import type { Metadata } from 'next';
import { Database, Globe, MapPin, MousePointerClick } from 'lucide-react';

import { siteMetadata } from '@/ui/site/metadata-guard';
import { getNetworkSites } from '@/modules/content/site-content';
import { groupRegionalByCity, splitSites } from '@/modules/site/components/directory/directory-helpers';
import { NetworkExplorer } from '@/modules/site/components/directory/network-explorer';
import {
  FeatureGrid,
  HeaderPrimaryCta,
  HeaderSecondaryCta,
  Section,
  StatBand,
  withIcons,
} from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const GUIDE_ITEMS = Object.freeze([
  {
    title: 'Portal utama berskala nasional',
    description: 'Redaksi dan rubrik masing-masing, dengan domain, identitas, dan arsip sendiri.',
  },
  {
    title: 'Edisi daerah per kota',
    description: 'Hanya kota cakupan yang tercantum, misalnya Wonosobo.',
  },
  {
    title: 'Satu klik membuka portal',
    description: 'Klik logo portal untuk membuka portal di tab baru.',
  },
  {
    title: 'Live dari database',
    description: 'Daftar ini dibaca langsung dari database dan diperbarui setiap jam.',
  },
]);

const GUIDE_ICONS = Object.freeze([Globe, MapPin, MousePointerClick, Database]);

const DESCRIPTION =
  'Jelajahi seluruh portal berita aktif di jaringan Indicate — portal utama nasional dan edisi daerah, masing-masing dengan identitas dan tautan langsung.';

export function generateMetadata(): Metadata {
  return siteMetadata('Jaringan', DESCRIPTION, '/network');
}

/**
 * Render JSON-LD for the portal directory so crawlers read the same list
 * visitors see.
 */
function NetworkJsonLd({ hostnames }: { readonly hostnames: readonly { readonly name: string; readonly hostname: string }[] }) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Jaringan portal Indicate',
    description: DESCRIPTION,
    numberOfItems: hostnames.length,
    itemListElement: hostnames.map((site, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: { '@type': 'WebSite', name: site.name, url: `https://${site.hostname}` },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, '\\u003c') }}
    />
  );
}

export default async function JaringanPage() {
  const sites = await getNetworkSites();
  const { main, regional } = splitSites(sites);
  const cityCount = groupRegionalByCity(regional).length;

  return (
    <PublicPage
      eyebrow="Jaringan"
      title="Satu dasbor, puluhan wajah penerbit"
      description={DESCRIPTION}
      meta={[`${sites.length} portal aktif`, `${main.length} portal utama`, `${cityCount} kota daerah`]}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={
        <>
          <HeaderPrimaryCta href="/contact">Gabung Jaringan</HeaderPrimaryCta>
          <HeaderSecondaryCta href="/partners">Lihat Partner</HeaderSecondaryCta>
        </>
      }
    >
      <NetworkJsonLd
        hostnames={sites.map((site) => ({ name: site.siteName, hostname: site.hostname }))}
      />
      <NetworkExplorer sites={sites} />
      <Section title="Jaringan dalam angka" eyebrow="Fakta" tone="band">
        <StatBand
          items={[
            { value: String(sites.length), label: 'Portal aktif' },
            { value: String(main.length), label: 'Portal utama' },
            { value: String(cityCount), label: 'Kota daerah' },
            { value: '24', label: 'Jam maks. aktivasi portal baru' },
          ]}
        />
      </Section>
      <Section
        title="Cara membaca jaringan"
        description="Setiap portal punya domain, identitas, dan arsipnya sendiri — semuanya dikelola dari satu ruang redaksi yang sama."
        eyebrow="Panduan"
        tone="raised"
      >
        <FeatureGrid items={withIcons(GUIDE_ITEMS, GUIDE_ICONS)} columns={2} />
      </Section>
    </PublicPage>
  );
}

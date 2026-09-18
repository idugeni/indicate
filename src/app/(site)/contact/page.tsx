import { Suspense } from 'react';
import type { Metadata } from 'next';

import { CONTACT_CHECKLIST } from '@/ui/site/marketing-content';
import { getContactChannels } from '@/modules/content/site-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { CHANNEL_ICONS, FeatureGrid, Prose, SecondaryCta, Section, withIcons } from '@/modules/site/components/layout/content';
import { WhatsAppCard } from '@/modules/site/components/pricing/whatsapp-card';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION =
  'Ada pertanyaan soal biaya, pindahan sistem, atau kebutuhan khusus? Hubungi kami — dijawab manusia, paling lambat 1x24 jam kerja.';

export function generateMetadata(): Metadata {
  return siteMetadata('Kontak', DESCRIPTION, '/contact');
}

async function ContactChannels() {
  const channels = await getContactChannels();
  return (
    <FeatureGrid items={withIcons(channels, CHANNEL_ICONS)} columns={2} />
  );
}

function ContactChannelsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2].map((index) => (
        <div key={index} className="animate-pulse rounded-lg border border-[#e2ded2] bg-white p-5 sm:p-6">
          <div className="h-4 w-24 rounded bg-[#e2ded2]" />
          <div className="mt-3 h-3 w-full rounded bg-[#e2ded2]/70" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#e2ded2]/70" />
        </div>
      ))}
    </div>
  );
}

export default function KontakPage() {
  return (
    <PublicPage
      eyebrow="Kontak"
      title="Mulai dari percakapan singkat"
      description={DESCRIPTION}
      meta={['Respons 1x24 jam kerja', 'Dijawab manusia', 'Tanpa antre tiket']}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={<SecondaryCta href="/pricing">Lihat Info Harga</SecondaryCta>}
    >
      <Section>
        <WhatsAppCard />
      </Section>
      <Section title="Saluran" description="Pilih jalur yang paling nyaman — semuanya dijawab manusia." eyebrow="Kanal" tone="raised">
        <Suspense fallback={<ContactChannelsSkeleton />}>
          <ContactChannels />
        </Suspense>
      </Section>
      <Section title="Agar tinjauan lebih cepat" description="Sertakan informasi berikut pada pesan pertama Anda." eyebrow="Tips">
        <Prose>
          <ul className="grid list-disc gap-2 pl-5">
            {CONTACT_CHECKLIST.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Prose>
      </Section>
    </PublicPage>
  );
}

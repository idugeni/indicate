import { Suspense } from 'react';
import type { Metadata } from 'next';

import { CONTACT_CHANNELS as CONTACT_CHANNEL_FALLBACK, CONTACT_CHECKLIST } from '@/ui/site/marketing-content';
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

/**
 * DB read (hours-TTL) streaming di belakang shell statis: halaman tidak
 * menahan prerender bila pool Supabase lambat (kelas error "Filling a cache
 * during prerender timed out" di production). Fallback = konten statis yang
 * sama persis dengan fallback getContactChannels().
 */
async function ContactChannels() {
  const channels = await getContactChannels();
  return (
    <FeatureGrid items={withIcons(channels.length > 0 ? channels : CONTACT_CHANNEL_FALLBACK, CHANNEL_ICONS)} columns={2} />
  );
}

function ContactChannelsFallback() {
  return (
    <FeatureGrid items={withIcons(CONTACT_CHANNEL_FALLBACK, CHANNEL_ICONS)} columns={2} />
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
        <Suspense fallback={<ContactChannelsFallback />}>
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

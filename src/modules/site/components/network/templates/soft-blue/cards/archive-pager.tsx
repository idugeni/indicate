'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { SoftBluePickCard } from '@/modules/site/components/network/templates/soft-blue/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/soft-blue/ui/section-heading';

export function SoftBlueArchivePager({
  articles,
  heading,
  description,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
}) {
  return (
    <TemplateArchivePager
      articles={articles}
      label={heading}
      header={<SectionHeading description={description}>{heading}</SectionHeading>}
      renderCard={(article, index) => <SoftBluePickCard key={article.id} article={article} index={index} />}
      /* Kartu soft-blue horizontal: gambar di kiri (w-32, lalu w-44 di sm) plus
         baris meta. Dua kolom sejak `sm` menyisakan kolom teks hanya ~70px di
         640px — ruang ArticleMeta ~30px untuk konten yang butuh ~90px, sehingga
         kartu meluber keluar grid dan halaman ikut bergeser horizontal. Dua kolom
         baru aman di lg, saat satu kartu ~478px. `orange-modern` boleh pakai
         `sm:grid-cols-2` karena kartunya vertikal dan teksnya selebar kolom. */
      gridClassName="lg:grid-cols-2"
      pageSize={6}
    />
  );
}

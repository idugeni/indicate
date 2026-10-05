import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ComponentType } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import type { ArticleListItem } from '@/modules/delivery/models';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/ui/format';
import { AuthorAvatar, type AuthorAvatarSkin } from '@/modules/site/components/network/ui/author-avatar';
import { cn } from '@/ui/cn';

/** Gaya badge kategori: pasangan warna teks dan latar. */
export interface PickCardBadgeStyle {
  readonly color: string;
  readonly backgroundColor: string;
}

/** Props baris meta yang diteruskan ke komponen `Meta` milik template. */
export interface PickCardMetaProps {
  readonly publishedAt: string;
  readonly reading: number;
  readonly viewCount: number;
  readonly articleId: string;
  readonly href: string;
}

/** Posisi badge kategori: menumpuk di atas gambar atau sebaris di kepala kartu. */
export type PickCardBadgePlacement = 'header' | 'overlay';

/**
 * Skin kartu pilihan vertikal: seluruh token yang berbeda antar-template sebagai
 * string kelas utuh agar terpindai Tailwind JIT.
 */
export interface PickCardSkin {
  readonly cardClass: string;
  readonly imageWrapperClass: string;
  readonly badgePlacement: PickCardBadgePlacement;
  readonly badgeClass: string;
  readonly badgeStyle: (index: number) => PickCardBadgeStyle;
  readonly headerClass: string;
  readonly titleClass: string;
  readonly titleLinkClass: string;
  readonly descriptionClass: string;
  readonly publisherClass: string;
  readonly footerClass: string;
  readonly arrowClass: string;
  readonly avatarSkin: AuthorAvatarSkin;
  readonly Meta: ComponentType<PickCardMetaProps>;
}

/** Props kartu pilihan vertikal bersama. */
export interface ArticlePickCardProps {
  readonly article: ArticleListItem;
  readonly index: number;
  readonly skin: PickCardSkin;
  readonly sizes?: string | undefined;
}

/**
 * Kartu pilihan vertikal bersama: gambar 16/10, badge kategori, judul `h3`,
 * deskripsi, avatar penerbit, baris meta, dan panah dekoratif.
 *
 * @param article - Artikel yang ditampilkan.
 * @param index - Posisi kartu untuk varian badge.
 * @param skin - Token kelas dan komponen milik template.
 * @param sizes - Atribut `sizes` gambar responsif.
 * @returns Kartu pilihan vertikal.
 */
export function ArticlePickCard({ article, index, skin, sizes = '(max-width: 768px) 100vw, 33vw' }: ArticlePickCardProps) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const badge = skin.badgeStyle(index);
  const publisherName = article.attribution;
  const Meta = skin.Meta;
  return (
    <Card className={cn('min-w-0', skin.cardClass)}>
      <div className={skin.imageWrapperClass}>
        <div className="overflow-hidden rounded-xl">
          <Image
            unoptimized={!isLocalImageSrc(src)}
            src={src}
            alt={article.title}
            loading="lazy"
            className="aspect-[16/10] w-full object-cover"
            width={article.imageWidth ?? 800}
            height={article.imageHeight ?? 500}
            sizes={sizes}
          />
        </div>
        {article.categoryName === null || skin.badgePlacement !== 'overlay' ? null : (
          <span className={skin.badgeClass} style={badge}>
            {article.categoryName}
          </span>
        )}
      </div>
      <CardHeader className={skin.headerClass}>
        {article.categoryName === null || skin.badgePlacement !== 'header' ? null : (
          <p className="m-0">
            <span className={skin.badgeClass} style={badge}>
              {article.categoryName}
            </span>
          </p>
        )}
        <h3 className={skin.titleClass}>
          <Link href={article.href} className={skin.titleLinkClass}>
            {article.title}
          </Link>
        </h3>
        <CardDescription className={skin.descriptionClass}>{article.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2.5 px-5 pb-1">
        <AuthorAvatar skin={skin.avatarSkin} name={publisherName} avatarUrl={article.publisherLogoUrl} size="sm" />
        <p className={skin.publisherClass}>{publisherName}</p>
      </CardContent>
      <CardFooter className={skin.footerClass}>
        <Meta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} articleId={article.id} href={article.href} />
        <Link href={article.href} aria-hidden="true" tabIndex={-1} className={skin.arrowClass}>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}

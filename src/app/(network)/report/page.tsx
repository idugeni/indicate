import type { Metadata } from 'next';
import { ReportPage } from '@/modules/site/components/network/network-listing';
import { deliveryComposition } from '@/modules/delivery';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { normalizeArticleSlug } from '@/modules/site/slug-allocator';

type Props = {
  readonly searchParams: Promise<{ artikel?: string } & { [key: string]: string | string[] | undefined }>;
};

/**
 * The report form is a utility surface, not content: it is `noindex, nofollow` so it
 * never competes with an article for the same query, and `serializeRobots` disallows
 * `/report` for the same reason it disallows `/search`.
 */
export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/report', {}, undefined, undefined, 'noindex, nofollow');
}

export default async function ReportPageRoute({ searchParams }: Props) {
  const resolved = await searchParams;
  const slug = normalizeArticleSlug(resolved.artikel);
  const site = await resolveNetworkSite(slug === null ? {} : { articleSlug: slug }, '/report');
  const { repository } = await deliveryComposition();
  const challengeSitekey = await repository.loadReportChallengeSitekey(site.context);
  return <ReportPage site={site} articleSlug={slug} challengeSitekey={challengeSitekey} />;
}

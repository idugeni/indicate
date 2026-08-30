import type { Metadata } from 'next';
import { ListingPage } from '../public-template';
import { publicMetadata, resolvePublicSite } from '../public-runtime';
export const dynamic = 'force-dynamic';
export const generateMetadata = (): Promise<Metadata> => publicMetadata('/articles');
export default async function ArticlesPage() { const site = await resolvePublicSite({}, '/articles'); return <ListingPage site={site} title="Berita terbaru" />; }

import type { Metadata } from 'next';
import { ListingPage } from '../public-template';
import { publicMetadata, resolvePublicSite } from '../public-runtime';
export const dynamic = 'force-dynamic';
export const generateMetadata = (): Promise<Metadata> => publicMetadata('/search');
export default async function SearchPage({ searchParams }: { readonly searchParams: Promise<{ q?: string }> }) { const { q = '' } = await searchParams; const site = await resolvePublicSite({ search: q }, '/search'); return <><form className="public-search" action="/search" role="search"><label htmlFor="public-search">Cari berita</label><div><input id="public-search" name="q" defaultValue={q} maxLength={120} /><button type="submit">Cari</button></div></form><ListingPage site={site} title={q === '' ? 'Pencarian' : `Hasil untuk “${q}”`} /></>; }

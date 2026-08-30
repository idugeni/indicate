import type { Metadata } from 'next';
import { ListingPage } from '../../public-template';
import { publicMetadata, resolvePublicSite } from '../../public-runtime';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { readonly params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; return publicMetadata(`/categories/${slug}`, { categorySlug: slug }); }
export default async function CategoryPage({ params }: { readonly params: Promise<{ slug: string }> }) { const { slug } = await params; const site = await resolvePublicSite({ categorySlug: slug }, `/categories/${slug}`); return <ListingPage site={site} title={`Kategori: ${site.articles[0]?.categoryName ?? slug}`} />; }

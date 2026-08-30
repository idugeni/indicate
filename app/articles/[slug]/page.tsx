import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticlePage } from '../../public-template';
import { publicMetadata, resolvePublicSite } from '../../public-runtime';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { readonly params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; return publicMetadata(`/articles/${slug}`, { articleSlug: slug }); }
export default async function DetailPage({ params }: { readonly params: Promise<{ slug: string }> }) { const { slug } = await params; const site = await resolvePublicSite({ articleSlug: slug }, `/articles/${slug}`); const article = site.articles[0]; if (article === undefined) notFound(); return <ArticlePage site={site} article={article} />; }

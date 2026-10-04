import type { ArticleListItem } from '@/modules/delivery/models';

/** Satu topik agregat beserta jumlah artikelnya. */
export interface SidebarTopic {
  readonly tag: string;
  readonly count: number;
}

/** Satu kanal agregat beserta jumlah artikelnya. */
export interface SidebarChannel {
  readonly name: string;
  readonly slug: string;
  readonly count: number;
}

/** Hasil seleksi sidebar artikel: partisi tanpa duplikat antar seksi. */
export interface ArticleSidebarData {
  readonly bacaJuga: readonly ArticleListItem[];
  readonly terpopuler: readonly ArticleListItem[];
  readonly terbaru: readonly ArticleListItem[];
  readonly topics: readonly SidebarTopic[];
  readonly channels: readonly SidebarChannel[];
}

const BACA_JUGA_SIZE = 4;
const TERPOPULER_SIZE = 5;
const TERBARU_SIZE = 5;
const TOPIC_SIZE = 10;
const CHANNEL_SIZE = 8;

/**
 * Seleksi konten sidebar artikel dari proyeksi yang sudah dimuat.
 *
 * @param articles - Seluruh artikel situs yang sudah ada di memori.
 * @param currentId - Id artikel aktif yang wajib dikecualikan.
 * @param related - Artikel terkait dari rute (sudah dahulukan satu kategori).
 * @returns Partisi baca-juga, terpopuler, terbaru, topik, dan kanal.
 */
export function selectArticleSidebar(
  articles: readonly ArticleListItem[],
  currentId: string,
  related: readonly ArticleListItem[],
): ArticleSidebarData {
  const bacaJuga = related.filter((item) => item.id !== currentId).slice(0, BACA_JUGA_SIZE);
  const bacaJugaIds = new Set<string>([currentId, ...bacaJuga.map((item) => item.id)]);

  const terpopuler = [...articles]
    .filter((item) => !bacaJugaIds.has(item.id))
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, TERPOPULER_SIZE);
  const terpopulerIds = new Set<string>(terpopuler.map((item) => item.id));

  const terbaru = [...articles]
    .filter((item) => !bacaJugaIds.has(item.id) && !terpopulerIds.has(item.id))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, TERBARU_SIZE);

  const tagCounts = new Map<string, number>();
  for (const item of articles) {
    for (const raw of item.tags) {
      const tag = raw.trim();
      if (tag === '') continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topics: SidebarTopic[] = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'id'))
    .slice(0, TOPIC_SIZE);

  const channelCounts = new Map<string, { readonly name: string; readonly slug: string; count: number }>();
  for (const item of articles) {
    if (item.categoryName === null || item.categorySlug === null) continue;
    const key = item.categorySlug;
    const prev = channelCounts.get(key);
    if (prev === undefined) {
      channelCounts.set(key, { name: item.categoryName, slug: item.categorySlug, count: 1 });
    } else {
      channelCounts.set(key, { ...prev, count: prev.count + 1 });
    }
  }
  const channels: SidebarChannel[] = [...channelCounts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'))
    .slice(0, CHANNEL_SIZE);

  return { bacaJuga, terpopuler, terbaru, topics, channels };
}

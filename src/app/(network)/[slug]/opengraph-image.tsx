import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = {
  readonly params: Promise<{ slug: string }>;
};

/**
 * Turn an article slug into a title-case headline.
 *
 * @param slug - Raw article slug.
 * @returns Headline of at most 12 words, truncated past 110 chars.
 */
export function humanizeSlug(slug: string): string {
  const words = slug
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(' ');
  if (words === '') return 'Artikel';
  const titled = words.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
  return titled.length > 110 ? `${titled.slice(0, 107)}…` : titled;
}

/** Tenant-agnostic article card: renders the slug only, never tenant DB content, so no cross-site data leaks via images. */
export default async function ArticleOpenGraphImage({ params }: Props) {
  const { slug } = await params;
  const title = humanizeSlug(slug);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          backgroundColor: '#0e1320',
          color: '#edeadd',
          fontFamily: 'sans-serif',
          padding: '64px 72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '22px',
            color: '#e4b96a',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
          }}
        >
          Warta & Laporan Berkala
        </div>
        <div style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px', color: '#9fa6b8' }}>
          <div style={{ width: '48px', height: '2px', backgroundColor: '#cc9a44' }} />
          Jaringan Penerbitan INDICATE
        </div>
      </div>
    ),
    { ...size },
  );
}

import type { MetadataRoute } from 'next';

/** Control-plane manifest only: tenant hosts neither serve nor reference it, so installability stays on the Dashboard host. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Indicate — Satu Ruang Redaksi',
    short_name: 'Indicate',
    description:
      'Indicate menyatukan pengelolaan puluhan domain berita ke dalam satu Dashboard terpusat.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e1320',
    theme_color: '#0e1320',
    lang: 'id-ID',
    icons: [
      {
        src: '/apple-icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}

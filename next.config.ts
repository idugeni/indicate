import type { NextConfig } from 'next';
import { getControlHosts, isProductionEdge, parseMvpRootHosts } from '@/core/config/edge-hosts';

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

function tenantImagePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [];
  const seen = new Set<string>();

  const push = (protocol: 'http' | 'https', hostname: string | undefined) => {
    if (!hostname || typeof hostname !== 'string') return;
    const cleanHost = hostname.trim();
    if (cleanHost === '') return;

    const key = `${protocol}://${cleanHost}`;
    if (!seen.has(key)) {
      seen.add(key);
      patterns.push({ protocol, hostname: cleanHost });
    }
  };

  const { dashboard, api, webhook } = getControlHosts();
  for (const host of [dashboard, api, webhook]) {
    push('https', host);
  }

  const roots = parseMvpRootHosts(process.env.MVP_ROOT_HOSTS);
  for (const root of roots) {
    push('https', root);
    push('https', `*.${root}`);
  }

  if (!isProductionEdge()) {
    push('http', 'localhost');
    push('http', '127.0.0.1');
  }

  return patterns;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  // Wajib: seluruh codebase memakai `'use cache'` (site-content, network-runtime).
  cacheComponents: true,
  serverExternalPackages: [
    'postgres',
    'drizzle-orm',
    'sharp',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    '@upstash/redis',
    'resend',
  ],

  async headers() {
    const denyEdgeCache = () => [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }];
    return ['/dashboard/:path*', '/sign-in/:path*', '/sign-up/:path*', '/update-password/:path*', '/api/:path*'].map(
      (source) => ({ source, headers: denyEdgeCache() }),
    );
  },

  images: {
    // Wajib true: mematikan Image Optimization API Vercel agar tidak ada
    // biaya transformasi gambar; seluruh <Image> disajikan apa adanya.
    // `formats` dihapus karena hanya berlaku untuk optimizer yang dimatikan;
    // `remotePatterns` dipertahankan sebagai kontrak allowlist bila flag ini
    // suatu saat dikembalikan.
    unoptimized: true,
    remotePatterns: [
      ...tenantImagePatterns(),
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.indicate.website',
      },
    ],
  },

  experimental: {
    typedEnv: true,
    optimizePackageImports: [
      '@base-ui/react',
      '@shadcn/react',
      'lucide-react',
      'react-icons',
      'cmdk',
      'sonner',
      'recharts',
      'embla-carousel-react',
      'react-day-picker',
      'react-resizable-panels',
      'input-otp',
      'nuqs',
      '@tanstack/react-table',
      'date-fns',
    ],
  },
};

export default nextConfig;
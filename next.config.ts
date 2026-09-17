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

  const { dashboard, api, webhook, docs } = getControlHosts();
  for (const host of [dashboard, api, webhook, docs]) {
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

const controlHosts = getControlHosts();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Wajib: seluruh codebase memakai `'use cache'` (site-content, network-runtime).
  cacheComponents: true,
  serverExternalPackages: ['postgres', 'drizzle-orm'],

  async headers() {
    if (!controlHosts.dashboard) {
      return [];
    }

    return [
      {
        source: '/',
        has: [{ type: 'host', value: controlHosts.dashboard }],
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
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
        hostname: '*.indicate.web.id',
      },
    ],
  },

  experimental: {
    typedEnv: true,
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
};

export default nextConfig;
import type { NextConfig } from 'next';
import { getControlHosts, isProductionEdge, parseMvpRootHosts } from '@/core/config/edge-hosts';

interface ImageRemotePattern {
  readonly protocol: 'http' | 'https';
  readonly hostname: string;
}

/** Same-origin tenant media allowlist: every tenant root, one-level region subdomains, and control-plane hosts. Unknown hosts stay rejected. */
function tenantImagePatterns(): ImageRemotePattern[] {
  const patterns: ImageRemotePattern[] = [];
  const seen = new Set<string>();
  const push = (protocol: 'http' | 'https', hostname: string) => {
    const key = `${protocol}://${hostname}`;
    if (!seen.has(key) && hostname !== '') {
      seen.add(key);
      patterns.push({ protocol, hostname });
    }
  };

  const { dashboard, api, webhook } = getControlHosts();
  for (const host of [dashboard, api, webhook]) push('https', host);

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

  serverExternalPackages: ['postgres', 'drizzle-orm'],

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      ...tenantImagePatterns(),
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '**.indicate.web.id',
      },
    ],
  },

  experimental: {
    typedEnv: true,
    optimizePackageImports: [
      'lucide-react',
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

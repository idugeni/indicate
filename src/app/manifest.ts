import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { deliveryComposition } from '@/modules/delivery';

/** Control-plane manifest: installability stays on the Dashboard host. */
export function controlPlaneManifest(): MetadataRoute.Manifest {
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
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

/**
 * Build the tenant install manifest pointing at stable same-host brand bytes.
 *
 * @param name - Tenant portal name.
 * @param description - Tenant portal description.
 * @returns Manifest with tenant identity and no control-plane icon leak.
 */
export function tenantManifestData(name: string, description: string): MetadataRoute.Manifest {
  return {
    name,
    short_name: name,
    description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'id-ID',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

/**
 * Serve the install manifest for the requesting host.
 *
 * @returns Tenant manifest on portal hostnames, control-plane manifest everywhere else.
 * @remarks Tenant hosts must never serve the Indicate manifest: Chrome and crawlers read install icons from here, so a shared manifest would reintroduce the exact brand leak the same-host icon routes fix.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  try {
    const incoming = await headers();
    const host = incoming.get('x-forwarded-host') ?? incoming.get('host');
    const { repository, resolver } = await deliveryComposition();
    const classification = await resolver.classify(host);
    if (classification.kind !== 'site') return controlPlaneManifest();
    const shell = await repository.loadSiteShell(classification.context);
    if (shell === null) return controlPlaneManifest();
    return tenantManifestData(shell.settings.name, shell.settings.description);
  } catch {
    return controlPlaneManifest();
  }
}

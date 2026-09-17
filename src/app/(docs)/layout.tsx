import { Suspense, type ReactNode } from 'react';

import { requireDocsSurface } from '@/ui/site/metadata-guard';
import { DocsShell } from '@/modules/docs/components/docs-ui';
import { docsRequestHost } from '@/modules/docs/page-meta';

async function DocsGuard() {
  await requireDocsSurface();
  return null;
}

export default async function DocsLayout({ children }: { readonly children: ReactNode }) {
  const host = await docsRequestHost();
  return (
    <DocsShell host={host}>
      <Suspense fallback={null}>
        <DocsGuard />
      </Suspense>
      {children}
    </DocsShell>
  );
}

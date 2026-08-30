import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

const topology = [
  ['Application', 'One Next.js App Router deployment'],
  ['Identity and data', 'One Supabase project with Auth and PostgreSQL'],
  ['Media', 'One private Cloudflare R2 bucket'],
  ['Coordination', 'One Upstash Redis resource'],
  ['Network authority', 'Cloudflare DNS, TLS proxy, and CDN'],
  ['Hosting', 'One Vercel project with exact domains only'],
] as const;

export default function FoundationPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground" data-stage="foundation">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8" aria-labelledby="page-title">
        <div className="space-y-4">
          <Badge>Major Stage 1</Badge>
          <h1 id="page-title" className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            One secure foundation for every Indicate publication.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            The control plane is ready for tenant-safe services. Public domains remain data-driven,
            Cloudflare-authoritative, and isolated within one shared application topology.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2" aria-label="Approved shared topology">
          {topology.map(([title, description]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>{description}</CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground" role="status">
          Foundation healthy. Tenant data services are intentionally unavailable until their gated stage.
        </p>
      </section>
    </main>
  );
}

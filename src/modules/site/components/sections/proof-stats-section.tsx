import { CARD_CLASS, Section } from '@/modules/site/components/layout/content';
import { PROOF_POINTS, type ProofPointItem } from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';

const SYSTEM_METRICS: readonly { readonly title: string; readonly value: string; readonly description: string }[] = Object.freeze([
  {
    title: 'Keandalan sistem',
    value: '99.99%',
    description: 'Uptime tergaransi dengan Cloudflare Enterprise CDN · Terdistribusi',
  },
  {
    title: 'Isolasi tenant',
    value: '100% Exact',
    description: 'Tanpa fallback tenant atau pencocokan substring · Strict RLS',
  },
  {
    title: 'Waktu eksekusi',
    value: '< 50ms',
    description: 'Dibatasi oleh Postgres transactional idempotency · PostgreSQL 17',
  },
]);

export function ProofStatsSection() {
  return (
    <Section
      title="Infrastruktur yang bisa diaudit"
      eyebrow="Bukti"
      description="Angka operasional dan jaminan arsitektur — bukan klaim pemasaran."
    >
      <div className="space-y-10">
        <dl className="m-0 grid gap-4 p-0 sm:grid-cols-3">
          {SYSTEM_METRICS.map((metric) => (
            <div key={metric.title} className={cn(CARD_CLASS, 'gap-2')}>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">
                {metric.title}
              </dt>
              <dd className="m-0 font-mono text-3xl font-bold tabular-nums tracking-tight text-paper">
                {metric.value}
              </dd>
              <dd className="m-0 font-sans text-xs leading-relaxed text-paper-dim">
                {metric.description}
              </dd>
            </div>
          ))}
        </dl>

        <dl className="m-0 grid gap-4 border-t border-hairline p-0 pt-8 md:grid-cols-3">
          {(PROOF_POINTS as ProofPointItem[]).map((point) => (
            <div key={point.term} className={CARD_CLASS}>
              <dt className="font-mono text-xs font-medium uppercase tracking-wider text-brass">
                {point.term}
              </dt>
              <dd className="m-0 font-sans text-sm leading-relaxed text-paper-dim">
                {point.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

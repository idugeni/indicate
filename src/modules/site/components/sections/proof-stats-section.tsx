import { CARD_CLASS, Section } from '@/modules/site/components/layout/content';
import { PROOF_POINTS, type ProofPointItem } from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';

const SYSTEM_METRICS: readonly { readonly title: string; readonly value: string; readonly description: string }[] = Object.freeze([
  {
    title: 'Target keandalan',
    value: '99.9%+',
    description: 'Target operasional di atas CDN tepi · Bukan SLA, lihat Ketentuan §17',
  },
  {
    title: 'Isolasi tenant',
    value: 'Exact-host',
    description: 'Dirancang tanpa fallback tenant atau pencocokan substring · RLS berlapis',
  },
  {
    title: 'Waktu eksekusi',
    value: '< 50ms',
    description: 'Target operasional umum, bervariasi menurut beban · PostgreSQL 17',
  },
]);

export function ProofStatsSection() {
  return (
    <Section
      title="Infrastruktur yang bisa diaudit"
      eyebrow="Bukti"
      description="Target operasional dan desain arsitektur — bukan SLA atau jaminan ketersediaan."
    >
      <dl className="m-0 grid grid-cols-2 gap-4 p-0 sm:grid-cols-3">
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
    </Section>
  );
}

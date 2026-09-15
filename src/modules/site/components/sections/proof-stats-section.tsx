import { Section } from '@/modules/site/components/layout/content';
import { PROOF_POINTS, type ProofPointItem } from '@/ui/site/marketing-content';

const SYSTEM_METRICS: readonly { readonly value: string; readonly label: string; readonly note: string }[] = Object.freeze([
  {
    value: '99,9%',
    label: 'Target keandalan di atas CDN tepi',
    note: 'Target operasional — bukan SLA, lihat Ketentuan §17.',
  },
  {
    value: 'Eksak',
    label: 'Kecocokan host tanpa fallback tenant',
    note: 'Tanpa pencocokan substring, RLS berlapis.',
  },
  {
    value: '<50ms',
    label: 'Waktu eksekusi umum',
    note: 'Bervariasi menurut beban · PostgreSQL 17.',
  },
]);

export function ProofStatsSection() {
  return (
    <Section
      title="Infrastruktur yang bisa diaudit"
      eyebrow="Bukti"
      description="Target operasional dan desain arsitektur — bukan SLA atau jaminan ketersediaan."
    >
      <dl className="m-0 grid gap-8 p-0 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-hairline">
        {SYSTEM_METRICS.map((metric) => (
          <div key={metric.label} className="sm:px-8 sm:first:pl-0 sm:last:pr-0">
            <dd className="m-0 font-mono text-4xl font-medium tabular-nums tracking-tight text-paper md:text-5xl">
              {metric.value}
            </dd>
            <dt className="mt-3 font-sans text-base font-medium text-paper">{metric.label}</dt>
            <dd className="m-0 mt-1 font-sans text-sm leading-relaxed text-paper-faint">
              {metric.note}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-12 grid gap-8 border-t border-hairline pt-8 md:grid-cols-3">
        {(PROOF_POINTS as ProofPointItem[]).map((point) => (
          <div key={point.term}>
            <h3 className="m-0 font-sans text-base font-semibold tracking-tight text-paper">
              {point.term}
            </h3>
            <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
              {point.detail}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

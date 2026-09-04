import { Container, Section } from '@/modules/site/components/layout/content';
import { PROOF_POINTS, type ProofPointItem } from '@/ui/site/marketing-content';

export function ProofStatsSection() {
  return (
    <Section
      title="Infrastruktur yang bisa diaudit"
      eyebrow="Bukti"
      description="Angka operasional dan jaminan arsitektur — bukan klaim pemasaran."
    >
      <Container className="px-0">
        <dl className="m-0 grid gap-x-8 gap-y-6 sm:grid-cols-3">
          <div className="border-l-2 border-signal/60 pl-4">
            <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">
              Keandalan sistem
            </dt>
            <dd className="m-0 mt-2 font-mono text-3xl font-bold tabular-nums text-paper">99.99%</dd>
            <dd className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
              Uptime tergaransi dengan Cloudflare Enterprise CDN · Terdistribusi
            </dd>
          </div>
          <div className="border-l-2 border-brass/60 pl-4">
            <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">
              Isolasi tenant
            </dt>
            <dd className="m-0 mt-2 font-mono text-3xl font-bold tabular-nums text-paper">100% Exact</dd>
            <dd className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
              Tanpa fallback tenant atau pencocokan substring · Strict RLS
            </dd>
          </div>
          <div className="border-l-2 border-hairline-strong pl-4">
            <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">
              Waktu eksekusi
            </dt>
            <dd className="m-0 mt-2 font-mono text-3xl font-bold tabular-nums text-paper">&lt; 50ms</dd>
            <dd className="m-0 mt-1 font-sans text-xs leading-relaxed text-paper-dim">
              Dibatasi oleh Postgres transactional idempotency · PostgreSQL 17
            </dd>
          </div>
        </dl>

        <dl className="m-0 mt-10 grid gap-x-10 gap-y-6 border-t border-hairline pt-8 md:grid-cols-3">
          {(PROOF_POINTS as ProofPointItem[]).map((point) => (
            <div key={point.term}>
              <dt className="font-mono text-xs font-medium uppercase tracking-wider text-brass">
                {point.term}
              </dt>
              <dd className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
                {point.detail}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  );
}

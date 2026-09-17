import type { Metadata } from 'next';

import { docsPageMetadata, docsRequestHost } from '@/modules/docs/page-meta';
import { DocsPager } from '@/modules/docs/components/docs-pager';
import { apiActionScopeTable, buildOpenApiDocument } from '@/modules/docs/openapi';
import { DocCode, DocH2, DocP, DocTable, DocTitle, InlineCode } from '@/modules/docs/components/docs-ui';

export async function generateMetadata(): Promise<Metadata> {
  return docsPageMetadata(await docsRequestHost(), 'api-reference');
}

type JsonSchema = {
  readonly type?: string;
  readonly format?: string;
  readonly description?: string;
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly default?: unknown;
  readonly nullable?: boolean;
  readonly items?: JsonSchema;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: JsonSchema | boolean;
  readonly oneOf?: readonly JsonSchema[];
  readonly minProperties?: number;
};

function typeLabel(schema: JsonSchema): string {
  if (schema.const !== undefined) return `"${String(schema.const)}"`;
  if (schema.enum !== undefined) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  if (schema.type === 'array' && schema.items !== undefined) return `array<${typeLabel(schema.items)}>`;
  if (schema.type === 'object' && schema.additionalProperties !== undefined && typeof schema.additionalProperties === 'object') {
    return 'map';
  }
  return `${schema.type ?? 'any'}${schema.format === undefined ? '' : `(${schema.format})`}${schema.nullable === true ? ' | null' : ''}`;
}

function ruleLabel(name: string, schema: JsonSchema, required: boolean): string {
  const rules: string[] = [required ? 'wajib' : 'opsional'];
  if (schema.minLength !== undefined || schema.maxLength !== undefined) {
    rules.push(`panjang ${schema.minLength ?? 0}–${schema.maxLength ?? '∞'}`);
  }
  if (schema.minItems !== undefined || schema.maxItems !== undefined) {
    rules.push(`item ${schema.minItems ?? 0}–${schema.maxItems ?? '∞'}`);
  }
  if (schema.minimum !== undefined) rules.push(`≥ ${schema.minimum}`);
  if (schema.pattern !== undefined) rules.push('pola regex');
  if (schema.default !== undefined) rules.push(`default ${JSON.stringify(schema.default)}`);
  return rules.join(', ');
}

function SchemaRows({ schema }: { readonly schema: JsonSchema }) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const rows = Object.entries(properties).map(([name, prop]) => [
    <span key="n" className="font-mono text-[13px]">{name}</span>,
    <span key="t" className="font-mono text-[13px]">{typeLabel(prop)}</span>,
    ruleLabel(name, prop, required.has(name)),
    <span key="d">
      {prop.description ?? '—'}
      {prop.oneOf === undefined
        ? null
        : (
          <span className="mt-1 block font-mono text-xs text-slate-500">
            {prop.oneOf.map((option) => JSON.stringify(option.properties)).join(' | ')}
          </span>
        )}
    </span>,
  ]);
  return <DocTable head={['Field', 'Tipe', 'Aturan', 'Keterangan']} rows={rows} />;
}

const INSPECT_SNIPPET =
  "curl -s https://docs.indicate.web.id/openapi.json | python3 -c 'import json,sys; print(list(json.load(sys.stdin)[\"paths\"]))'";

export default function ApiReferencePage() {
  const document = buildOpenApiDocument('api.indicate.web.id') as {
    paths: Record<string, { post: { description: string } }>;
    components: { schemas: Record<string, JsonSchema> };
  };
  const actions = apiActionScopeTable();
  return (
    <div>
      <DocTitle title="Referensi API v1" description="Sembilan aksi POST /api/v1/commands. Skema di bawah dirender dari modul spesifikasi yang sama dengan openapi.json — keduanya tak bisa divergen." />
      <DocP>
        Basis: <InlineCode>https://api.indicate.web.id/api/v1/commands</InlineCode> · Auth:{' '}
        <InlineCode>Authorization: Bearer &lt;key&gt;</InlineCode> · Body:{' '}
        <InlineCode>{'{ "action": "...", "payload": {...} }'}</InlineCode> · Sukses:{' '}
        <InlineCode>{'{ "data": ..., "requestId": "..." }'}</InlineCode>.
      </DocP>
      {actions.map(({ action, scope, summary }) => {
        const schemaKey = `Payload_${action.replaceAll('.', '_')}`;
        const schema = document.components.schemas[schemaKey];
        if (schema === undefined) return null;
        return (
          <section key={action}>
            <DocH2>
              <span className="font-mono text-lg">{action}</span>
            </DocH2>
            <DocP>
              {summary} Scope: <InlineCode>{scope}</InlineCode>.
            </DocP>
            <SchemaRows schema={schema} />
          </section>
        );
      })}
      <DocH2>Contoh lengkap per aksi</DocH2>
      <DocP>
        Contoh siap salin yang lolos validasi server (dijaga contract test) tersedia di{' '}
        <InlineCode>/openapi.json</InlineCode> bagian <InlineCode>examples</InlineCode> tiap aksi.
      </DocP>
      <DocCode language="bash" code={INSPECT_SNIPPET} />
      <DocsPager slug="api-reference" />
    </div>
  );
}

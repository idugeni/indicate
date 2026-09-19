import { API_COMMANDS, apiCommandScope, type ApiCommand } from '@/modules/integrations/api-command-scopes';

export const OPENAPI_VERSION = '3.1.0';
export const DOCS_SPEC_VERSION = '1.0.0';

const UUID_EXAMPLE_ARTICLE = '11111111-1111-4111-8111-111111111111';
const UUID_EXAMPLE_SITE_A = '22222222-2222-4222-8222-222222222222';
const UUID_EXAMPLE_SITE_B = '33333333-3333-4333-8333-333333333333';
const UUID_EXAMPLE_JOB = '44444444-4444-4444-8444-444444444444';
const UUID_EXAMPLE_REGION = '55555555-5555-4555-8555-555555555555';

const uuidSchema = { type: 'string', format: 'uuid' } as const;

const errorEnvelopeSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', description: 'Kode publik: INVALID_INPUT, CONFLICT, IDEMPOTENCY_CONFLICT, INVALID_STATE_TRANSITION, RESOURCE_UNAVAILABLE, RATE_LIMITED, DEPENDENCY_UNAVAILABLE.' },
        message: { type: 'string' },
        fields: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } }, description: 'Rincian per field bila relevan; RATE_LIMITED membawa retryAfterSeconds.' },
      },
    },
  },
} as const;

const overrideSchema = {
  type: 'object',
  minProperties: 1,
  properties: {
    title: { type: 'string', minLength: 10, maxLength: 160, description: 'Judul khusus portal; wajib unik antar portal.' },
    description: { type: 'string', minLength: 50, maxLength: 500, description: 'Deskripsi khusus portal; wajib unik antar portal.' },
    imageMediaId: { ...uuidSchema, description: 'Media gambar khusus portal yang sudah aktif.' },
  },
} as const;

const payloadSchemas = {
  'article.create': {
    type: 'object',
    required: ['regionId', 'slug', 'title', 'body', 'source'],
    properties: {
      regionId: uuidSchema,
      publisherId: { ...uuidSchema, nullable: true },
      categoryId: { ...uuidSchema, nullable: true },
      authorId: { ...uuidSchema, nullable: true },
      slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', description: 'Slug hostname-safe; slug rute portal dicadangkan.' },
      title: { type: 'string', minLength: 1, maxLength: 300 },
      body: { type: 'string', minLength: 1, maxLength: 200000, description: 'Mendukung **tebal**, *miring*, `- daftar`, dan [gambar:N] sebaris sendiri.' },
      source: { type: 'string', minLength: 1, maxLength: 500 },
      tags: { type: 'array', maxItems: 10, items: { type: 'string', minLength: 1, maxLength: 60 } },
      status: { type: 'string', enum: ['draft', 'active'], default: 'draft' },
    },
  },
  'media.reserve': {
    type: 'object',
    required: ['filename', 'mediaType', 'sizeBytes', 'checksum', 'purpose', 'owner'],
    properties: {
      filename: { type: 'string', minLength: 1, maxLength: 255 },
      mediaType: { type: 'string', description: 'Salah satu dari policy: image/jpeg, image/png, image/webp, image/avif, image/x-icon. HEIC didukung via konversi dashboard.' },
      sizeBytes: { type: 'integer', minimum: 1, description: 'Batas policy 10MB; pipeline dashboard menargetkan ≤1,5MB WebP.' },
      checksum: { type: 'string', pattern: '^[A-Za-z0-9+/]{43}=$', description: 'SHA-256 base64 dari byte yang akan diunggah; diverifikasi HEAD sebelum aktivasi.' },
      purpose: { type: 'string', minLength: 1, maxLength: 100 },
      owner: {
        oneOf: [
          { type: 'object', required: ['kind', 'articleId'], properties: { kind: { const: 'article' }, articleId: uuidSchema } },
          { type: 'object', required: ['kind', 'siteId'], properties: { kind: { const: 'site' }, siteId: uuidSchema } },
          { type: 'object', required: ['kind'], properties: { kind: { const: 'organization' } } },
        ],
        description: 'Tepat satu pemilik; key R2 mengikuti pemilik (articles/{id}/, sites/{siteId}/, assets/).',
      },
    },
  },
  'media.complete': {
    type: 'object',
    required: ['reservationId'],
    properties: {
      reservationId: { ...uuidSchema, description: 'Reservasi dari media.reserve; verifikasi HEAD (ukuran + checksum) sebelum aktivasi.' },
      thumb: {
        type: 'object',
        required: ['sizeBytes', 'checksum'],
        properties: {
          sizeBytes: { type: 'integer', minimum: 1 },
          checksum: { type: 'string', pattern: '^[A-Za-z0-9+/]{43}=$' },
        },
        description: 'Opsional; thumb best-effort, kegagalannya tak menggagalkan aset utama.',
      },
    },
  },
  'publication.request': {
    type: 'object',
    required: ['articleId', 'siteIds', 'idempotencyKey', 'options'],
    properties: {
      articleId: uuidSchema,
      siteIds: { type: 'array', minItems: 1, maxItems: 100, items: uuidSchema },
      idempotencyKey: { type: 'string', minLength: 1, maxLength: 200 },
      options: { type: 'object', description: 'Opsi kanonis bebas; masuk fingerprint idempoten.' },
      overrides: { type: 'object', additionalProperties: overrideSchema, description: 'Wajib per site bila multi-site; tiap judul/deskripsi harus unik.' },
    },
  },
  'publication.requestBulk': {
    type: 'object',
    required: ['articleIds', 'siteIds', 'idempotencyKey', 'options'],
    properties: {
      articleIds: { type: 'array', minItems: 1, maxItems: 20, items: uuidSchema },
      siteIds: { type: 'array', minItems: 1, maxItems: 100, items: uuidSchema },
      idempotencyKey: { type: 'string', minLength: 1, maxLength: 200, description: 'Difacto per artikel menjadi {key}:{articleId}.' },
      options: { type: 'object' },
      overrides: { type: 'object', additionalProperties: overrideSchema, description: 'Satu peta dipakai semua artikel; untuk judul per artikel berbeda gunakan request satuan.' },
    },
  },
  'publication.suggest': {
    type: 'object',
    required: ['articleId', 'siteIds'],
    properties: {
      articleId: uuidSchema,
      siteIds: { type: 'array', minItems: 1, maxItems: 100, items: uuidSchema },
    },
    description: 'Tanpa efek tulis; mengembalikan override unik deterministik per portal.',
  },
  'publication.retry': {
    type: 'object',
    required: ['jobId'],
    properties: { jobId: uuidSchema, targetIds: { type: 'array', minItems: 1, maxItems: 100, items: uuidSchema } },
  },
  'publication.unpublish': {
    type: 'object',
    required: ['jobId'],
    properties: { jobId: uuidSchema, targetIds: { type: 'array', minItems: 1, maxItems: 100, items: uuidSchema } },
  },
  'publication.status': {
    type: 'object',
    required: ['jobId'],
    properties: { jobId: uuidSchema },
  },
} as const satisfies Record<ApiCommand, unknown>;

const ACTION_SUMMARIES: Record<ApiCommand, string> = {
  'article.create': 'Buat artikel kanonis (draft/aktif).',
  'media.reserve': 'Reservasi key upload media + otorisasi PUT R2 bertanda.',
  'media.complete': 'Verifikasi HEAD lalu aktivasi media yang sudah diunggah.',
  'publication.request': 'Minta penerbitan satu artikel ke banyak portal (guard varian unik).',
  'publication.requestBulk': 'Minta penerbitan banyak artikel dengan satu peta override.',
  'publication.suggest': 'Minta saran judul/deskripsi unik per portal tanpa menulis job.',
  'publication.retry': 'Ulangi target job yang gagal.',
  'publication.unpublish': 'Tarik publikasi target job.',
  'publication.status': 'Baca status job + URL tayang (scope baca).',
};

export const OPENAPI_ACTION_EXAMPLES: Record<ApiCommand, { readonly payload: unknown }> = {
  'article.create': {
    payload: {
      regionId: UUID_EXAMPLE_REGION,
      slug: 'contoh-rilis-pers-redaksi-2026',
      title: 'Contoh Rilis Pers Redaksi 2026',
      body: 'Paragraf pembuka rilis.\n\nParagraf kedua dengan **fakta kunci**.',
      source: 'Redaksi Indicate',
      tags: ['contoh'],
      status: 'draft',
    },
  },
  'media.reserve': {
    payload: {
      filename: 'liputan.jpg',
      mediaType: 'image/jpeg',
      sizeBytes: 412876,
      checksum: `${'A'.repeat(43)}=`,
      purpose: 'article-image',
      owner: { kind: 'article', articleId: UUID_EXAMPLE_ARTICLE },
    },
  },
  'media.complete': {
    payload: { reservationId: UUID_EXAMPLE_JOB },
  },
  'publication.request': {
    payload: {
      articleId: UUID_EXAMPLE_ARTICLE,
      siteIds: [UUID_EXAMPLE_SITE_A, UUID_EXAMPLE_SITE_B],
      idempotencyKey: 'docs-quickstart-001',
      options: {},
      overrides: {
        [UUID_EXAMPLE_SITE_A]: {
          title: 'Contoh Rilis Pers Redaksi — Sorotan Portal A',
          description: 'Ringkasan rilis pers redaksi untuk pembaca Portal A, berikut konteks dan dampaknya bagi warga.',
        },
        [UUID_EXAMPLE_SITE_B]: {
          title: 'Contoh Rilis Pers Redaksi — Fokus Portal B',
          description: 'Liputan rilis pers redaksi disesuaikan untuk pembaca Portal B dengan konteks wilayah yang relevan.',
        },
      },
    },
  },
  'publication.requestBulk': {
    payload: {
      articleIds: [UUID_EXAMPLE_ARTICLE],
      siteIds: [UUID_EXAMPLE_SITE_A],
      idempotencyKey: 'docs-bulk-001',
      options: {},
      overrides: {
        [UUID_EXAMPLE_SITE_A]: {
          title: 'Contoh Rilis Pers Redaksi — Sorotan Portal A',
          description: 'Ringkasan rilis pers redaksi untuk pembaca Portal A, berikut konteks dan dampaknya bagi warga.',
        },
      },
    },
  },
  'publication.suggest': {
    payload: { articleId: UUID_EXAMPLE_ARTICLE, siteIds: [UUID_EXAMPLE_SITE_A, UUID_EXAMPLE_SITE_B] },
  },
  'publication.retry': { payload: { jobId: UUID_EXAMPLE_JOB } },
  'publication.unpublish': { payload: { jobId: UUID_EXAMPLE_JOB } },
  'publication.status': { payload: { jobId: UUID_EXAMPLE_JOB } },
};

export function buildOpenApiDocument(apiHost: string): Record<string, unknown> {
  return {
    openapi: OPENAPI_VERSION,
    info: {
      title: 'Indicate API v1',
      version: DOCS_SPEC_VERSION,
      description: 'Supply API headless platform penerbitan Indicate: artikel kanonis, media, dan publikasi multi-portal. Basis path tunggal dengan aksi terdiskriminasi; guardrail yang sama dengan dashboard.',
    },
    servers: [{ url: `https://${apiHost}`, description: 'API produksi' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/api/v1/commands': {
        post: {
          summary: 'Eksekusi perintah API',
          description: 'Origin harus lolos secret Cloudflare; rate limit dua lapis (pra-auth per sumber, pasca-auth per key, Retry-After pada 429). Respons 2xx berbentuk { data, requestId }; gagal berbentuk envelope error.',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action', 'payload'],
                  properties: {
                    action: { type: 'string', enum: [...API_COMMANDS] },
                    payload: { description: 'Skema per aksi di bawah (oneOf).' },
                  },
                  discriminator: { propertyName: 'action' },
                },
                examples: Object.fromEntries(
                  API_COMMANDS.map((action) => [action, { summary: ACTION_SUMMARIES[action], value: { action, payload: OPENAPI_ACTION_EXAMPLES[action].payload } }]),
                ),
              },
            },
          },
          responses: {
            '200': { description: 'OK; { data, requestId }.' },
            '400': { description: 'INVALID_INPUT.', content: { 'application/json': { schema: errorEnvelopeSchema } } },
            '404': { description: 'Penolakan non-disclosing atau RESOURCE_UNAVAILABLE.', content: { 'application/json': { schema: errorEnvelopeSchema } } },
            '409': { description: 'CONFLICT / IDEMPOTENCY_CONFLICT / INVALID_STATE_TRANSITION.', content: { 'application/json': { schema: errorEnvelopeSchema } } },
            '429': { description: 'RATE_LIMITED; hormati header Retry-After.', content: { 'application/json': { schema: errorEnvelopeSchema } } },
            '503': { description: 'DEPENDENCY_UNAVAILABLE.', content: { 'application/json': { schema: errorEnvelopeSchema } } },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'http', scheme: 'bearer', description: 'API key Bearer dengan scope per aksi (lihat tabel scope). Tanpa/forgery key: 404 non-disclosing.' },
      },
      schemas: {
        ErrorEnvelope: errorEnvelopeSchema,
        ...Object.fromEntries(
          API_COMMANDS.map((action) => [
            `Payload_${action.replaceAll('.', '_')}`,
            { ...(payloadSchemas[action] as Record<string, unknown>), description: `${ACTION_SUMMARIES[action]} Scope: ${apiCommandScope(action)}.` },
          ]),
        ),
      },
    },
    tags: [{ name: 'commands', description: 'Sembilan aksi supply pipeline.' }],
  };
}

export function apiActionScopeTable(): ReadonlyArray<{ readonly action: ApiCommand; readonly scope: string; readonly summary: string }> {
  return API_COMMANDS.map((action) => ({ action, scope: apiCommandScope(action), summary: ACTION_SUMMARIES[action] }));
}

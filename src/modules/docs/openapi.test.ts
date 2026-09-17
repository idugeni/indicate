import { describe, expect, it } from 'vitest';

import { articleCreateSchema } from '@/modules/dashboard/schemas';
import { API_COMMANDS } from '@/modules/integrations/api-command-scopes';
import {
  mediaCompletionSchema,
  mediaReservationSchema,
  publicationBulkRequestSchema,
  publicationRequestSchema,
  publicationStatusSchema,
  publicationSuggestSchema,
  publicationTargetSelectionSchema,
} from '@/modules/publishing/schemas';
import { OPENAPI_ACTION_EXAMPLES, apiActionScopeTable, buildOpenApiDocument } from '@/modules/docs/openapi';

const SCHEMA_BY_ACTION = {
  'article.create': articleCreateSchema,
  'media.reserve': mediaReservationSchema,
  'media.complete': mediaCompletionSchema,
  'publication.request': publicationRequestSchema,
  'publication.requestBulk': publicationBulkRequestSchema,
  'publication.suggest': publicationSuggestSchema,
  'publication.retry': publicationTargetSelectionSchema,
  'publication.unpublish': publicationTargetSelectionSchema,
  'publication.status': publicationStatusSchema,
} as const;

describe('kontrak dokumentasi API', () => {
  it('setiap aksi commands punya contoh yang lolos skema Zod asli', () => {
    for (const action of API_COMMANDS) {
      const example = OPENAPI_ACTION_EXAMPLES[action];
      expect(example, `contoh hilang untuk ${action}`).toBeDefined();
      const parsed = SCHEMA_BY_ACTION[action].safeParse(example.payload);
      expect(parsed.success, `contoh ${action} ditolak skema`).toBe(true);
    }
  });

  it('spesifikasi mencakup semua aksi + auth + envelope error', () => {
    const document = buildOpenApiDocument('api.indicate.web.id') as {
      paths: Record<string, { post: { security: unknown[] } }>;
      components: { securitySchemes: Record<string, unknown>; schemas: Record<string, unknown> };
      servers: Array<{ url: string }>;
    };
    expect(document.servers[0]?.url).toBe('https://api.indicate.web.id');
    expect(document.paths['/api/v1/commands']?.post.security).toEqual([{ ApiKeyAuth: [] }]);
    expect(document.components.securitySchemes.ApiKeyAuth).toBeDefined();
    expect(document.components.schemas.ErrorEnvelope).toBeDefined();
    for (const { action } of apiActionScopeTable()) {
      expect(document.components.schemas[`Payload_${action.replaceAll('.', '_')}`], `skema hilang untuk ${action}`).toBeDefined();
    }
    expect(apiActionScopeTable()).toHaveLength(API_COMMANDS.length);
  });
});

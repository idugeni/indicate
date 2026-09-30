import { z } from 'zod';

const id = z.uuid();
const expectedVersion = z.number().int().positive();

export const accessKeyIssueSchema = z.object({
  name: z.string().trim().min(1).max(120),
  expiresAt: z.iso.datetime().nullable().default(null),
}).strict();

export const accessKeyRevokeSchema = z.object({ accessKeyId: id, expectedVersion }).strict();

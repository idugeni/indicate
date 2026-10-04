import { z } from 'zod';

import { AD_SLOT_IDS } from '@/modules/ads/slots';
import { TEMPLATE_IDS } from '@/modules/site/components/network/templates/listing-shared';

const uuid = z.uuid();
const slotId = z.enum(AD_SLOT_IDS);
const templateId = z.enum(TEMPLATE_IDS);
const device = z.enum(['desktop', 'tablet', 'mobile']);
const isoDateTime = z.iso.datetime({ offset: true }).nullable();
const version = z.number().int().min(1);

export const adsTenantSettingSchema = z.object({
  siteId: uuid,
  slotId,
  enabled: z.boolean(),
  creativeId: uuid.nullable(),
  expectedVersion: version.nullable(),
});

export const adsAdvertiserSchema = z.object({
  name: z.string().trim().min(3).max(120),
  contactEmail: z.email().max(320).nullable(),
});

const adsImageCreative = z.object({
  kind: z.literal('image'),
  imageUrl: z.string().trim().min(1).max(2000).refine(isTenantSafeUrl, { error: 'URL gambar harus https:// atau path /.' }),
  href: z.string().trim().max(2000).refine((value) => value === '' || isTenantSafeUrl(value), { error: 'Tautan klik harus https:// atau path /.' }).optional(),
  alt: z.string().trim().max(300).optional(),
  width: z.number().int().positive().max(30000).optional(),
  height: z.number().int().positive().max(30000).optional(),
});

function isTenantSafeUrl(value: string): boolean {
  return value.startsWith('https://') || (value.startsWith('/') && !value.startsWith('//'));
}

const adsHtmlCreative = z.object({
  kind: z.literal('html'),
  html: z.string().min(1).max(50000),
});

const adsProviderCreative = z.object({
  kind: z.literal('provider'),
  provider: z.literal('adsense'),
  clientId: z.string().trim().max(100).optional(),
  slotId: z.string().trim().max(100).optional(),
});

export const adsCreativeSchema = z.discriminatedUnion('kind', [adsImageCreative, adsHtmlCreative, adsProviderCreative]).and(z.object({
  campaignId: uuid.nullable(),
}));

export const adsCreativeStatusSchema = z.object({
  id: uuid,
  status: z.enum(['active', 'inactive', 'archived']),
  expectedVersion: version,
});

export const adsCampaignSchema = z.object({
  advertiserId: uuid,
  name: z.string().trim().min(3).max(160),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'ended']),
  priority: z.number().int().min(0).max(1000),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
}).refine(
  (value) => value.startsAt === null || value.endsAt === null || value.endsAt > value.startsAt,
  { error: 'Akhir periode harus setelah awal periode.', path: ['endsAt'] },
);

export const adsCampaignStatusSchema = z.object({
  id: uuid,
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'ended']),
  expectedVersion: version,
});

export const adsPlacementSchema = z.object({
  campaignId: uuid,
  creativeId: uuid,
  slotId,
  siteId: uuid.nullable(),
  templateId: templateId.nullable(),
  device: device.nullable(),
  priority: z.number().int().min(0).max(1000),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
}).refine(
  (value) => value.startsAt === null || value.endsAt === null || value.endsAt > value.startsAt,
  { error: 'Akhir periode harus setelah awal periode.', path: ['endsAt'] },
);

export const adsPlacementUpdateSchema = z.object({
  id: uuid,
  active: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  startsAt: isoDateTime.optional(),
  endsAt: isoDateTime.optional(),
  expectedVersion: version,
}).refine(
  (value) => value.startsAt === undefined || value.startsAt === null || value.endsAt === undefined || value.endsAt === null || value.endsAt > value.startsAt,
  { error: 'Akhir periode harus setelah awal periode.', path: ['endsAt'] },
);

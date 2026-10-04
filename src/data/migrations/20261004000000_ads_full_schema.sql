-- Full advertising schema: catalog, ownership, scheduling, tenant switches, events.
--
-- advertisers own campaigns; campaigns group creatives; ad_placements bind one
-- creative to one semantic slot with an optional site/template/device scope and
-- a validity window. tenant_ad_settings carries the per-site slot switch and an
-- optional custom creative, outranking the transitional `site_settings.seo.ads`
-- carrier per slot. ad_impressions and ad_clicks are append-only event rows
-- keyed by day so a future rollup can aggregate without scanning `created_at`.
--
-- ad_slots is a global catalog like `template_presets`: slot meaning is
-- network-wide, so it carries no organization column and its RLS policy is a
-- plain runtime accessor. Every other table is tenant-scoped with the standard
-- organization guard forced on the runtime role. Event rows point at placements
-- and creatives with SET NULL so deleting a campaign never orphans analytics.
--
-- The seed mirrors `src/modules/ads/slots.ts`; ON CONFLICT keeps a retried
-- apply idempotent without touching edited rows.
--
-- Ledger version 245 follows the live `max(version)`, which is 244.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE TYPE "public"."ad_creative_kind" AS ENUM('image', 'html', 'provider');--> statement-breakpoint
CREATE TYPE "public"."ad_campaign_status" AS ENUM('draft', 'scheduled', 'active', 'paused', 'ended');--> statement-breakpoint
CREATE TABLE "public"."advertisers" (
  "organization_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "contact_email" text,
  "status" "public"."record_status" DEFAULT 'active' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "advertisers_pk" PRIMARY KEY("organization_id","id")
);--> statement-breakpoint
CREATE UNIQUE INDEX "advertisers_id_unique" ON "public"."advertisers" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "advertisers_organization_name_unique" ON "public"."advertisers" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "advertisers_organization_status_idx" ON "public"."advertisers" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "public"."advertisers" ADD CONSTRAINT "advertisers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."advertisers" ADD CONSTRAINT "advertisers_version_positive" CHECK ("advertisers"."version" > 0);--> statement-breakpoint
CREATE TABLE "public"."campaigns" (
  "organization_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "advertiser_id" uuid NOT NULL,
  "name" text NOT NULL,
  "status" "public"."ad_campaign_status" DEFAULT 'draft' NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "campaigns_pk" PRIMARY KEY("organization_id","id")
);--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_id_unique" ON "public"."campaigns" USING btree ("id");--> statement-breakpoint
CREATE INDEX "campaigns_organization_status_idx" ON "public"."campaigns" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "campaigns_organization_advertiser_idx" ON "public"."campaigns" USING btree ("organization_id","advertiser_id");--> statement-breakpoint
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_advertiser_fk" FOREIGN KEY ("organization_id","advertiser_id") REFERENCES "public"."advertisers"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_priority_nonnegative" CHECK ("campaigns"."priority" >= 0 AND "campaigns"."version" > 0);--> statement-breakpoint
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_window_sane" CHECK ("campaigns"."starts_at" IS NULL OR "campaigns"."ends_at" IS NULL OR "campaigns"."ends_at" > "campaigns"."starts_at");--> statement-breakpoint
CREATE TABLE "public"."ad_creatives" (
  "organization_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "campaign_id" uuid,
  "kind" "public"."ad_creative_kind" NOT NULL,
  "image_url" text,
  "href" text,
  "alt_text" text,
  "width_px" integer,
  "height_px" integer,
  "html" text,
  "provider" text,
  "provider_client_id" text,
  "provider_slot_id" text,
  "status" "public"."record_status" DEFAULT 'active' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ad_creatives_pk" PRIMARY KEY("organization_id","id")
);--> statement-breakpoint
CREATE UNIQUE INDEX "ad_creatives_id_unique" ON "public"."ad_creatives" USING btree ("id");--> statement-breakpoint
CREATE INDEX "ad_creatives_organization_campaign_idx" ON "public"."ad_creatives" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE INDEX "ad_creatives_organization_status_idx" ON "public"."ad_creatives" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" ADD CONSTRAINT "ad_creatives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" ADD CONSTRAINT "ad_creatives_campaign_fk" FOREIGN KEY ("organization_id","campaign_id") REFERENCES "public"."campaigns"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" ADD CONSTRAINT "ad_creatives_image_shape" CHECK ("ad_creatives"."kind" <> 'image' OR "ad_creatives"."image_url" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" ADD CONSTRAINT "ad_creatives_html_shape" CHECK ("ad_creatives"."kind" <> 'html' OR "ad_creatives"."html" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" ADD CONSTRAINT "ad_creatives_provider_shape" CHECK ("ad_creatives"."kind" <> 'provider' OR "ad_creatives"."provider" = 'adsense');--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" ADD CONSTRAINT "ad_creatives_dimensions_positive" CHECK (("ad_creatives"."width_px" IS NULL AND "ad_creatives"."height_px" IS NULL) OR ("ad_creatives"."width_px" IS NOT NULL AND "ad_creatives"."height_px" IS NOT NULL AND "ad_creatives"."width_px" > 0 AND "ad_creatives"."height_px" > 0));--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" ADD CONSTRAINT "ad_creatives_version_positive" CHECK ("ad_creatives"."version" > 0);--> statement-breakpoint
CREATE TABLE "public"."ad_slots" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "max_width_px" integer NOT NULL,
  "allowed_formats" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "devices" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ad_slots_max_width_positive" CHECK ("ad_slots"."max_width_px" > 0)
);--> statement-breakpoint
CREATE TABLE "public"."ad_placements" (
  "organization_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "campaign_id" uuid NOT NULL,
  "creative_id" uuid NOT NULL,
  "slot_id" text NOT NULL,
  "site_id" uuid,
  "template_id" text,
  "device" text,
  "priority" integer DEFAULT 0 NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "active" boolean DEFAULT true NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ad_placements_pk" PRIMARY KEY("organization_id","id")
);--> statement-breakpoint
CREATE UNIQUE INDEX "ad_placements_id_unique" ON "public"."ad_placements" USING btree ("id");--> statement-breakpoint
CREATE INDEX "ad_placements_organization_site_slot_idx" ON "public"."ad_placements" USING btree ("organization_id","site_id","slot_id","active");--> statement-breakpoint
CREATE INDEX "ad_placements_organization_campaign_idx" ON "public"."ad_placements" USING btree ("organization_id","campaign_id");--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ADD CONSTRAINT "ad_placements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ADD CONSTRAINT "ad_placements_campaign_fk" FOREIGN KEY ("organization_id","campaign_id") REFERENCES "public"."campaigns"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ADD CONSTRAINT "ad_placements_creative_fk" FOREIGN KEY ("organization_id","creative_id") REFERENCES "public"."ad_creatives"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ADD CONSTRAINT "ad_placements_slot_id_ad_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."ad_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ADD CONSTRAINT "ad_placements_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ADD CONSTRAINT "ad_placements_device_values" CHECK ("ad_placements"."device" IS NULL OR "ad_placements"."device" IN ('desktop', 'tablet', 'mobile'));--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ADD CONSTRAINT "ad_placements_priority_nonnegative" CHECK ("ad_placements"."priority" >= 0 AND "ad_placements"."version" > 0);--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ADD CONSTRAINT "ad_placements_window_sane" CHECK ("ad_placements"."starts_at" IS NULL OR "ad_placements"."ends_at" IS NULL OR "ad_placements"."ends_at" > "ad_placements"."starts_at");--> statement-breakpoint
CREATE TABLE "public"."tenant_ad_settings" (
  "organization_id" uuid NOT NULL,
  "site_id" uuid NOT NULL,
  "slot_id" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "creative_id" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_ad_settings_pk" PRIMARY KEY("organization_id","site_id","slot_id")
);--> statement-breakpoint
CREATE INDEX "tenant_ad_settings_organization_site_idx" ON "public"."tenant_ad_settings" USING btree ("organization_id","site_id");--> statement-breakpoint
ALTER TABLE "public"."tenant_ad_settings" ADD CONSTRAINT "tenant_ad_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."tenant_ad_settings" ADD CONSTRAINT "tenant_ad_settings_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."tenant_ad_settings" ADD CONSTRAINT "tenant_ad_settings_slot_id_ad_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."ad_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."tenant_ad_settings" ADD CONSTRAINT "tenant_ad_settings_creative_fk" FOREIGN KEY ("organization_id","creative_id") REFERENCES "public"."ad_creatives"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."tenant_ad_settings" ADD CONSTRAINT "tenant_ad_settings_version_positive" CHECK ("tenant_ad_settings"."version" > 0);--> statement-breakpoint
CREATE TABLE "public"."ad_impressions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "site_id" uuid NOT NULL,
  "slot_id" text NOT NULL,
  "placement_id" uuid,
  "creative_id" uuid,
  "device" text NOT NULL,
  "day" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "ad_impressions_device_values" CHECK ("ad_impressions"."device" IN ('desktop', 'tablet', 'mobile', 'unknown'))
);--> statement-breakpoint
CREATE INDEX "ad_impressions_organization_site_day_idx" ON "public"."ad_impressions" USING btree ("organization_id","site_id","day");--> statement-breakpoint
CREATE INDEX "ad_impressions_organization_slot_day_idx" ON "public"."ad_impressions" USING btree ("organization_id","slot_id","day");--> statement-breakpoint
ALTER TABLE "public"."ad_impressions" ADD CONSTRAINT "ad_impressions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_impressions" ADD CONSTRAINT "ad_impressions_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_impressions" ADD CONSTRAINT "ad_impressions_placement_fk" FOREIGN KEY ("organization_id","placement_id") REFERENCES "public"."ad_placements"("organization_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_impressions" ADD CONSTRAINT "ad_impressions_creative_fk" FOREIGN KEY ("organization_id","creative_id") REFERENCES "public"."ad_creatives"("organization_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "public"."ad_clicks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "site_id" uuid NOT NULL,
  "slot_id" text NOT NULL,
  "placement_id" uuid,
  "creative_id" uuid,
  "device" text NOT NULL,
  "day" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "target_url" text NOT NULL,
  CONSTRAINT "ad_clicks_device_values" CHECK ("ad_clicks"."device" IN ('desktop', 'tablet', 'mobile', 'unknown'))
);--> statement-breakpoint
CREATE INDEX "ad_clicks_organization_site_day_idx" ON "public"."ad_clicks" USING btree ("organization_id","site_id","day");--> statement-breakpoint
CREATE INDEX "ad_clicks_organization_slot_day_idx" ON "public"."ad_clicks" USING btree ("organization_id","slot_id","day");--> statement-breakpoint
ALTER TABLE "public"."ad_clicks" ADD CONSTRAINT "ad_clicks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_clicks" ADD CONSTRAINT "ad_clicks_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_clicks" ADD CONSTRAINT "ad_clicks_placement_fk" FOREIGN KEY ("organization_id","placement_id") REFERENCES "public"."ad_placements"("organization_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ad_clicks" ADD CONSTRAINT "ad_clicks_creative_fk" FOREIGN KEY ("organization_id","creative_id") REFERENCES "public"."ad_creatives"("organization_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."advertisers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."advertisers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "public"."advertisers";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "public"."advertisers" TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."campaigns" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "public"."campaigns";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "public"."campaigns" TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."ad_creatives" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "public"."ad_creatives";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "public"."ad_creatives" TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
ALTER TABLE "public"."ad_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS runtime_accessor ON "public"."ad_slots";--> statement-breakpoint
CREATE POLICY runtime_accessor ON "public"."ad_slots" FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "public"."ad_placements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."ad_placements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "public"."ad_placements";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "public"."ad_placements" TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
ALTER TABLE "public"."tenant_ad_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."tenant_ad_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "public"."tenant_ad_settings";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "public"."tenant_ad_settings" TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
ALTER TABLE "public"."ad_impressions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."ad_impressions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "public"."ad_impressions";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "public"."ad_impressions" TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
ALTER TABLE "public"."ad_clicks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."ad_clicks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "public"."ad_clicks";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "public"."ad_clicks" TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."advertisers" TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."campaigns" TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."ad_creatives" TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."ad_slots" TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."ad_placements" TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."tenant_ad_settings" TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."ad_impressions" TO indicate_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."ad_clicks" TO indicate_runtime;--> statement-breakpoint
INSERT INTO "public"."ad_slots" ("id", "name", "description", "max_width_px", "allowed_formats", "devices") VALUES
  ('header-top', 'Header top', 'Above the sticky site header; scrolls away and never overlaps navigation.', 970, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('leaderboard', 'Leaderboard', 'Full-width banner directly below the header, inside the page container.', 970, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('top-banner', 'Top banner', 'Billboard-grade banner below the header for templates with a bold hero.', 970, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('below-navigation', 'Below navigation', 'Slim strip under the nav for templates that keep the header compact.', 970, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('hero-ad', 'Hero ad', 'Between the hero block and the next content section on listing pages.', 970, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('in-feed', 'In feed', 'Inline card between listing or channel sections; flows with the feed.', 728, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('in-content', 'In content', 'Centered rectangle after the featured image, before the article body.', 336, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('content-middle', 'Content middle', 'Mid-page break after the body and gallery on articles, or between channel sections.', 728, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('content-bottom', 'Content bottom', 'After tags on articles, before the publisher footer.', 728, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile']),
  ('sidebar-top', 'Sidebar top', 'Top of a desktop rail column; hidden below lg where rails collapse.', 336, ARRAY['image', 'html', 'provider'], ARRAY['desktop']),
  ('sidebar-middle', 'Sidebar middle', 'Mid-rail rectangle; reserved for templates that grow a rail column.', 336, ARRAY['image', 'html', 'provider'], ARRAY['desktop']),
  ('sidebar-bottom', 'Sidebar bottom', 'Tall half-page unit at the rail end; reserved for rail templates.', 300, ARRAY['image', 'html', 'provider'], ARRAY['desktop']),
  ('mobile-banner', 'Mobile banner', 'Phone-only strip; never renders desktop widths.', 320, ARRAY['image', 'html', 'provider'], ARRAY['mobile']),
  ('footer-banner', 'Footer banner', 'Full-width banner above the site footer, inside the page container.', 970, ARRAY['image', 'html', 'provider'], ARRAY['desktop', 'tablet', 'mobile'])
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (245, 'ads_full_schema', 'sha256:98f5ca3b25f459229fd30e7a3263645950ca985de45e9ca817b6fbf028f8d569');

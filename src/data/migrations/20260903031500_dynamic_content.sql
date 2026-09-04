-- Dynamic content catalog: marketing tiers, testimonials, FAQs, media
-- showcase, contact channels, theme presets, and the permission catalog.
--
-- Everything this file adds is empty-table-safe reference content managed by
-- platform admins instead of code deploys. RLS exposes read access to the
-- runtime role; writes require the platform.content.manage grant, mirroring
-- the customer-admin surface. The organization permission seeder now reads
-- permission_definitions instead of a hardcoded list, and a verified-user
-- email lookup supports first-admin assignment for brand-new organizations.

CREATE TABLE "service_tiers" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"target" text NOT NULL,
	"summary" text NOT NULL,
	"price" text NOT NULL,
	"period" text NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highlighted" boolean DEFAULT false NOT NULL,
	"cta" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote" text NOT NULL,
	"author" text NOT NULL,
	"role" text NOT NULL,
	"media" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "media_showcase" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "contact_channels" (
	"key" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "permission_definitions" (
	"scope" "permission_scope" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "permission_definitions_pk" PRIMARY KEY("scope","name")
);--> statement-breakpoint
CREATE TABLE "color_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"primary" text NOT NULL,
	"accent" text NOT NULL,
	"header_bg" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "template_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
INSERT INTO public.service_tiers (slug, name, target, summary, price, period, features, highlighted, cta, sort_order) VALUES
  ('starter', 'Network Starter', 'Untuk 5–10 portal dalam satu grup media', 'Untuk satu grup media yang baru mulai.', 'Rp 1.500.000', '/bulan', '["Hingga 10 Domain & Subdomain Situs", "1 Master Database PostgreSQL Supabase", "Integrasi Telegram Bot Redaksi", "Cloudflare CDN & R2 Media Storage", "Koleksi Master Template Layout", "Dasbor redaksi penuh", "Dukungan lewat surel"]', false, 'Pilih Paket Starter', 1),
  ('growth', 'Network Growth', 'Untuk 25–50 portal lintas unit usaha', 'Untuk jaringan portal daerah yang sedang tumbuh.', 'Rp 3.800.000', '/bulan', '["Hingga 50 Domain & Subdomain Situs", "Multi-Site Syndication Pipeline Graph", "Upstash Redis Queue & Leases", "REST API dan bot Telegram", "Klaster Warna Branding Semantik", "Dukungan Custom Domain Nameserver", "Prioritas Cloudflare Cache Purge API"]', true, 'Mulai Pengujian Gratis', 2),
  ('enterprise', 'Enterprise Scale', 'Untuk 100+ portal multi-organisasi', 'Untuk penerbit dengan kebutuhan tata kelola khusus.', 'Kustom', '', '["Kapasitas 100+ Domain & Subdomain Unlimited", "Isolasi Data PostgreSQL RLS Khusus", "SLA Uptime 99.99% Tergaransi", "Dukungan Migrasi Data Berita Massal", "Custom Webhook & API Key Unlimited", "Peran dan izin terperinci", "Pendampingan migrasi"]', false, 'Hubungi Tim Arsitek', 3);--> statement-breakpoint
INSERT INTO public.testimonials (id, quote, author, role, media, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007001', 'Dengan Indicate, tim redaksi kami menerbitkan satu artikel utama ke belasan portal dalam jaringan secara bersamaan, tanpa perlu masuk ke setiap dasbor satu per satu.', 'Bambang Suryono', 'Pemimpin Redaksi Grup Media', 'Media Nusantara Group', 1),
  ('00000000-0000-4000-8000-000000007002', 'Kecepatan pembersihan cache Cloudflare dan antrean Upstash Redis-nya sangat cepat. Artikel yang baru dirilis via Telegram Bot langsung tayang di portal publik dalam <1 detik.', 'Dian Sastrowardoyo', 'Head of Digital Infrastructure', 'Pers Daerah Bersatu', 2);--> statement-breakpoint
INSERT INTO public.faqs (id, question, answer, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007011', 'Apakah saya membutuhkan server terpisah untuk setiap domain berita?', 'Tidak. Seluruh domain berita (apex maupun subdomain) berjalan di atas 1 infrastruktur terpusat yang sama. Pemisahan data dan tema dilakukan secara otomatis berdasarkan nama host (exact-host isolation).', 1),
  ('00000000-0000-4000-8000-000000007012', 'Bagaimana cara wartawan menerbitkan berita dari luar kantor?', 'Redaksi dapat menerbitkan berita langsung via Dashboard Web, API integration, atau menggunakan Telegram Bot terverifikasi tanpa harus membuka laptop.', 2),
  ('00000000-0000-4000-8000-000000007013', 'Apakah satu artikel bisa tayang di lebih dari satu situs berita sekaligus?', 'Ya. Fitur multi-site syndication memungkinkan 1 artikel utama (canonical article) dipublikasikan ke multiple situs berita milik organisasi Anda tanpa menduplikasi data.', 3),
  ('00000000-0000-4000-8000-000000007014', 'Bagaimana dengan keamanan data dan performa saat lalu lintas tinggi?', 'Sistem menggunakan Cloudflare Enterprise-grade DNS & CDN, R2 Object Storage untuk media, Upstash Redis untuk antrean, dan PostgreSQL dengan Row Level Security (RLS) terisolasi per-organisasi.', 4);--> statement-breakpoint
INSERT INTO public.media_showcase (id, name, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007021', 'Nusantara Post', 1),
  ('00000000-0000-4000-8000-000000007022', 'Meridian News', 2),
  ('00000000-0000-4000-8000-000000007023', 'Cakrawala Times', 3),
  ('00000000-0000-4000-8000-000000007024', 'Lentera Daily', 4),
  ('00000000-0000-4000-8000-000000007025', 'Samudra Press', 5),
  ('00000000-0000-4000-8000-000000007026', 'Warta Persada', 6),
  ('00000000-0000-4000-8000-000000007027', 'Arcadia News', 7),
  ('00000000-0000-4000-8000-000000007028', 'Kencana Post', 8);--> statement-breakpoint
INSERT INTO public.contact_channels (key, title, description, sort_order) VALUES
  ('email', 'Surel', 'Kirim kebutuhan Anda beserta jumlah domain dan wilayah yang direncanakan.', 1),
  ('telegram', 'Telegram', 'Tanya jawab singkat mengenai alur redaksi dan integrasi bot.', 2),
  ('visit', 'Peninjauan bersama', 'Sesi daring untuk menelusuri dasbor dan alur penerbitan.', 3);--> statement-breakpoint
INSERT INTO public.permission_definitions (scope, name, description, sort_order) VALUES
  ('organization', 'api_key.read', 'Read API key metadata', 1),
  ('organization', 'api_key.manage', 'Issue, rotate, and revoke API keys', 2),
  ('organization', 'telegram.manage', 'Manage Telegram identity mappings', 3),
  ('organization', 'subscription.read', 'Read Organization subscription', 4),
  ('organization', 'subscription.manage', 'Manage Organization subscription', 5);--> statement-breakpoint
INSERT INTO public.color_presets (id, name, description, "primary", accent, header_bg) VALUES
  ('emerald-forest', 'Emerald Forest', 'Warna hijau zamrud & emas kuningan. Cocok untuk portal daerah pertanian & pertumbuhan ekonomi.', '#0b5d4b', '#e9a23b', '#0e1320'),
  ('royal-sapphire', 'Royal Sapphire', 'Warna biru safir & biru terang. Cocok untuk media metropolitan, bisnis, & kebijakan publik.', '#1e3a8a', '#3b82f6', '#0f172a'),
  ('crimson-torch', 'Crimson Torch', 'Warna merah marun & oranye hangat. Cocok untuk headline breaking news & olahraga.', '#991b1b', '#f97316', '#18181b'),
  ('oceanic-cyan', 'Oceanic Cyan', 'Warna teal samudra & sian menyala. Cocok untuk media wilayah pesisir & pariwisata.', '#0f766e', '#06b6d4', '#091e25'),
  ('obsidian-gold', 'Obsidian Gold', 'Warna hitam obsidian & emas klasik. Cocok untuk jurnalistik investigasi & opini publik.', '#18181b', '#cc9a44', '#0e1320'),
  ('deep-violet', 'Deep Violet', 'Warna ungu pekat & lavender. Cocok untuk media kebudayaan, keenam seni, & gaya hidup.', '#581c87', '#c084fc', '#1a102f'),
  ('sunset-amber', 'Sunset Amber', 'Warna cokelat tembaga & amber terbenam. Cocok untuk berita daerah pegunungan & UMKM.', '#7c2d12', '#fb923c', '#1c1917'),
  ('slate-monochrome', 'Slate Monochrome', 'Warna abu-abu baja & perak murni. Cocok untuk pers resmi humas & pemerintah daerah.', '#334155', '#94a3b8', '#0f172a'),
  ('terracotta-earth', 'Terracotta Earth', 'Warna terakota tanah & jingga hangat. Cocok untuk media komunitas daerah & kearifan lokal.', '#9a3412', '#fdba74', '#1c1917'),
  ('pine-forest', 'Pine Forest', 'Warna hijau pinus & mint segar. Cocok untuk media lingkungan hidup & komunitas lokal.', '#14532d', '#4ade80', '#062012');--> statement-breakpoint
INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('portal-news', 'Portal News Standard', 'Layout surat kabar digital 2-kolom klasik dengan breaking news ticker & widget terpopuler.', 'news'),
  ('editorial-magazine', 'Editorial Magazine', 'Layout majalah berwibawa dengan tipografi judul besar & kolom opini redaksi.', 'editorial'),
  ('modern-tech', 'Modern Tech Grid', 'Layout majalah teknologi dengan grid asimetris, badge menyala, & header melayang.', 'tech'),
  ('minimal-press', 'Minimal Official Press', 'Layout bersih & resmi untuk pengumuman instansi pemerintah & siaran pers humas.', 'official'),
  ('multimedia-visual', 'Multimedia Visual', 'Layout berfokus pada galeri foto resolusi tinggi & berita video dokumenter.', 'visual'),
  ('tabloid-express', 'Tabloid Express', 'Layout berita kilat dengan banner headline besar & kartu berita cepat.', 'news'),
  ('columnist-opinion', 'Columnist & Opinion', 'Layout esai & opini wartawan dengan fokus keterbacaan artikel panjang.', 'editorial'),
  ('geo-radar', 'Geo Radar', 'Layout berita berbasis peta & navigasi kewilayahan.', 'news'),
  ('compact-stream', 'Compact Live Stream', 'Layout timeline berita cepat real-time dengan update detik per detik.', 'live'),
  ('broadsheet-classic', 'Broadsheet Classic', 'Layout koran cetak korporat dengan pembatas garis vertikal lurus.', 'news');--> statement-breakpoint
INSERT INTO public.permissions (id, organization_id, name, scope, description)
VALUES (gen_random_uuid(), NULL, 'platform.content.manage', 'platform', 'Manage dynamic marketing content and theme presets')
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE public.service_tiers ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.service_tiers FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.testimonials FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.faqs FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.media_showcase ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.media_showcase FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.contact_channels ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.contact_channels FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.permission_definitions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.permission_definitions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.color_presets ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.color_presets FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.template_presets ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.template_presets FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY content_runtime_read ON public.service_tiers FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY content_write_platform ON public.service_tiers FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_tiers TO indicate_runtime;--> statement-breakpoint
CREATE POLICY content_runtime_read ON public.testimonials FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY content_write_platform ON public.testimonials FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO indicate_runtime;--> statement-breakpoint
CREATE POLICY content_runtime_read ON public.faqs FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY content_write_platform ON public.faqs FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO indicate_runtime;--> statement-breakpoint
CREATE POLICY content_runtime_read ON public.media_showcase FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY content_write_platform ON public.media_showcase FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_showcase TO indicate_runtime;--> statement-breakpoint
CREATE POLICY content_runtime_read ON public.contact_channels FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY content_write_platform ON public.contact_channels FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_channels TO indicate_runtime;--> statement-breakpoint
CREATE POLICY content_runtime_read ON public.permission_definitions FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY content_write_platform ON public.permission_definitions FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_definitions TO indicate_runtime;--> statement-breakpoint
CREATE POLICY content_runtime_read ON public.color_presets FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY content_write_platform ON public.color_presets FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_presets TO indicate_runtime;--> statement-breakpoint
CREATE POLICY content_runtime_read ON public.template_presets FOR SELECT TO indicate_runtime USING (true);--> statement-breakpoint
CREATE POLICY content_write_platform ON public.template_presets FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_presets TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.org_ensure_permissions(p_organization_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  INSERT INTO public.permissions(id, organization_id, name, scope, description)
  SELECT gen_random_uuid(), p_organization_id, def.name, def.scope, def.description
  FROM public.permission_definitions AS def
  WHERE def.scope = 'organization'
  ON CONFLICT DO NOTHING
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.org_ensure_permissions(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.org_ensure_permissions(uuid) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.resolve_user_by_email(p_email text)
 RETURNS TABLE(id uuid, auth_user_id uuid, display_name text, status record_status)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT u.id, u.auth_user_id, u.display_name, u.status
  FROM public.users AS u
  WHERE u.email = p_email
    AND indicate_private.permission_has_platform(indicate_private.current_verified_user_id(), 'platform.customer.admin')
  LIMIT 1
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.resolve_user_by_email(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.resolve_user_by_email(text) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.actor_has_tenant_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT COALESCE(
    NOT EXISTS (
      SELECT 1 FROM public.memberships AS m
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
    )
    OR (SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.customer.admin'))
    OR (SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), p_permission))
    OR EXISTS (
      SELECT 1
      FROM public.memberships AS m
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE m.organization_id = (SELECT indicate_private.current_organization_id())
        AND m.user_id = (SELECT indicate_private.current_verified_user_id())
        AND m.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    )
    OR EXISTS (
      SELECT 1 FROM public.api_keys AS k
      WHERE k.organization_id = (SELECT indicate_private.current_organization_id())
        AND k.id::text = current_setting('app.actor_id', true)
        AND k.status = 'active'
        AND (k.expires_at IS NULL OR k.expires_at > now())
        AND k.scopes @> ARRAY[p_permission]
    )
    OR EXISTS (
      SELECT 1
      FROM public.telegram_identity_mappings AS tim
      JOIN public.memberships AS m ON m.organization_id = tim.organization_id AND m.user_id = tim.user_id AND m.role_id = tim.role_id AND m.status = 'active'
      JOIN public.roles AS r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
      JOIN public.role_permissions AS rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE tim.organization_id = (SELECT indicate_private.current_organization_id())
        AND tim.id::text = current_setting('app.actor_id', true)
        AND tim.status = 'active'
        AND p.organization_id = (SELECT indicate_private.current_organization_id())
        AND p.scope = 'organization' AND p.name = p_permission
    ),
    false)
$function$;--> statement-breakpoint

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (41, 'dynamic_content', 'dynamic-content-v1');

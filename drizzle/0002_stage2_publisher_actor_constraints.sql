ALTER TABLE "publishers" ADD CONSTRAINT "publishers_submitter_membership_fk" FOREIGN KEY ("organization_id","submitted_by") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_verifier_membership_fk" FOREIGN KEY ("organization_id","verified_by") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (3, 'stage2_publisher_actor_constraints', 'drizzle-0002')
ON CONFLICT (version) DO NOTHING;
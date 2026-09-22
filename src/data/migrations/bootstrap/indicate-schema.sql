-- Indicate database bootstrap
--
-- GENERATED FILE. Do not edit by hand; run `npm run db:bootstrap` instead.
--
-- Applies the complete reviewed forward migration sequence to one empty
-- PostgreSQL 17 database and records the Drizzle ledger, so a later
-- `npm run db:migrate` against the same database is a no-op. Run this with a
-- migration-owner credential, never an application runtime credential.
--
-- The digests below are the Drizzle ledger digests: SHA-256 over each raw
-- migration file. They are deliberately distinct from the reviewed checksums
-- in src/features/release/migration-manifest.ts, which canonicalize each body
-- before hashing. Both are verified against these files by the test suite.
--
-- Reviewed sources, in journal order (153 migrations):
--   01  20260903000000_core_schema  ledger sha256:f7163225de73270a59d8675e2d44f0ea9706a96a01bde339f36b487e65218dc0
--   02  20260903000500_security  ledger sha256:99d793ebab12f68ad323375409cef6cf7ef60460e36ff13d490173c18698b244
--   03  20260903001000_publisher_actor_constraints  ledger sha256:3aa4a6b1ff287d891612bab6f7334887e3def437124c198b7766220177b806e2
--   04  20260903001500_authorization_hardening  ledger sha256:873465b97cc0d7578ffb238880c52bca4c7ee38db108b9cbe4e295490b7b2c5f
--   05  20260903002000_verified_user_context  ledger sha256:1e6283c7f210cda854399aa89f2be245f4c300c406825e1e22023af1c505cd5c
--   06  20260903002500_discovery_outcome_timestamp  ledger sha256:9180df7f535a9478eb51a3c876e76e1994289862a07c24dd245754be75def14c
--   07  20260903003000_media_publication_runtime  ledger sha256:5a2a9d1eaf668693fff3ad36574cc57f59887a2c625ec5d634f52df74e5e0d58
--   08  20260903003500_public_delivery  ledger sha256:3837f494d00c231fa3e3346a0c73cc1a7aad7a25e68fe1635f79c4b3305475a2
--   09  20260903004000_production_boundaries  ledger sha256:c3b768c21be4fc85681741599684e912ed94785a92760b4ef3bc77cd68d38151
--   10  20260903004500_external_entrypoints  ledger sha256:a1d6d4028023fb4dabd9d3af61e7cd170276a2b4e40d2a93fa1224dfc0401f8b
--   11  20260903005000_security_hardening  ledger sha256:987a2378aab0e316808333f442443a5f94b1ee593932f46fd1fd0b0932cc8ae4
--   12  20260903005500_strict_platform_authorization  ledger sha256:4b4d4b75f140c83779d6b05875f63c961f87d35da06910f1eb27e18e57c4ea82
--   13  20260903010000_readiness_discovery  ledger sha256:298c1fcb059c7e0919caf08343ebfadc2a89bd836f2d29e9e878fc215c48f483
--   14  20260903010500_migration_body_digests  ledger sha256:968a24224fb29a036a3fe56866ab11d6204c732243864353af18ecfa34500dcc
--   15  20260903011000_updated_at_integrity_guard  ledger sha256:2955fb76c0c3ab351091158cb64cdeb0a9717bee242d95d64164eab87071579e
--   16  20260903011500_operational_table_read_policies  ledger sha256:849fd713446fbd8b7857206bd00081c039e0a54fe1ab3e960d0574fa2b17323d
--   17  20260903012000_data_api_and_index_hardening  ledger sha256:109af0132f9eb215333e457b892403bdb87e0027ea88b276832ddef4907b1e53
--   18  20260903012500_coordination_timestamps_and_search_indexes  ledger sha256:24482cc2902d1b109558d4ffdad6e44037efb7beca5d71f17bd6fad8d42d9bcb
--   19  20260903013000_runtime_config_core  ledger sha256:f206704cc04ffdbb4d4aa7815e66340b07ff6444d9309ec6a325102a0d80a34b
--   20  20260903013500_runtime_config_audit_invalidation  ledger sha256:fabb8acb0d1b6c2ce6f3ab3dcf0cafca0390bec91a378f7a83fceecaa6b5889f
--   21  20260903014000_runtime_config_rollout  ledger sha256:6fa4c0f9303df49afcb3b7ee72fb30d2409ca8c4a5312b6828254c82db4a76fe
--   22  20260903014500_runtime_config_site_settings_zone_rls  ledger sha256:9bca35529083f22ae188b8ba8d98be4b8cbb8ca58bf53b9c396415e125d4a1e3
--   23  20260903015000_runtime_config_functions  ledger sha256:2671a870865b139376dccdd8ab8f9e2a56310c70caa554b36c1e94d79bbeb991
--   24  20260903015500_runtime_config_constraints_triggers  ledger sha256:61602bbd86ddef9b644bc768bfa0d098303afe161755eff354201df63bd11122
--   25  20260903020000_runtime_config_mutations  ledger sha256:777f279fa3779a3b5f72d3499f4b03933d9a117b1324d17cc1b0f446e468456b
--   26  20260903020300_de_object_rename_timestamp  ledger sha256:a9ead169f3359671ae906d7de87369f28bd555e3e0e9913af572ff85532d8d19
--   27  20260903020500_dashboard_entry_point  ledger sha256:6e6151a1cbac886c653de30e7d1ac2a19e0e8f8cf93221f5f4603f50dfeaf869
--   28  20260903021000_role_tier  ledger sha256:ecac5e6c81ad46d79c87986784f9b04cc94e2486f7c3000ae14e9fc2beae5410
--   29  20260903021500_delivery_activation_enums  ledger sha256:37844033396cfaa0104197d31052703c3d3f6e307703c50bbaf55e0f4dd50783
--   30  20260903022000_schema_reconciliation  ledger sha256:e14501607ab9aab829aedf14cd3aae1061be2254e83b927a97b024ea658e261b
--   31  20260903022500_stale_object_cleanup  ledger sha256:0569003d119c76c9fc283b5b825d139a53c365da0a4d2122b81ad74c0267fb81
--   32  20260903023000_policy_singleton_key  ledger sha256:ed06cfaedf668c6c93c66c57190a0fe8533c9e5b6a544ef18b87789d4f46c174
--   33  20260903023500_function_api_reconciliation  ledger sha256:116bb8a6e08edb8a15b2b134bb4208ee9ce2b562efddfec88a4fed9643615c56
--   34  20260903024000_residual_constraint_cleanup  ledger sha256:726130658b3725bb2c2af1f15e070fe91e0fbff3023b666f19926a4ce4ac743e
--   35  20260903024500_column_default_alignment  ledger sha256:99026932cf79fb5e161b22b314f3b36328747f9ffb0e83487b46a07836305739
--   36  20260903025000_rls_operation_split  ledger sha256:db6492db464a4d64b19b52716863a86b420b32561eb80517afa6fbb37b970838
--   37  20260903025500_rls_write_hardening  ledger sha256:93aeb0997e4f98316b7e0e2e5f229562da32e25b34a2bfdeed1e0b858f3701d0
--   38  20260903030000_user_profile  ledger sha256:b0a2f2516827b4a87d07a8864d51f30a9556802a6c73062e10e39ea253163018
--   39  20260903030500_delivery_helpers  ledger sha256:0e075f7ef930dc4571d5341b931dbbea2a5b047781e6c7485884890f576a0231
--   40  20260903031000_subscription_tiers  ledger sha256:0d782559f1b08512714755fcce900a8bc33ebf7f1e5bb13c53f2d5e4b62b3c29
--   41  20260903031500_dynamic_content  ledger sha256:4a973a9327843ce673e23f44af30287ecf7d803c925f88bbaa2bc23cb01fde7c
--   42  20260903032000_superadmin_tier_and_pro_plan  ledger sha256:9e7fe18c34701738ddbc9a11a4738180812795429f07c594b7be1f0ea485e3b9
--   43  20260903032500_billing_orders  ledger sha256:3488d118ea00bb84798c22e20d6bc05394fff313d97d1b56c388b383d2eece99
--   44  20260903033000_billing_permission_definitions  ledger sha256:3ca0a8f80378a57244173fae24549fea4d572fe8ce3f8accba7b1775638b8efa
--   45  20260903033500_billing_orders_rls_reads  ledger sha256:84d8e5b3fc8495c215e5e8d496a300c681bfd3bc6dcd79f7fc414018fae8e80a
--   46  20260903034000_billing_invitations_sweep  ledger sha256:6a00193514655c751ed89566b83b5903a3b9d6e8d3607958aa1deac340f14e89
--   47  20260903034500_billing_service_tiers_active  ledger sha256:7d64bba53505ca02a1c2f53396ad95a25590241dbfe420f517f9beabe0bff9d0
--   48  20260903035000_billing_real_tiers_cleanup  ledger sha256:1a2ea87001e5374974ae65e2ba6b782c54c556cb6723fefeb3c5ea9d5f44ffb8
--   49  20260903035500_billing_advisor_hardening  ledger sha256:d640cfbb36b38f55fc02f89ac5892895f81572d7478f36a15440e4d53a6bd9be
--   50  20260903036000_billing_users_email_idx  ledger sha256:f6b4e2271d6142cc24c0dad8c6696f8454d33e9471bb64c987ebcd6d6d478aae
--   51  20260903036500_billing_faq_random_ids  ledger sha256:022c10a71fa093b0979ef09be759030788f4d728d5863da5846dfbfcc672a1c8
--   52  20260903037000_billing_real_checksums  ledger sha256:7bd6b57ba6482ca481036314feded0f96a65ed65f195ab615a7ec3e106c5e989
--   53  20260903037500_billing_packages_plan_unique  ledger sha256:2c9245957e4e6776ef3f9f5fbe2d0345fc76c8d87fcacf59e46df19d2a55a618
--   54  20260903038000_billing_pro_100_enterprise_custom  ledger sha256:7e3182e2c36af9723dbcd73110cf7aa08fe034c446957876f188d58f347ca97b
--   55  20260903038500_billing_sales_copy  ledger sha256:32af17f6c568bceb3faae02383a12916f2681452d8581dde2767ad1bb77edf10
--   56  20260903039000_billing_tier_ladder  ledger sha256:ca8752a2190ab86ab5152325e86ac81cca59ded6270407a69b1078122282625b
--   57  20260903039500_billing_buyer_faqs  ledger sha256:27e9d8c9b38d97ce13a65bb29ac57e524c793112c089c621b617379535fe395a
--   58  20260903040000_contact_channel_hrefs  ledger sha256:267a0b397988ce88a8675f025201e6d4fd9da8d246ada57d38982cf59f755d7e
--   59  20260903040500_publication_overrides  ledger sha256:883f702c365d34ed4b1f56f01c70810f87634536d36dcaf3d89c98fd388f9299
--   60  20260903041000_publishing_unpublished_state  ledger sha256:6a56c170c43d7727b6448f552e5b9ba80f0307cca44bb588dce4dc87351d9792
--   61  20260903041500_release_manifest_source_version  ledger sha256:ddcb8dc0513c61286093311f7025edef68c7de36e5bf9c25415181b8e0ba7315
--   62  20260903042000_fix_site_settings_robots_cast  ledger sha256:fe7e26fd5533d1058909e05df04d4c5e5cf4e8210dcbd5ce110543d6c56e0283
--   63  20260903042500_site_settings_default_media  ledger sha256:01ce40cb4444c82f9cde77d0627482772bfa9403a1f05e94d08f95e98fc55114
--   64  20260903043000_site_settings_default_media_idx  ledger sha256:f1999940a49683967cbd096a5bdb31c4bfd3872492d10d1a654788ca8d2d9152
--   65  20260903043500_media_thumb_object_key  ledger sha256:ce92b5bca494142d99bfc6093bd3b75c1942afa3f136c236e324c1edebe94526
--   66  20260903044000_site_settings_media_indexes  ledger sha256:5f4a02f42c5b47fb669f7c3b0d6312b470c0edc6d8e4ff78314b7600b584f0f2
--   67  20260903044500_subscription_expiry_warnings  ledger sha256:5bb01052f4d1a457662d723395f116338d1b35eb1b53d82209e0e2397b69ed4c
--   68  20260903045000_enterprise_lead_list  ledger sha256:30bbd1712709b7b524f0011b2b5f5669f944735e9850c4cf151143d8c392fddf
--   69  20260906000000_billing_terms_consent  ledger sha256:1d5e3e70e73614fec355aabe42542115cd5049add6e09db4ede8c2e7d1c90315
--   70  20260906001000_billing_refund_status  ledger sha256:b9dacfbc2024351be42696f39bc1433b188c63cc0b76c7807432fd6af30c1de1
--   71  20260906002000_billing_pending_terms  ledger sha256:ca317573867eb610e2e733b68e8d0ccd37fd60547a588dc393fa4fbb9b1701c8
--   72  20260906003000_historical_digest_rebaseline  ledger sha256:e604aa8e6a85b65c247afc8189a8c29af1608c1d48c3d86fa9d32a06d4d567fe
--   73  20260906004000_malformed_digest_correction  ledger sha256:4603bd3fe900ac7c2ea647a13169d6a747eb059d6f1a6dc398c23e65862487ee
--   74  20260906005000_audit_hash_chain  ledger sha256:f8b1336fb8842b0041fa2adee9b5d3bdd5cd3ec6e6cc5b97c4b7785d71b27619
--   75  20260906006000_retention_sweep  ledger sha256:83edc7e8040711c9c3a61948b1e0f8b3745e3f06d5bdcd32058a91b30fc043b3
--   76  20260906007000_moderation_reports  ledger sha256:abc7b801da94d2a74ea964bea1a365953278731c1a68e74505c58dba05b6a86a
--   77  20260906008000_moderation_fk_indexes  ledger sha256:ceb9d156043b24e05acda856a3792d5e62901e88714fcabb503ec3b03e3cfb62
--   78  20260907000000_delivery_activation_claim  ledger sha256:5930a61f1313231da8bf871b0570d8ff84b702ca55d53f2719a50e2cdb12c19c
--   79  20260907010000_litigation_holds  ledger sha256:4a1b9e655395c52a5f41fb247c8b3355a5cd82e2fa9e2ff503d591b636ae58b1
--   80  20260907020000_org_erasure  ledger sha256:57b2b7e15ce6c9f6fa641d77a66d419dd50da4df7a112de3cdcdf71610b37f51
--   81  20260907030000_rls_global_select_tightening  ledger sha256:eef950f979b7f94c7e2960a09600f8c8d132dc3890a80ba73dfd02bdd8346bda
--   82  20260907040000_function_grants_repair  ledger sha256:9ef1be218107d9be43339825e6759089399c61891c65d2f83782657ee60b05d9
--   83  20260907050000_telegram_outbox  ledger sha256:7c4b646650088954612cd6a01fa623c5e9349bfb571d9aa34a3bcd2356effa1e
--   84  20260907060000_lead_consent  ledger sha256:5b34f645a608638a10d77852284daead5369d445ff5472a978bff5db8ee6cb86
--   85  20260907080000_function_only_policies  ledger sha256:2bab06cdc9f2a5d02bb2bd88ee4ee0c189d0e231d6ab4106dc78248e4d0ec4a6
--   86  20260907090000_worm_export_proof  ledger sha256:e39fbc068a47ee9681de3fd4d0dc1d3ced101f7ee28a66df9dcb9d2d938b5be5
--   87  20260907100000_delivery_previous_host_owned  ledger sha256:6b0d16b60cf393663fa21911ed40832abbd0e25038ab6a6909dc96cfe72e646d
--   88  20260907110000_ops_visibility  ledger sha256:9f0190f034aa3fd4e9e67de2ccf416b23019cecdf252fe47d0272851d949c6ab
--   89  20260907120000_invoice_list  ledger sha256:eab0fb0ff02350f5c5b234035144f8e14fe9e5c4db61a298232f1375399becd0
--   90  20260907130000_ops_fk_covering_indexes  ledger sha256:a9e99e8725de43325befe61a4b94d21063be8baf58d75a8b6adef0a74ed7055f
--   91  20260907140000_article_site_view_counts  ledger sha256:30ccbebf959a89aeef8d7ccadc872895a90e62b4387a2d376086fc2e742f40e8
--   92  20260907150000_article_tags  ledger sha256:95e29c7703dd24b8081850223ad2e76bad347e58b1da3c52d8cfecafe4cfa2d2
--   93  20260907160000_merge_view_counts  ledger sha256:4577d7045f8bd1a22478c3390d3ecd6453998d18ff9a4a4c3df0c517bec190de
--   94  20260907170000_seed_upt_jateng_59org  ledger sha256:36006ad8ca4eabce4a3b90831f5bb1d7db8ab32b478070ae2539f46847358580
--   95  20260907180000_fix_upt_city_ambarawa_klaten  ledger sha256:ace527a8a731e1b55e643694bb09d1ab27bda4f78f5c2aefb3e63a538546c961
--   96  20260907190000_publisher_humas_attribution  ledger sha256:5c957edf0165666206229605ae4fc49059cf1b0cbca85d42044d22564b9273bd
--   97  20260907200000_retire_packages_manual_activation  ledger sha256:4bdbf07d8ce3aad8d53e480db92a1eafe43ed6d0c02d60b200a4987945b35cfa
--   98  20260907210000_faq_manual_activation_copy  ledger sha256:67e8c98fa070f03722c716a0978ae69f39cefec4a1722fbba8e18b5de9bd9943
--   99  20260907220000_rename_invite_deny_policy  ledger sha256:2c748b29a1c8316ffb63fb9dc326d01cdde4287bd9e0460ba59fb23a9ff987fc
--   100  20260907230000_drop_billing_order_status  ledger sha256:2979e4de0b51864744cff7bc55a9cfd93f3d8bea745ab7c776f32637e3ef18a2
--   101  20260907240000_manual_invoices  ledger sha256:7077d44dfd73241b6a47777d62d805d7ad55995a4e8e780ec4a7f1f1a3020edf
--   102  20260907250000_invoice_number_enterprise  ledger sha256:c6f332b7bd6c818cdc0bc11ce62c2c37e13293d4a4ac476ee37b2f68b9ca77bb
--   103  20260907260000_invite_visibility  ledger sha256:dd823700429f94990a4ccd3e543c735602cfbb043d9c6e7d18fc38cdeb1d0a19
--   104  20260907270000_fix_site_settings_guard_return  ledger sha256:87b58751c14844cfaf6617ed617fe08864a86287fc12e9b0e5e89f306b8b35fe
--   105  20260907280000_discover_hosts_add_versions  ledger sha256:afe5d5ae1390c3f115910c25e981dd622cb9f7e55a013fc6a34265bf4075a0b1
--   106  20260907290000_organizations_kind  ledger sha256:1cf29d796e80440c29c0e54bb777865a9926b574f591504d87571061ef3aa3a4
--   107  20260914020000_template_preset_clean_blue  ledger sha256:537f1dbd9d7d4bf251888ba1e4da1103c6affb86865b13d98e576027493a5c32
--   108  20260914030000_articles_cover_image_url  ledger sha256:4b4be4b5400c1473969d7c060bbf88be15dfd33d211bbc02eb9b4f38dbf923b6
--   109  20260914040000_single_template_clean_blue  ledger sha256:16ce003f1b2624fa78dff1463b31ac701895ec02fe4c1735011b63f5374e5c0a
--   110  20260915000000_seo_metadata_hardening  ledger sha256:33702d7fb317a932c060423fffeaeeaf3a68155eb4c51e147e6783c3d1d6cb01
--   111  20260915010000_invoices_created_by_covering_index  ledger sha256:995168799f377bff817043b7757a7161741d92fea327253c57fd6aa11d05c0f1
--   112  20260915020000_media_policy_allow_ico  ledger sha256:38ecc2cee63b8ffb3034d85e1b67506941d9a9418fbdc06048556838bceb55ed
--   113  20260916000000_region_locked_memberships  ledger sha256:398087aef20abd0eead610110e9026b41f73bf35eedc3fba3c7c917ea9a35337
--   114  20260916010000_article_root_urls  ledger sha256:675a780cf8f2e72d8b42731ca6d3cfc5f02e70dfc1455ef8d95ea2be321eab85
--   115  20260916020000_invalidation_drop_articles_path  ledger sha256:e7dae07ed4c4e6be7fa011eb3c43843831c34e49b47d8e1c75b6065bf94d52ec
--   116  20260916030000_invalidation_root_article_paths  ledger sha256:7b9fe0fe8ab205d93354ba2aa661f08ec02b0ae55a7af6a31c46e2f8619f3822
--   117  20260916040000_content_attribution_cleanup  ledger sha256:088513474cb393af2e1cb9cf52dabfac713ccc75a9cdddc0325ee3cee0bc7071
--   118  20260916050000_site_settings_tagline  ledger sha256:04c7fb6d276f31f32cfc0c615117ffa7db72e9e879addf6cad36471bc8b3fea3
--   119  20260916060000_site_settings_tagline_repair  ledger sha256:a0840de2778d006f5eba47dd24271ab51011e108a51d62cf9a98dcb4373b907c
--   120  20260917000000_fix_upt_city_lpka_kutoarjo  ledger sha256:249d27aa8ae8005cc345ce5d5012bb3330fb8d9cadf721317227bc9c6a98ae4d
--   121  20260917010000_fix_upt_city_plantungan_banjarnegara  ledger sha256:b66db0d238034df9130030716f41e0792365a304ae3196e006c11b4c7b495208
--   122  20260917020000_fix_upt_city_bapas_magelang  ledger sha256:a052e94a5c51ab785a3ca16e9f043d1ef9621e0be3e7503d4fb6037616e6fce9
--   123  20260917030000_fix_upt_city_slawi  ledger sha256:b7051605faabec496d888d89b6db53cfa29ba04bcfaaa1326a1dfcd1eed11bae
--   124  20260918000000_faq_canonical_13  ledger sha256:557d615cfa121741dfa1db667332fa088caf55b7521e7aafcd236ff5ee29a0a7
--   125  20260918010000_faq_category  ledger sha256:f22a45aa12055e1739064e9a160a7b4cf223fd75f42baba2c9c3233ef67b3b2d
--   126  20260918020000_publisher_attribution_short  ledger sha256:cbba982f7b67214a257c4460e577633aaa6fb479c5cb684319821353d68b88e0
--   127  20260918030000_publisher_attribution_helper  ledger sha256:e3870e0b944265cdfa7e4f489b070eb593708cf7c14183c1d6b81bf332690ab6
--   128  20260918040000_function_search_path  ledger sha256:92b89a3979a4955f8d6b711abdaa3b6abc42f5afe380628fa09ae5225807ff07
--   129  20260918050000_telegram_publish_pick_site  ledger sha256:b7ad2fb3ca7aeeffff1dfafd0c1944465f8bdaa9ef127c6072319249c96d3802
--   130  20260919010000_invoice_payment_method  ledger sha256:e89b52f05853e285fbb9a1d6b883f91928994edff92713905e05301766e09831
--   131  20260919020000_telegram_suggest_step  ledger sha256:f7c94c8795a2d6d3c3f54917194b67f6562ba53631c9a98077ea0c475fdd5da9
--   132  20260919030000_template_presets_nine  ledger sha256:690b951bc2e4ed749ca8961203a2dd0c5157a2e7b73cacee1d31f31fbf188ab3
--   133  20260919040000_telegram_identity_options  ledger sha256:e8192d2701af3ac5c1814f86becf9139bc51d77fb34f29460ba30c0133a8ba7f
--   134  20260919050000_telegram_article_edit_step  ledger sha256:68757b6a83cc1029faa7bc376a6cac2ffe200e1a33bf24744459c054d3c18c5e
--   135  20260919060000_retention_terminal_sweep  ledger sha256:88aa6858763e01f1b9987bb1d1cd741483962aa03813c5ce15e5f19717db331d
--   136  20260920030000_subscription_update_entry_point  ledger sha256:ce315b60f682d837381b5a08910ed05484d5c7811487629f0078d8c972bcdfd6
--   137  20260920040000_invoice_paid_month_single_price  ledger sha256:8039b3d3b9dadc3faae32b2b4c9ee5b7d70336eed108f13212a09a328a77423d
--   138  20260920050000_site_settings_template_fk  ledger sha256:f3cdcf931e6bcfa7e384d7133e9793c5941b61bb4e393ab6fc647de414c7501c
--   139  20260920060000_site_settings_template_fk_idx  ledger sha256:4222bd4f7d9c0293328682acf0d52f19a2d881c60c57073aad86af718a90d53e
--   140  20260920070000_invoice_unpaid  ledger sha256:5b92a475182327b1dbfc02f84f62be080c91a6d8ae9de9f4d5b8c834664efebc
--   141  20260920080000_article_tags_canonical  ledger sha256:f15e59155ae924936f42fccd5a2f6293ebc7914a9ead56e39245a89f15ba9de2
--   142  20260920090000_dashboard_metric_indexes  ledger sha256:03d1c9876901f91d99345df94b9e4444d48b5256b0210c53c88f2c5e47aa9b26
--   143  20260920100000_publisher_logo_single_host  ledger sha256:b0776d14e863da4b48fe56209d6c8f2413f2943dfd43b9264c4dc299612cb730
--   144  20260920110000_article_site_view_days  ledger sha256:6843dc4a2cbdf88860cad4a8a5d23dd1bdbb689fca16ccaaa54d34f16e7dd9af
--   145  20260921120000_rls_internal_config  ledger sha256:c786ef81105ea8b3789d15426ca55bb712dc5bb51c30c3f908c08f8cba8c8363
--   146  20260921130000_invoice_amount_manual  ledger sha256:a85233831af991411fc5c88b8b9b142b0be783b51a991dec501ec36ccb369920
--   147  20260921140000_article_editorial_fields  ledger sha256:2881cbcdf206cbc5cf5fc9b11f3c29c2265f64b52a61c77221f4a72773bf96db
--   148  20260922000000_article_body_json  ledger sha256:dbdd8783a227df74128cebbd173b6b02617d9a844e97c3ea9f917aa9a0d9bedb
--   149  20260922010000_publisher_verification_evidence  ledger sha256:6ba561a9b520f7eb0253bcabd346b9471e449c376e590d06a486f1f733012fa5
--   150  20260922020000_publisher_verification_evidence_rework  ledger sha256:f183751ed58091e15142f9cba63e1b0759231fbc764f321040c5eaf309191367
--   151  20260922030000_publisher_verification_evidence_scoped  ledger sha256:ddec465909aaebe73d4df6749b0c87b84430bb99bbd6cc66853512fb9e203a32
--   152  20260922040000_retention_runs_organization  ledger sha256:c8d73727677b0e4223b4c1603a78c18fe23e042c35fdb85afffbc873ec109009
--   153  20260922050000_retention_runs_organization_idx  ledger sha256:8300ea22baecd3476641c50ec17c1196cd5267050f6ddb5e82b8bde889f448d0

BEGIN;

CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- Fail closed rather than replaying reviewed migrations over existing state.
DO $bootstrap$
BEGIN
  IF EXISTS (SELECT 1 FROM drizzle."__drizzle_migrations") THEN
    RAISE EXCEPTION 'indicate_bootstrap_requires_empty_database';
  END IF;
END
$bootstrap$;
-- ----------------------------------------------------------------------
-- 20260903000000_core_schema
-- ----------------------------------------------------------------------
CREATE TYPE "public"."article_status" AS ENUM('draft', 'active', 'archived');
CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'api_key', 'telegram', 'system');
CREATE TYPE "public"."audit_entry_point" AS ENUM('cms', 'api', 'telegram', 'worker', 'reconciler');
CREATE TYPE "public"."audit_outcome" AS ENUM('succeeded', 'denied', 'failed');
CREATE TYPE "public"."media_state" AS ENUM('reserved', 'active', 'rejected', 'archived');
CREATE TYPE "public"."publisher_type" AS ENUM('government_institution', 'correctional_institution', 'public_relations_office', 'company', 'organization', 'community', 'independent_publisher');
CREATE TYPE "public"."publisher_verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE "public"."publishing_state" AS ENUM('queued', 'processing', 'published', 'failed', 'retrying');
CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'used', 'occupied', 'expired');
CREATE TYPE "public"."task_status" AS ENUM('pending', 'processing', 'completed', 'failed');
CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked', 'expired');
CREATE TYPE "public"."permission_scope" AS ENUM('organization', 'platform');
CREATE TYPE "public"."record_status" AS ENUM('active', 'inactive', 'archived');
CREATE TYPE "public"."site_activation_state" AS ENUM('inactive', 'pending', 'active', 'failed');
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'suspended', 'cancelled');
CREATE TYPE "public"."dispatch_status" AS ENUM('pending', 'scheduled', 'leased', 'acknowledged', 'failed');
CREATE TYPE "public"."replay_claim_status" AS ENUM('claimed', 'processed', 'rejected');
CREATE TYPE "public"."seed_run_status" AS ENUM('running', 'completed', 'failed');
CREATE TABLE "article_sites" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"state" "publishing_state" DEFAULT 'queued' NOT NULL,
	"published_url" text,
	"published_at" timestamp with time zone,
	"sanitized_failure" jsonb,
	"attempt" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_sites_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "article_sites_id_unique" UNIQUE("id"),
	CONSTRAINT "article_sites_organization_article_site_unique" UNIQUE("organization_id","article_id","site_id"),
	CONSTRAINT "article_sites_attempt_nonnegative" CHECK ("article_sites"."attempt" >= 0 AND "article_sites"."version" > 0),
	CONSTRAINT "article_sites_published_outcome" CHECK ("article_sites"."state" <> 'published' OR ("article_sites"."published_url" IS NOT NULL AND "article_sites"."published_at" IS NOT NULL))
);

CREATE TABLE "articles" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"region_id" uuid NOT NULL,
	"publisher_id" uuid,
	"category_id" uuid,
	"author_id" uuid,
	"lead_media_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"source" text NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "articles_id_unique" UNIQUE("id"),
	CONSTRAINT "articles_organization_slug_unique" UNIQUE("organization_id","slug"),
	CONSTRAINT "articles_version_positive" CHECK ("articles"."version" > 0)
);

CREATE TABLE "audit_logs" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" text NOT NULL,
	"entry_point" "audit_entry_point" NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"outcome" "audit_outcome" NOT NULL,
	"changed_fields" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"request_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_pk" PRIMARY KEY("organization_id","id")
);

CREATE TABLE "authors" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"byline" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "authors_id_unique" UNIQUE("id")
);

CREATE TABLE "categories" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "categories_id_unique" UNIQUE("id"),
	CONSTRAINT "categories_organization_slug_unique" UNIQUE("organization_id","slug")
);

CREATE TABLE "domain_activation_attempts" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"activation_state" text NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_activation_attempts_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "domain_activation_attempts_nonnegative" CHECK ("domain_activation_attempts"."attempts" >= 0)
);

CREATE TABLE "invalidation_tasks" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"previous_hostname" text,
	"current_hostname" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"urls" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"reason" text NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sanitized_failure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invalidation_tasks_pk" PRIMARY KEY("organization_id","id")
);

CREATE TABLE "media" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"purpose" text NOT NULL,
	"media_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"state" "media_state" DEFAULT 'reserved' NOT NULL,
	"article_id" uuid,
	"site_id" uuid,
	"organization_asset" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "media_id_unique" UNIQUE("id"),
	CONSTRAINT "media_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "media_exactly_one_owner" CHECK (num_nonnulls("media"."article_id", "media"."site_id") + CASE WHEN "media"."organization_asset" THEN 1 ELSE 0 END = 1),
	CONSTRAINT "media_owner_prefix" CHECK ((
    ("media"."article_id" IS NOT NULL AND "media"."object_key" LIKE ('articles/' || "media"."article_id"::text || '/%'))
    OR ("media"."site_id" IS NOT NULL AND "media"."object_key" LIKE ('sites/' || "media"."site_id"::text || '/%'))
    OR ("media"."organization_asset" AND "media"."object_key" LIKE 'assets/%')
  )),
	CONSTRAINT "media_size_positive" CHECK ("media"."size_bytes" > 0 AND "media"."version" > 0)
);

CREATE TABLE "media_key_reservations" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"purpose" text NOT NULL,
	"article_id" uuid,
	"site_id" uuid,
	"organization_asset" boolean DEFAULT false NOT NULL,
	"expected_media_type" text NOT NULL,
	"expected_size_bytes" integer NOT NULL,
	"expected_checksum" text,
	"status" "reservation_status" DEFAULT 'reserved' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_reservations_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "media_key_reservations_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "media_key_reservation_exactly_one_owner" CHECK (num_nonnulls("media_key_reservations"."article_id", "media_key_reservations"."site_id") + CASE WHEN "media_key_reservations"."organization_asset" THEN 1 ELSE 0 END = 1),
	CONSTRAINT "media_key_reservation_size_positive" CHECK ("media_key_reservations"."expected_size_bytes" > 0)
);

CREATE TABLE "object_cleanup_tasks" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"reason" text NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sanitized_failure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "object_cleanup_tasks_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "object_cleanup_tasks_attempts_nonnegative" CHECK ("object_cleanup_tasks"."attempts" >= 0)
);

CREATE TABLE "official_affiliations" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"publisher_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"institution_name" text NOT NULL,
	"claim_scopes" text[] NOT NULL,
	"evidence_reference" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "official_affiliations_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "official_affiliations_org_publisher_site_institution_unique" UNIQUE("organization_id","publisher_id","site_id","institution_name")
);

CREATE TABLE "publishers" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "publisher_type" NOT NULL,
	"verification_status" "publisher_verification_status" DEFAULT 'unverified' NOT NULL,
	"attribution_label" text NOT NULL,
	"contacts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_reference" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"rejection_reason" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishers_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "publishers_id_unique" UNIQUE("id"),
	CONSTRAINT "publishers_version_positive" CHECK ("publishers"."version" > 0)
);

CREATE TABLE "site_settings" (
	"organization_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"colors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"navigation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"logo_media_id" uuid,
	"favicon_media_id" uuid,
	"fallback_media_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_pk" PRIMARY KEY("organization_id","site_id"),
	CONSTRAINT "site_settings_version_positive" CHECK ("site_settings"."version" > 0)
);

CREATE TABLE "api_keys" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"lookup_id" text NOT NULL,
	"salt" text NOT NULL,
	"verification_hash" text NOT NULL,
	"scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"predecessor_id" uuid,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "api_keys_lookup_id_unique" UNIQUE("lookup_id")
);

CREATE TABLE "domains" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"normalized_hostname" text NOT NULL,
	"status" "record_status" DEFAULT 'inactive' NOT NULL,
	"cloudflare_zone_id" text,
	"routing_version" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "domains_id_unique" UNIQUE("id"),
	CONSTRAINT "domains_normalized_hostname_unique" UNIQUE("normalized_hostname"),
	CONSTRAINT "domains_hostname_length" CHECK (length("domains"."normalized_hostname") BETWEEN 3 AND 253),
	CONSTRAINT "domains_versions_positive" CHECK ("domains"."routing_version" > 0 AND "domains"."version" > 0)
);

CREATE TABLE "memberships" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_pk" PRIMARY KEY("organization_id","user_id"),
	CONSTRAINT "memberships_version_positive" CHECK ("memberships"."version" > 0)
);

CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"customer_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_version_positive" CHECK ("organizations"."version" > 0)
);

CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"scope" "permission_scope" NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_scope_organization_check" CHECK ((
    ("permissions"."scope" = 'platform' AND "permissions"."organization_id" IS NULL)
    OR ("permissions"."scope" = 'organization' AND "permissions"."organization_id" IS NOT NULL)
  ))
);

CREATE TABLE "regions" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"external_key" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "regions_id_unique" UNIQUE("id"),
	CONSTRAINT "regions_organization_external_key_unique" UNIQUE("organization_id","external_key"),
	CONSTRAINT "regions_organization_slug_unique" UNIQUE("organization_id","slug"),
	CONSTRAINT "regions_slug_format" CHECK ("regions"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE "role_permissions" (
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_pk" PRIMARY KEY("organization_id","role_id","permission_id")
);

CREATE TABLE "roles" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "roles_organization_name_unique" UNIQUE("organization_id","name"),
	CONSTRAINT "roles_version_positive" CHECK ("roles"."version" > 0)
);

CREATE TABLE "sites" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	"region_id" uuid,
	"normalized_hostname" text NOT NULL,
	"status" "record_status" DEFAULT 'inactive' NOT NULL,
	"activation_state" "site_activation_state" DEFAULT 'inactive' NOT NULL,
	"routing_version" integer DEFAULT 1 NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "sites_id_unique" UNIQUE("id"),
	CONSTRAINT "sites_normalized_hostname_unique" UNIQUE("normalized_hostname"),
	CONSTRAINT "sites_versions_positive" CHECK ("sites"."routing_version" > 0 AND "sites"."content_version" > 0 AND "sites"."version" > 0)
);

CREATE TABLE "subscriptions" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"period_starts_at" timestamp with time zone,
	"period_ends_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_version_positive" CHECK ("subscriptions"."version" > 0)
);

CREATE TABLE "telegram_identity_mappings" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"telegram_user_id" text NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_identity_mappings_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "telegram_identity_org_user_chat_unique" UNIQUE("organization_id","telegram_user_id","telegram_chat_id")
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);

CREATE TABLE "migration_gate_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"required_version" integer NOT NULL,
	"actual_version" integer,
	"status" "task_status" NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_gate_required_version_positive" CHECK ("migration_gate_events"."required_version" > 0)
);

CREATE TABLE "indicate_schema_migrations" (
	"version" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"checksum" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "publication_transition_receipts" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"transition_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"target_id" uuid,
	"from_state" "publishing_state" NOT NULL,
	"to_state" "publishing_state" NOT NULL,
	"fencing_token" integer NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_transition_receipts_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "publication_transition_receipts_transition_unique" UNIQUE("transition_id")
);

CREATE TABLE "publishing_job_targets" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"article_site_id" uuid NOT NULL,
	"state" "publishing_state" DEFAULT 'queued' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"fencing_token" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"sanitized_error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishing_job_targets_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "publishing_job_targets_id_unique" UNIQUE("id"),
	CONSTRAINT "publishing_job_targets_job_article_site_unique" UNIQUE("organization_id","job_id","article_site_id"),
	CONSTRAINT "publishing_job_targets_bounded_fields" CHECK ("publishing_job_targets"."attempt" >= 0 AND "publishing_job_targets"."fencing_token" >= 0)
);

CREATE TABLE "publishing_jobs" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"fingerprint_version" integer DEFAULT 1 NOT NULL,
	"state" "publishing_state" DEFAULT 'queued' NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dispatch_status" "dispatch_status" DEFAULT 'pending' NOT NULL,
	"dispatch_attempts" integer DEFAULT 0 NOT NULL,
	"next_dispatch_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"fencing_token" integer DEFAULT 0 NOT NULL,
	"finalized_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishing_jobs_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "publishing_jobs_id_unique" UNIQUE("id"),
	CONSTRAINT "publishing_jobs_organization_idempotency_unique" UNIQUE("organization_id","idempotency_key"),
	CONSTRAINT "publishing_jobs_bounded_fields" CHECK ("publishing_jobs"."fingerprint_version" > 0 AND "publishing_jobs"."dispatch_attempts" >= 0 AND "publishing_jobs"."fencing_token" >= 0 AND "publishing_jobs"."version" > 0),
	CONSTRAINT "publishing_jobs_idempotency_length" CHECK (length("publishing_jobs"."idempotency_key") BETWEEN 1 AND 200)
);

CREATE TABLE "seed_runs" (
	"organization_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"config_fingerprint" text NOT NULL,
	"status" "seed_run_status" NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"unchanged_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"sanitized_failure" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "seed_runs_pk" PRIMARY KEY("organization_id","id"),
	CONSTRAINT "seed_runs_counts_nonnegative" CHECK ("seed_runs"."created_count" >= 0 AND "seed_runs"."updated_count" >= 0 AND "seed_runs"."unchanged_count" >= 0 AND "seed_runs"."failed_count" >= 0)
);

CREATE TABLE "webhook_replay_claims" (
	"source" text NOT NULL,
	"replay_id" text NOT NULL,
	"organization_id" uuid,
	"status" "replay_claim_status" DEFAULT 'claimed' NOT NULL,
	"outcome_reference" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "webhook_replay_claims_pk" PRIMARY KEY("source","replay_id"),
	CONSTRAINT "webhook_replay_claims_bounded_identity" CHECK (length("webhook_replay_claims"."source") BETWEEN 1 AND 100 AND length("webhook_replay_claims"."replay_id") BETWEEN 1 AND 255)
);

ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "article_sites" ADD CONSTRAINT "article_sites_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_region_fk" FOREIGN KEY ("organization_id","region_id") REFERENCES "public"."regions"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_publisher_fk" FOREIGN KEY ("organization_id","publisher_id") REFERENCES "public"."publishers"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."categories"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_fk" FOREIGN KEY ("organization_id","author_id") REFERENCES "public"."authors"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "authors" ADD CONSTRAINT "authors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invalidation_tasks" ADD CONSTRAINT "invalidation_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "invalidation_tasks" ADD CONSTRAINT "invalidation_tasks_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "media" ADD CONSTRAINT "media_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media" ADD CONSTRAINT "media_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media" ADD CONSTRAINT "media_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "media_key_reservations" ADD CONSTRAINT "media_key_reservations_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "object_cleanup_tasks" ADD CONSTRAINT "object_cleanup_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_publisher_fk" FOREIGN KEY ("organization_id","publisher_id") REFERENCES "public"."publishers"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "official_affiliations" ADD CONSTRAINT "official_affiliations_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_site_fk" FOREIGN KEY ("organization_id","site_id") REFERENCES "public"."sites"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_media_fk" FOREIGN KEY ("organization_id","logo_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_media_fk" FOREIGN KEY ("organization_id","favicon_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_fallback_media_fk" FOREIGN KEY ("organization_id","fallback_media_id") REFERENCES "public"."media"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_predecessor_fk" FOREIGN KEY ("organization_id","predecessor_id") REFERENCES "public"."api_keys"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "regions" ADD CONSTRAINT "regions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "sites" ADD CONSTRAINT "sites_domain_fk" FOREIGN KEY ("organization_id","domain_id") REFERENCES "public"."domains"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "sites" ADD CONSTRAINT "sites_region_fk" FOREIGN KEY ("organization_id","region_id") REFERENCES "public"."regions"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_membership_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "telegram_identity_mappings" ADD CONSTRAINT "telegram_identity_role_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "public"."publishing_jobs"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "publication_transition_receipts" ADD CONSTRAINT "publication_transition_receipts_target_fk" FOREIGN KEY ("organization_id","target_id") REFERENCES "public"."publishing_job_targets"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "public"."publishing_jobs"("organization_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "publishing_job_targets" ADD CONSTRAINT "publishing_job_targets_article_site_fk" FOREIGN KEY ("organization_id","article_site_id") REFERENCES "public"."article_sites"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishing_jobs" ADD CONSTRAINT "publishing_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishing_jobs" ADD CONSTRAINT "publishing_jobs_article_fk" FOREIGN KEY ("organization_id","article_id") REFERENCES "public"."articles"("organization_id","id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "seed_runs" ADD CONSTRAINT "seed_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "article_sites_site_state_date_idx" ON "article_sites" USING btree ("organization_id","site_id","state","published_at");
CREATE INDEX "articles_organization_status_date_idx" ON "articles" USING btree ("organization_id","status","published_at");
CREATE INDEX "articles_organization_region_idx" ON "articles" USING btree ("organization_id","region_id");
CREATE INDEX "articles_organization_category_idx" ON "articles" USING btree ("organization_id","category_id");
CREATE INDEX "audit_logs_organization_date_idx" ON "audit_logs" USING btree ("organization_id","occurred_at");
CREATE INDEX "audit_logs_organization_action_target_idx" ON "audit_logs" USING btree ("organization_id","action","target_type");
CREATE INDEX "audit_logs_organization_actor_outcome_idx" ON "audit_logs" USING btree ("organization_id","actor_id","outcome");
CREATE INDEX "authors_organization_status_name_idx" ON "authors" USING btree ("organization_id","status","display_name");
CREATE INDEX "categories_organization_status_idx" ON "categories" USING btree ("organization_id","status");
CREATE INDEX "domain_activation_attempts_due_idx" ON "domain_activation_attempts" USING btree ("status","next_attempt_at");
CREATE INDEX "invalidation_tasks_due_idx" ON "invalidation_tasks" USING btree ("status","next_attempt_at");
CREATE INDEX "media_organization_state_idx" ON "media" USING btree ("organization_id","state");
CREATE INDEX "media_key_reservations_expiry_status_idx" ON "media_key_reservations" USING btree ("status","expires_at");
CREATE INDEX "object_cleanup_tasks_due_idx" ON "object_cleanup_tasks" USING btree ("status","next_attempt_at");
CREATE INDEX "official_affiliations_active_idx" ON "official_affiliations" USING btree ("organization_id","publisher_id","site_id","active");
CREATE INDEX "publishers_organization_status_type_idx" ON "publishers" USING btree ("organization_id","status","type");
CREATE INDEX "api_keys_organization_status_idx" ON "api_keys" USING btree ("organization_id","status");
CREATE INDEX "domains_organization_status_idx" ON "domains" USING btree ("organization_id","status");
CREATE INDEX "memberships_user_status_idx" ON "memberships" USING btree ("user_id","status");
CREATE INDEX "memberships_organization_role_idx" ON "memberships" USING btree ("organization_id","role_id","status");
CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");
CREATE UNIQUE INDEX "permissions_platform_name_unique" ON "permissions" USING btree ("name") WHERE "permissions"."scope" = 'platform';
CREATE UNIQUE INDEX "permissions_organization_name_unique" ON "permissions" USING btree ("organization_id","name") WHERE "permissions"."scope" = 'organization';
CREATE INDEX "regions_organization_status_idx" ON "regions" USING btree ("organization_id","status");
CREATE INDEX "roles_organization_active_idx" ON "roles" USING btree ("organization_id","active");
CREATE INDEX "sites_exact_active_hostname_idx" ON "sites" USING btree ("normalized_hostname","status","activation_state");
CREATE INDEX "sites_organization_domain_idx" ON "sites" USING btree ("organization_id","domain_id");
CREATE INDEX "telegram_identity_status_idx" ON "telegram_identity_mappings" USING btree ("organization_id","status");
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");
CREATE INDEX "publication_transition_receipts_unacknowledged_idx" ON "publication_transition_receipts" USING btree ("acknowledged_at");
CREATE UNIQUE INDEX "publishing_job_targets_active_article_site_unique" ON "publishing_job_targets" USING btree ("organization_id","article_site_id") WHERE "publishing_job_targets"."state" IN ('queued', 'processing', 'retrying');
CREATE INDEX "publishing_job_targets_job_state_idx" ON "publishing_job_targets" USING btree ("organization_id","job_id","state");
CREATE INDEX "publishing_job_targets_retry_due_idx" ON "publishing_job_targets" USING btree ("state","next_attempt_at");
CREATE INDEX "publishing_jobs_dispatch_due_idx" ON "publishing_jobs" USING btree ("dispatch_status","next_dispatch_at");
CREATE INDEX "publishing_jobs_state_lease_idx" ON "publishing_jobs" USING btree ("state","lease_expires_at");
CREATE INDEX "publishing_jobs_organization_date_idx" ON "publishing_jobs" USING btree ("organization_id","created_at");
CREATE UNIQUE INDEX "seed_runs_successful_fingerprint_unique" ON "seed_runs" USING btree ("organization_id","config_fingerprint") WHERE "seed_runs"."status" = 'completed';
CREATE INDEX "webhook_replay_claims_expiry_idx" ON "webhook_replay_claims" USING btree ("expires_at");

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f7163225de73270a59d8675e2d44f0ea9706a96a01bde339f36b487e65218dc0', 1788105281761);

-- ----------------------------------------------------------------------
-- 20260903000500_security
-- ----------------------------------------------------------------------
-- Phase 2 defense-in-depth security, coherence, grants, and migration gate metadata.
CREATE SCHEMA IF NOT EXISTS indicate_private;

CREATE OR REPLACE FUNCTION indicate_private.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION indicate_private.current_auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.auth_user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION indicate_private.set_tenant_context(
  requested_organization_id uuid,
  requested_actor_id text,
  requested_request_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  existing_organization_id text;
BEGIN
  IF requested_organization_id IS NULL OR requested_actor_id IS NULL OR requested_request_id IS NULL THEN
    RAISE EXCEPTION 'tenant context is required' USING ERRCODE = '42501';
  END IF;
  existing_organization_id := current_setting('app.organization_id', true);
  IF existing_organization_id IS NOT NULL AND existing_organization_id <> ''
     AND existing_organization_id <> requested_organization_id::text THEN
    RAISE EXCEPTION 'tenant context conflict' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.organization_id', requested_organization_id::text, true);
  PERFORM set_config('app.actor_id', requested_actor_id, true);
  PERFORM set_config('app.request_id', requested_request_id, true);
END;
$$;

ALTER TABLE "articles"
  ADD CONSTRAINT "articles_lead_media_fk"
  FOREIGN KEY ("organization_id", "lead_media_id")
  REFERENCES "media" ("organization_id", "id")
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION indicate_private.enforce_role_permission_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  permission_record permissions%ROWTYPE;
BEGIN
  SELECT * INTO permission_record FROM permissions WHERE id = NEW.permission_id;
  IF NOT FOUND OR (
    permission_record.scope = 'organization'
    AND permission_record.organization_id IS DISTINCT FROM NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'role permission organization mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER role_permissions_scope_guard
BEFORE INSERT OR UPDATE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_role_permission_scope();

CREATE OR REPLACE FUNCTION indicate_private.enforce_telegram_membership_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.user_id
      AND role_id = NEW.role_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'telegram mapping membership mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER telegram_mapping_membership_role_guard
BEFORE INSERT OR UPDATE ON telegram_identity_mappings
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_telegram_membership_role();

CREATE OR REPLACE FUNCTION indicate_private.enforce_site_hostname_shape()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  root_hostname text;
  region_slug text;
BEGIN
  SELECT normalized_hostname INTO root_hostname
  FROM domains WHERE organization_id = NEW.organization_id AND id = NEW.domain_id;
  IF root_hostname IS NULL THEN
    RAISE EXCEPTION 'site domain unavailable' USING ERRCODE = '23503';
  END IF;
  IF NEW.region_id IS NULL THEN
    IF NEW.normalized_hostname <> root_hostname THEN
      RAISE EXCEPTION 'apex site hostname mismatch' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT slug INTO region_slug
    FROM regions WHERE organization_id = NEW.organization_id AND id = NEW.region_id;
    IF region_slug IS NULL OR NEW.normalized_hostname <> region_slug || '.' || root_hostname THEN
      RAISE EXCEPTION 'regional site hostname mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sites_hostname_shape_guard
BEFORE INSERT OR UPDATE OF organization_id, domain_id, region_id, normalized_hostname ON sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_site_hostname_shape();

CREATE OR REPLACE FUNCTION indicate_private.enforce_job_target_article()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  job_article_id uuid;
  target_article_id uuid;
BEGIN
  SELECT article_id INTO job_article_id FROM publishing_jobs
    WHERE organization_id = NEW.organization_id AND id = NEW.job_id;
  SELECT article_id INTO target_article_id FROM article_sites
    WHERE organization_id = NEW.organization_id AND id = NEW.article_site_id;
  IF job_article_id IS NULL OR target_article_id IS NULL OR job_article_id <> target_article_id THEN
    RAISE EXCEPTION 'publishing target article mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publishing_job_targets_article_guard
BEFORE INSERT OR UPDATE ON publishing_job_targets
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_job_target_article();

CREATE OR REPLACE FUNCTION indicate_private.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit logs are append-only' USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER audit_logs_append_only_guard
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_audit_mutation();

DO $$
DECLARE
  table_name text;
  tenant_tables constant text[] := ARRAY[
    'roles', 'memberships', 'role_permissions', 'domains', 'regions', 'sites',
    'subscriptions', 'api_keys', 'telegram_identity_mappings', 'publishers',
    'official_affiliations', 'categories', 'authors', 'articles', 'article_sites',
    'media', 'site_settings', 'media_key_reservations', 'object_cleanup_tasks',
    'audit_logs', 'domain_activation_attempts', 'invalidation_tasks',
    'publishing_jobs', 'publishing_job_targets', 'publication_transition_receipts',
    'seed_runs'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id())',
      table_name
    );
  END LOOP;
END
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations
  USING (id = indicate_private.current_organization_id())
  WITH CHECK (id = indicate_private.current_organization_id());

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY permission_scope_isolation ON permissions
  USING (scope = 'platform' OR organization_id = indicate_private.current_organization_id())
  WITH CHECK (scope = 'platform' OR organization_id = indicate_private.current_organization_id());

ALTER TABLE webhook_replay_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_replay_claims FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_replay_tenant_isolation ON webhook_replay_claims
  USING (organization_id IS NULL OR organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id IS NULL OR organization_id = indicate_private.current_organization_id());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY auth_identity_isolation ON users
  USING (auth_user_id = indicate_private.current_auth_user_id())
  WITH CHECK (auth_user_id = indicate_private.current_auth_user_id());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'indicate_runtime') THEN
    CREATE ROLE indicate_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public, indicate_private TO indicate_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO indicate_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON permissions FROM indicate_runtime;
GRANT SELECT ON permissions TO indicate_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM indicate_runtime;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON indicate_schema_migrations, migration_gate_events FROM indicate_runtime;
GRANT SELECT ON indicate_schema_migrations TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.set_tenant_context(uuid, text, text) TO indicate_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO indicate_runtime;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES
  (1, 'core_schema', 'drizzle-0000'),
  (2, 'security', 'drizzle-0001')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('99d793ebab12f68ad323375409cef6cf7ef60460e36ff13d490173c18698b244', 1788105298677);

-- ----------------------------------------------------------------------
-- 20260903001000_publisher_actor_constraints
-- ----------------------------------------------------------------------
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_submitter_membership_fk" FOREIGN KEY ("organization_id","submitted_by") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_verifier_membership_fk" FOREIGN KEY ("organization_id","verified_by") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE restrict ON UPDATE no action;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (3, 'publisher_actor_constraints', 'drizzle-0002')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('3aa4a6b1ff287d891612bab6f7334887e3def437124c198b7766220177b806e2', 1788106167567);

-- ----------------------------------------------------------------------
-- 20260903001500_authorization_hardening
-- ----------------------------------------------------------------------
-- Phase 2 reciprocal Telegram coherence and authorization hardening.
CREATE OR REPLACE FUNCTION indicate_private.enforce_telegram_membership_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  PERFORM 1
  FROM memberships
  WHERE organization_id = NEW.organization_id
    AND user_id = NEW.user_id
    AND role_id = NEW.role_id
    AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'telegram mapping membership mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION indicate_private.enforce_membership_telegram_coherence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM telegram_identity_mappings
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.user_id
      AND status = 'active'
      AND (NEW.status <> 'active' OR role_id <> NEW.role_id)
  ) THEN
    RAISE EXCEPTION 'membership telegram mapping mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER membership_telegram_mapping_guard
BEFORE UPDATE OF role_id, status ON memberships
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_membership_telegram_coherence();

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (4, 'authorization_hardening', 'drizzle-0003')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('873465b97cc0d7578ffb238880c52bca4c7ee38db108b9cbe4e295490b7b2c5f', 1788107000000);

-- ----------------------------------------------------------------------
-- 20260903002000_verified_user_context
-- ----------------------------------------------------------------------
-- Phase 3 verified Supabase Auth context and narrow User projections.
-- Forced users RLS remains unchanged: runtime code must establish a verified identity
-- before any User-backed Membership projection is available.
CREATE OR REPLACE FUNCTION indicate_private.set_verified_user_context(
  requested_auth_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  requested_actor_id text;
BEGIN
  requested_actor_id := current_setting('app.actor_id', true);
  IF requested_auth_user_id IS NULL OR requested_actor_id IS NULL OR requested_actor_id = '' THEN
    RAISE EXCEPTION 'verified user context is required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = requested_actor_id
      AND auth_user_id = requested_auth_user_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'verified user context mismatch' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('app.auth_user_id', requested_auth_user_id::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION indicate_private.current_verified_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = indicate_private.current_auth_user_id()
    AND id::text = current_setting('app.actor_id', true)
    AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION indicate_private.lookup_user_display_name(
  requested_user_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT target_user.display_name
  FROM public.users AS target_user
  WHERE target_user.id = requested_user_id
    AND indicate_private.current_verified_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.memberships AS caller_membership
      WHERE caller_membership.organization_id = indicate_private.current_organization_id()
        AND caller_membership.user_id = indicate_private.current_verified_user_id()
        AND caller_membership.status = 'active'
    )
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION indicate_private.set_verified_user_context(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.current_verified_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.lookup_user_display_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.set_verified_user_context(uuid) TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.current_verified_user_id() TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.lookup_user_display_name(uuid) TO indicate_runtime;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (5, 'verified_user_context', 'drizzle-0004')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('1e6283c7f210cda854399aa89f2be245f4c300c406825e1e22023af1c505cd5c', 1788108000000);

-- ----------------------------------------------------------------------
-- 20260903002500_discovery_outcome_timestamp
-- ----------------------------------------------------------------------
-- Phase 3 verified organization discovery and stable Article-Site outcome dates.
-- Existing rows use the best durable historical signal available: published_at for
-- published outcomes, otherwise updated_at, with created_at as the final fallback.
ALTER TABLE public.article_sites
  ADD COLUMN state_occurred_at timestamp with time zone;

UPDATE public.article_sites
SET state_occurred_at = CASE
  WHEN state = 'published' THEN COALESCE(published_at, updated_at, created_at)
  ELSE COALESCE(updated_at, created_at)
END
WHERE state_occurred_at IS NULL;

ALTER TABLE public.article_sites
  ALTER COLUMN state_occurred_at SET DEFAULT now(),
  ALTER COLUMN state_occurred_at SET NOT NULL;

CREATE INDEX article_sites_outcome_date_idx
  ON public.article_sites (organization_id, site_id, state, state_occurred_at);

CREATE OR REPLACE FUNCTION indicate_private.preserve_article_site_state_occurred_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NEW.state_occurred_at IS NOT DISTINCT FROM OLD.state_occurred_at THEN
      NEW.state_occurred_at := statement_timestamp();
    END IF;
  ELSE
    NEW.state_occurred_at := OLD.state_occurred_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER article_sites_state_occurred_at_guard
BEFORE UPDATE OF state, state_occurred_at ON public.article_sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.preserve_article_site_state_occurred_at();

CREATE OR REPLACE FUNCTION indicate_private.list_active_organizations_for_verified_user()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT organization.id, organization.name
  FROM public.users AS caller
  INNER JOIN public.memberships AS membership
    ON membership.user_id = caller.id
   AND membership.status = 'active'
  INNER JOIN public.organizations AS organization
    ON organization.id = membership.organization_id
   AND organization.status = 'active'
  INNER JOIN public.roles AS role
    ON role.organization_id = membership.organization_id
   AND role.id = membership.role_id
   AND role.active = true
  WHERE caller.id = indicate_private.current_verified_user_id()
    AND caller.status = 'active'
  ORDER BY organization.name, organization.id
$$;

REVOKE ALL ON FUNCTION indicate_private.list_active_organizations_for_verified_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.list_active_organizations_for_verified_user() TO indicate_runtime;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (6, 'discovery_outcome_timestamp', 'drizzle-0005')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('9180df7f535a9478eb51a3c876e76e1994289862a07c24dd245754be75def14c', 1788110000000);

-- ----------------------------------------------------------------------
-- 20260903003000_media_publication_runtime
-- ----------------------------------------------------------------------
-- Phase 4 exact media reservations, immutable publication outcomes, strict transitions, and claimed reconciliation.
ALTER TABLE public.media_key_reservations
  ADD CONSTRAINT media_key_reservation_owner_prefix CHECK (
    (article_id IS NOT NULL AND object_key LIKE ('articles/' || article_id::text || '/%'))
    OR (site_id IS NOT NULL AND object_key LIKE ('sites/' || site_id::text || '/%'))
    OR (organization_asset AND object_key LIKE 'assets/%')
  );

UPDATE public.media_key_reservations
SET status = 'occupied', expected_checksum = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
WHERE expected_checksum IS NULL;
ALTER TABLE public.media_key_reservations
  ALTER COLUMN expected_checksum SET NOT NULL,
  ADD CONSTRAINT media_key_reservation_sha256_checksum CHECK (expected_checksum ~ '^[A-Za-z0-9+/]{43}=$');

ALTER TABLE public.publishing_job_targets
  ADD COLUMN published_url text,
  ADD COLUMN published_at timestamptz,
  ADD CONSTRAINT publishing_job_targets_published_outcome CHECK (
    state <> 'published' OR (published_url IS NOT NULL AND published_at IS NOT NULL)
  );

ALTER TABLE public.publishing_jobs
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;

ALTER TABLE public.publication_transition_receipts
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;

ALTER TABLE public.object_cleanup_tasks
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz;

CREATE INDEX publishing_jobs_reconciliation_claim_idx
  ON public.publishing_jobs (dispatch_status, reconciliation_claim_expires_at);
CREATE INDEX publication_transition_receipts_claim_idx
  ON public.publication_transition_receipts (acknowledged_at, reconciliation_claim_expires_at);
CREATE INDEX object_cleanup_tasks_claim_idx
  ON public.object_cleanup_tasks (status, reconciliation_claim_expires_at);
CREATE INDEX articles_organization_lead_media_idx
  ON public.articles (organization_id, lead_media_id)
  WHERE lead_media_id IS NOT NULL;

CREATE OR REPLACE FUNCTION indicate_private.enforce_job_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'retrying', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing job state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publishing_job_transition_guard
BEFORE UPDATE OF state ON public.publishing_jobs
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_job_transition();

CREATE OR REPLACE FUNCTION indicate_private.enforce_target_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN
    IF OLD.state IN ('published', 'failed') THEN
      NEW.finished_at := OLD.finished_at;
      NEW.published_url := OLD.published_url;
      NEW.published_at := OLD.published_at;
      NEW.sanitized_error := OLD.sanitized_error;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing target state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publishing_target_transition_guard
BEFORE UPDATE OF state ON public.publishing_job_targets
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_target_transition();

-- article_sites is the mutable current projection. Normal transitions match target transitions;
-- terminal -> queued is permitted only after a new durable queued job target exists for this relation.
CREATE OR REPLACE FUNCTION indicate_private.enforce_article_site_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN RETURN NEW; END IF;
  IF OLD.state IN ('published', 'failed') AND NEW.state = 'queued' AND EXISTS (
    SELECT 1
    FROM public.publishing_job_targets AS target
    INNER JOIN public.publishing_jobs AS job
      ON job.organization_id = target.organization_id AND job.id = target.job_id
    WHERE target.organization_id = OLD.organization_id
      AND target.article_site_id = OLD.id
      AND target.state = 'queued'
      AND job.state = 'queued'
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid article site current-projection transition' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER article_site_transition_guard
BEFORE UPDATE OF state ON public.article_sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_article_site_transition();

CREATE OR REPLACE FUNCTION indicate_private.claim_dispatch_gaps(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, job_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT job.organization_id, job.id
    FROM public.publishing_jobs AS job
    WHERE job.state IN ('queued', 'retrying')
      AND job.dispatch_status = 'pending'
      AND job.next_dispatch_at <= requested_now
      AND (job.reconciliation_claim_expires_at IS NULL OR job.reconciliation_claim_expires_at <= requested_now)
    ORDER BY job.next_dispatch_at, job.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publishing_jobs AS job
  SET reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates
  WHERE job.organization_id = candidates.organization_id AND job.id = candidates.id
  RETURNING job.organization_id, job.id;
END;
$$;

CREATE OR REPLACE FUNCTION indicate_private.find_expired_leases(requested_now timestamptz, requested_limit integer)
RETURNS TABLE(organization_id uuid, job_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT job.organization_id, job.id
  FROM public.publishing_jobs AS job
  WHERE job.state = 'processing' AND job.lease_expires_at <= requested_now
  ORDER BY job.lease_expires_at, job.id
  LIMIT LEAST(GREATEST(requested_limit, 1), 100)
$$;

CREATE OR REPLACE FUNCTION indicate_private.claim_transition_receipts(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, receipt_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT receipt.organization_id, receipt.id
    FROM public.publication_transition_receipts AS receipt
    WHERE receipt.acknowledged_at IS NULL
      AND (receipt.reconciliation_claim_expires_at IS NULL OR receipt.reconciliation_claim_expires_at <= requested_now)
    ORDER BY receipt.created_at, receipt.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publication_transition_receipts AS receipt
  SET reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates
  WHERE receipt.organization_id = candidates.organization_id AND receipt.id = candidates.id
  RETURNING receipt.organization_id, receipt.id;
END;
$$;

CREATE OR REPLACE FUNCTION indicate_private.claim_cleanup_tasks(
  requested_now timestamptz,
  requested_limit integer,
  requested_token uuid,
  requested_claim_expires_at timestamptz
)
RETURNS TABLE(organization_id uuid, task_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT task.organization_id, task.id
    FROM public.object_cleanup_tasks AS task
    WHERE task.status IN ('pending', 'processing')
      AND task.next_attempt_at <= requested_now
      AND (task.reconciliation_claim_expires_at IS NULL OR task.reconciliation_claim_expires_at <= requested_now)
    ORDER BY task.next_attempt_at, task.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.object_cleanup_tasks AS task
  SET status = 'processing',
      reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at,
      updated_at = requested_now
  FROM candidates
  WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.organization_id, task.id;
END;
$$;

REVOKE ALL ON FUNCTION indicate_private.claim_dispatch_gaps(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.find_expired_leases(timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.claim_transition_receipts(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.claim_cleanup_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_dispatch_gaps(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.find_expired_leases(timestamptz, integer) TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.claim_transition_receipts(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;
GRANT EXECUTE ON FUNCTION indicate_private.claim_cleanup_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;

INSERT INTO indicate_schema_migrations (version, name, checksum)
VALUES (7, 'media_publication_runtime', 'drizzle-0006')
ON CONFLICT (version) DO NOTHING;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5a2a9d1eaf668693fff3ad36574cc57f59887a2c625ec5d634f52df74e5e0d58', 1788112000000);

-- ----------------------------------------------------------------------
-- 20260903003500_public_delivery
-- ----------------------------------------------------------------------
-- Phase 5 durable public routing, exact-domain activation, and recoverable cache invalidation.
ALTER TABLE public.invalidation_tasks
  ADD COLUMN paths text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz,
  ADD CONSTRAINT invalidation_tasks_attempts_nonnegative CHECK (attempts >= 0);
ALTER TABLE public.invalidation_tasks
  ADD CONSTRAINT invalidation_tasks_id_unique UNIQUE (id);
CREATE INDEX invalidation_tasks_claim_idx
  ON public.invalidation_tasks (status, reconciliation_claim_expires_at);

CREATE TABLE public.cache_bypasses (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  site_id uuid NOT NULL,
  bypass boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cache_bypasses_pk PRIMARY KEY (organization_id, site_id),
  CONSTRAINT cache_bypasses_site_fk FOREIGN KEY (organization_id, site_id) REFERENCES public.sites(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT cache_bypasses_version_positive CHECK (version > 0)
);
ALTER TABLE public.cache_bypasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_bypasses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.cache_bypasses
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());
GRANT SELECT, INSERT, UPDATE ON public.cache_bypasses TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.claim_invalidation_tasks(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.invalidation_tasks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id
    FROM public.invalidation_tasks
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.invalidation_tasks task
  SET status = 'processing', reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at, updated_at = p_now
  FROM candidates
  WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.*;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_invalidation_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_invalidation_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.site_hostname_guard()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE parent_host text; region_slug text;
BEGIN
  SELECT normalized_hostname INTO parent_host FROM public.domains
   WHERE organization_id = NEW.organization_id AND id = NEW.domain_id;
  IF parent_host IS NULL THEN RAISE EXCEPTION 'RESOURCE_UNAVAILABLE'; END IF;
  IF NEW.region_id IS NULL THEN
    IF NEW.normalized_hostname <> parent_host THEN RAISE EXCEPTION 'INVALID_SITE_HOSTNAME'; END IF;
  ELSE
    SELECT slug INTO region_slug FROM public.regions
     WHERE organization_id = NEW.organization_id AND id = NEW.region_id;
    IF region_slug IS NULL OR NEW.normalized_hostname <> region_slug || '.' || parent_host THEN RAISE EXCEPTION 'INVALID_SITE_HOSTNAME'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER site_hostname_guard
BEFORE INSERT OR UPDATE OF organization_id, domain_id, region_id, normalized_hostname ON public.sites
FOR EACH ROW EXECUTE FUNCTION indicate_private.site_hostname_guard();

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (8, 'public_delivery', 'public-delivery-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('3837f494d00c231fa3e3346a0c73cc1a7aad7a25e68fe1635f79c4b3305475a2', 1788114000000);

-- ----------------------------------------------------------------------
-- 20260903004000_production_boundaries
-- ----------------------------------------------------------------------
-- Phase 5 production-boundary hardening: RLS-safe discovery, durable recovery, and fenced invalidation.
ALTER TABLE public.domain_activation_attempts
  ADD COLUMN previous_hostname text,
  ADD COLUMN operation text NOT NULL DEFAULT 'activate',
  ADD COLUMN reconciliation_claim_token uuid,
  ADD COLUMN reconciliation_claim_expires_at timestamptz,
  ADD COLUMN sanitized_failure jsonb,
  ADD CONSTRAINT domain_activation_attempts_operation_check CHECK (operation IN ('activate', 'deactivate'));
CREATE INDEX domain_activation_attempts_claim_idx
  ON public.domain_activation_attempts (status, next_attempt_at, reconciliation_claim_expires_at);

CREATE OR REPLACE FUNCTION indicate_private.resolve_public_host(p_hostname text)
RETURNS TABLE (
  normalized_hostname text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  region_id uuid,
  routing_version integer,
  content_version integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT s.normalized_hostname, s.organization_id, s.domain_id, s.id,
         s.region_id, s.routing_version, s.content_version
  FROM public.sites s
  JOIN public.domains d
    ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.regions r
    ON r.organization_id = s.organization_id AND r.id = s.region_id
  WHERE s.normalized_hostname = p_hostname
    AND s.status = 'active'
    AND s.activation_state = 'active'
    AND d.status = 'active'
    AND (s.region_id IS NULL OR r.status = 'active')
  ORDER BY s.organization_id, s.id
  LIMIT 2
$$;
REVOKE ALL ON FUNCTION indicate_private.resolve_public_host(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_public_host(text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.is_pending_host(p_hostname text, p_attempt_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.domain_activation_attempts a
    JOIN public.sites s
      ON s.organization_id = a.organization_id AND s.id = a.site_id
    WHERE a.id = p_attempt_id
      AND a.hostname = p_hostname
      AND a.operation = 'activate'
      AND a.status IN ('pending', 'processing')
      AND a.activation_state IN ('pending', 'cloudflare_verified', 'vercel_associated')
      AND s.normalized_hostname = p_hostname
      AND s.status = 'inactive'
      AND s.activation_state = 'pending'
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.is_pending_host(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.is_pending_host(text, uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.is_previous_host_owned(
  p_organization_id uuid,
  p_site_id uuid,
  p_hostname text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.domain_activation_attempts a
    WHERE a.organization_id = p_organization_id
      AND a.site_id = p_site_id
      AND a.hostname = p_hostname
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.sites s
    WHERE s.normalized_hostname = p_hostname
      AND (s.organization_id, s.id) <> (p_organization_id, p_site_id)
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.is_previous_host_owned(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.is_previous_host_owned(uuid, uuid, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.claim_activation_attempts(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.domain_activation_attempts
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id
    FROM public.domain_activation_attempts
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.domain_activation_attempts attempt
  SET status = 'processing', reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at, updated_at = p_now
  FROM candidates
  WHERE attempt.organization_id = candidates.organization_id AND attempt.id = candidates.id
  RETURNING attempt.*;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_activation_attempts(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_activation_attempts(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.enable_cache_bypass_on_enqueue()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  INSERT INTO public.cache_bypasses(
    organization_id, site_id, bypass, version, reason, created_at, updated_at
  ) VALUES (
    NEW.organization_id, NEW.site_id, true, 1, 'invalidation_pending', NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true,
        version = public.cache_bypasses.version + 1,
        reason = 'invalidation_pending',
        updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.enable_cache_bypass_on_enqueue() FROM PUBLIC;
CREATE TRIGGER invalidation_tasks_enable_cache_bypass
AFTER INSERT ON public.invalidation_tasks
FOR EACH ROW EXECUTE FUNCTION indicate_private.enable_cache_bypass_on_enqueue();

CREATE OR REPLACE FUNCTION indicate_private.complete_invalidation(
  p_organization_id uuid,
  p_task_id uuid,
  p_claim_token uuid,
  p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = 'completed', reconciliation_claim_token = NULL,
      reconciliation_claim_expires_at = NULL, sanitized_failure = NULL, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  PERFORM 1
  FROM public.cache_bypasses
  WHERE organization_id = p_organization_id AND site_id = v_site_id
  FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1
    FROM public.invalidation_tasks
    WHERE organization_id = p_organization_id AND site_id = v_site_id
      AND status <> 'completed'
  ) THEN
    INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
    VALUES (p_organization_id, v_site_id, false, 1, 'invalidation_completed', p_now, p_now)
    ON CONFLICT (organization_id, site_id) DO UPDATE
      SET bypass = false, version = public.cache_bypasses.version + 1,
          reason = 'invalidation_completed', updated_at = p_now;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.complete_invalidation(uuid, uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.complete_invalidation(uuid, uuid, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.fail_invalidation(
  p_organization_id uuid,
  p_task_id uuid,
  p_claim_token uuid,
  p_failure jsonb,
  p_next_attempt_at timestamptz,
  p_terminal boolean,
  p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = CASE WHEN p_terminal THEN 'failed'::public.task_status ELSE 'pending'::public.task_status END,
      attempts = attempts + 1, next_attempt_at = p_next_attempt_at,
      reconciliation_claim_token = NULL, reconciliation_claim_expires_at = NULL,
      sanitized_failure = p_failure, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
  VALUES (p_organization_id, v_site_id, true, 1, 'invalidation_failed', p_now, p_now)
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true, version = public.cache_bypasses.version + 1,
        reason = 'invalidation_failed', updated_at = p_now;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION indicate_private.fail_invalidation(uuid, uuid, uuid, jsonb, timestamptz, boolean, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.fail_invalidation(uuid, uuid, uuid, jsonb, timestamptz, boolean, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (9, 'production_boundaries', 'production-boundaries-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('c3b768c21be4fc85681741599684e912ed94785a92760b4ef3bc77cd68d38151', 1788115000000);

-- ----------------------------------------------------------------------
-- 20260903004500_external_entrypoints
-- ----------------------------------------------------------------------
-- Phase 6 external entry points: credential metadata, durable Telegram conversations,
-- replay outcomes, and narrow platform-administration functions.
ALTER TABLE public.api_keys
  ADD COLUMN name text NOT NULL DEFAULT 'API key',
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT api_keys_version_positive CHECK (version > 0),
  ADD CONSTRAINT api_keys_bounded_identity CHECK (length(lookup_id) BETWEEN 16 AND 128 AND length(name) BETWEEN 1 AND 120);

ALTER TABLE public.telegram_identity_mappings
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT telegram_identity_mappings_version_positive CHECK (version > 0);

ALTER TABLE public.webhook_replay_claims
  ADD COLUMN body_digest text NOT NULL DEFAULT repeat('0', 64),
  ADD COLUMN outcome jsonb,
  ADD COLUMN processed_at timestamptz,
  ADD CONSTRAINT webhook_replay_claims_body_digest_check CHECK (length(body_digest) = 64);

CREATE TABLE public.telegram_conversations (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mapping_id uuid NOT NULL,
  telegram_user_id text NOT NULL,
  telegram_chat_id text NOT NULL,
  step text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_conversations_pk PRIMARY KEY (organization_id, telegram_chat_id, telegram_user_id),
  CONSTRAINT telegram_conversations_mapping_fk FOREIGN KEY (organization_id, mapping_id)
    REFERENCES public.telegram_identity_mappings(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT telegram_conversations_bounded_step CHECK (length(step) BETWEEN 1 AND 100)
);
CREATE INDEX telegram_conversations_expiry_idx ON public.telegram_conversations(expires_at);
ALTER TABLE public.telegram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.telegram_conversations
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_conversations TO indicate_runtime;

INSERT INTO public.permissions(id, organization_id, name, scope, description)
VALUES ('00000000-0000-4000-8000-000000006001', NULL, 'platform.customer.admin', 'platform', 'Administer customer Organizations and subscriptions')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION indicate_private.ensure_org_permissions(p_organization_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  INSERT INTO public.permissions(id, organization_id, name, scope, description)
  SELECT gen_random_uuid(), p_organization_id, value.name, 'organization'::public.permission_scope, value.description
  FROM (VALUES
    ('api_key.read', 'Read API key metadata'), ('api_key.manage', 'Issue, rotate, and revoke API keys'),
    ('telegram.manage', 'Manage Telegram identity mappings'), ('subscription.read', 'Read Organization subscription'),
    ('subscription.manage', 'Manage Organization subscription')
  ) AS value(name, description)
  ON CONFLICT DO NOTHING
$$;
REVOKE ALL ON FUNCTION indicate_private.ensure_org_permissions(uuid) FROM PUBLIC;
SELECT indicate_private.ensure_org_permissions(id) FROM public.organizations;

CREATE OR REPLACE FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text)
RETURNS TABLE (
  organization_id uuid, id uuid, lookup_id text, name text, salt text,
  verification_hash text, scopes text[], status public.api_key_status,
  predecessor_id uuid, expires_at timestamptz, last_used_at timestamptz,
  version integer, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT k.organization_id, k.id, k.lookup_id, k.name, k.salt,
         k.verification_hash, k.scopes, k.status, k.predecessor_id,
         k.expires_at, k.last_used_at, k.version, k.created_at, k.updated_at
  FROM public.api_keys k
  WHERE k.lookup_id = p_lookup_id
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.resolve_api_key_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_api_key_lookup(text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text)
RETURNS TABLE (
  mapping_id uuid, organization_id uuid, user_id uuid, role_id uuid,
  telegram_user_id text, telegram_chat_id text, permissions text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH eligible AS (
    SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
    FROM public.telegram_identity_mappings m
    JOIN public.memberships membership
      ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
     AND membership.role_id = m.role_id AND membership.status = 'active'
    JOIN public.roles r
      ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
    WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  ), single_mapping AS (
    SELECT * FROM eligible WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM single_mapping m
  LEFT JOIN public.role_permissions rp
    ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
$$;
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(text, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT organization_id FROM public.webhook_replay_claims
  WHERE source = p_source AND replay_id = p_replay_id
$$;
REVOKE ALL ON FUNCTION indicate_private.replay_claim_organization(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim_organization(text, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.claim_replay(
  p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text,
  p_received_at timestamptz, p_expires_at timestamptz
) RETURNS TABLE (
  created boolean, source text, replay_id text, organization_id uuid, body_digest text,
  status public.replay_claim_status, outcome jsonb, received_at timestamptz, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(source, replay_id, organization_id, body_digest, status, received_at, expires_at)
    VALUES (p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_expires_at)
    ON CONFLICT (source, replay_id) DO NOTHING
    RETURNING *
  )
  SELECT true, i.source, i.replay_id, i.organization_id, i.body_digest, i.status, i.outcome, i.received_at, i.expires_at FROM inserted i
  UNION ALL
  SELECT false, c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.finish_replay(
  p_source text, p_replay_id text, p_body_digest text, p_status public.replay_claim_status,
  p_outcome jsonb, p_now timestamptz
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  status public.replay_claim_status, outcome jsonb, received_at timestamptz, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH changed AS (
    UPDATE public.webhook_replay_claims
    SET status = p_status, outcome = p_outcome, processed_at = p_now
    WHERE source = p_source AND replay_id = p_replay_id AND body_digest = p_body_digest AND status = 'claimed'
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.has_platform_permission(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.status = 'active'
      AND p.scope = 'platform' AND p.name = p_permission
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_platform_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_platform_permission(uuid, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.has_tenant_permission(p_actor_id uuid, p_organization_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND p.name = p_permission
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.list_customers(p_actor_id uuid)
RETURNS TABLE (
  id uuid, name text, slug text, status public.record_status, customer_metadata jsonb,
  version integer, created_at timestamptz, updated_at timestamptz,
  subscription_plan text, subscription_status public.subscription_status,
  period_starts_at timestamptz, period_ends_at timestamptz, subscription_version integer,
  subscription_created_at timestamptz, subscription_updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.name, o.slug, o.status, o.customer_metadata, o.version, o.created_at, o.updated_at,
    s.plan, s.status, s.period_starts_at, s.period_ends_at, s.version, s.created_at, s.updated_at
  FROM public.organizations o LEFT JOIN public.subscriptions s ON s.organization_id = o.id
  ORDER BY o.name, o.id;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.list_customers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.list_customers(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.create_customer(
  p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text,
  p_metadata jsonb, p_subscription jsonb, p_now timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organizations(id, name, slug, status, customer_metadata, version, created_at, updated_at)
  VALUES (p_organization_id, p_name, p_slug, 'active', p_metadata, 1, p_now, p_now);
  PERFORM indicate_private.ensure_org_permissions(p_organization_id);
  IF p_subscription IS NOT NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_subscription->>'plan', (p_subscription->>'status')::public.subscription_status,
      (p_subscription->>'periodStartsAt')::timestamptz, (p_subscription->>'periodEndsAt')::timestamptz, 1, p_now, p_now);
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'cms', 'customer.create', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', 'active'), p_request_id, p_now);
END
$$;
REVOKE ALL ON FUNCTION indicate_private.create_customer(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.create_customer(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.update_customer(
  p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer,
  p_name text, p_slug text, p_status public.record_status, p_metadata jsonb, p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organizations SET name = p_name, slug = p_slug, status = p_status,
    customer_metadata = p_metadata, version = version + 1, updated_at = p_now
  WHERE id = p_organization_id AND version = p_expected_version;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'cms', 'customer.update', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status','customerMetadata'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', p_status, 'customerMetadata', p_metadata), p_request_id, p_now);
  RETURN true;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.update_customer(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.update_customer(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.update_subscription(
  p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer,
  p_plan text, p_status public.subscription_status, p_period_starts_at timestamptz,
  p_period_ends_at timestamptz, p_now timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.has_platform_permission(p_actor_id, 'platform.customer.admin');
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.has_tenant_permission(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'cms', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.update_subscription(uuid, text, uuid, integer, text, public.subscription_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.update_subscription(uuid, text, uuid, integer, text, public.subscription_status, timestamptz, timestamptz, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (10, 'external_entrypoints', 'external-entrypoints-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('a1d6d4028023fb4dabd9d3af61e7cd170276a2b4e40d2a93fa1224dfc0401f8b', 1788117000000);

-- ----------------------------------------------------------------------
-- 20260903005000_security_hardening
-- ----------------------------------------------------------------------
-- Phase 6 security hardening: isolate platform authority from tenant roles and make
-- replay outcomes recoverable through leased claims plus a durable prepared outcome.
CREATE TABLE public.platform_user_permissions (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE RESTRICT,
  provisioned_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_user_permissions_pk PRIMARY KEY (user_id, permission_id)
);
CREATE INDEX platform_user_permissions_user_idx ON public.platform_user_permissions(user_id);
REVOKE ALL ON public.platform_user_permissions FROM PUBLIC, indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.role_permission_scope_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.permissions p
    WHERE p.id = NEW.permission_id
      AND p.scope = 'organization'
      AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'tenant roles may grant only same-organization permissions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.role_permission_scope_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS role_permission_scope_guard ON public.role_permissions;
CREATE TRIGGER role_permission_scope_guard
BEFORE INSERT OR UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION indicate_private.role_permission_scope_guard();
DELETE FROM public.role_permissions rp
USING public.permissions p
WHERE p.id = rp.permission_id AND (p.scope <> 'organization' OR p.organization_id IS DISTINCT FROM rp.organization_id);

CREATE OR REPLACE FUNCTION indicate_private.provision_platform_permission(
  p_user_id uuid, p_permission text, p_provisioned_by text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE v_permission_id uuid;
BEGIN
  SELECT id INTO v_permission_id FROM public.permissions
  WHERE scope = 'platform' AND organization_id IS NULL AND name = p_permission;
  IF v_permission_id IS NULL OR length(trim(p_provisioned_by)) < 1 THEN
    RAISE EXCEPTION 'invalid platform permission provisioning request' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'active platform user required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.platform_user_permissions(user_id, permission_id, provisioned_by)
  VALUES (p_user_id, v_permission_id, p_provisioned_by)
  ON CONFLICT DO NOTHING;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.provision_platform_permission(uuid, text, text) FROM PUBLIC, indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.list_platform_permissions(p_user_id uuid)
RETURNS TABLE (name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF nullif(current_setting('app.actor_id', true), '')::uuid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'platform permission lookup denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.name
  FROM public.platform_user_permissions grant_row
  JOIN public.permissions p ON p.id = grant_row.permission_id
  JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
  WHERE grant_row.user_id = p_user_id AND p.scope = 'platform' AND p.organization_id IS NULL;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.list_platform_permissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.list_platform_permissions(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.has_platform_permission(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT indicate_private.current_verified_user_id() = p_actor_id
    AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
    AND EXISTS (
      SELECT 1
      FROM public.platform_user_permissions grant_row
      JOIN public.permissions p ON p.id = grant_row.permission_id
      JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
      WHERE grant_row.user_id = p_actor_id
        AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
    )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_platform_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_platform_permission(uuid, text) TO indicate_runtime;

ALTER TABLE public.webhook_replay_claims
  ADD COLUMN identity_binding_digest text,
  ADD COLUMN claim_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN business_receipt jsonb,
  ADD COLUMN pending_status public.replay_claim_status,
  ADD COLUMN lease_expires_at timestamptz,
  ADD COLUMN attempt_count integer NOT NULL DEFAULT 1,
  ADD COLUMN outcome_ready_at timestamptz;
UPDATE public.webhook_replay_claims
SET lease_expires_at = received_at,
    pending_status = CASE WHEN status IN ('processed', 'rejected') THEN status ELSE NULL END
WHERE lease_expires_at IS NULL;
ALTER TABLE public.webhook_replay_claims
  ALTER COLUMN lease_expires_at SET NOT NULL,
  ADD CONSTRAINT webhook_replay_claims_identity_binding_check CHECK (identity_binding_digest IS NULL OR length(identity_binding_digest) = 64),
  ADD CONSTRAINT webhook_replay_claims_attempt_count_check CHECK (attempt_count > 0),
  ADD CONSTRAINT webhook_replay_claims_pending_terminal_check CHECK (pending_status IS NULL OR pending_status IN ('processed', 'rejected'));
CREATE INDEX webhook_replay_claims_reconciliation_idx ON public.webhook_replay_claims(status, pending_status, lease_expires_at);

DROP FUNCTION IF EXISTS indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS indicate_private.finish_replay(text, text, text, public.replay_claim_status, jsonb, timestamptz);

CREATE FUNCTION indicate_private.claim_replay(
  p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text,
  p_received_at timestamptz, p_lease_expires_at timestamptz, p_expires_at timestamptz
) RETURNS TABLE (
  claim_kind text, source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(
      source, replay_id, organization_id, body_digest, status, received_at, lease_expires_at, expires_at
    ) VALUES (
      p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_lease_expires_at, p_expires_at
    ) ON CONFLICT (source, replay_id) DO NOTHING
    RETURNING *
  ), reclaimed AS (
    UPDATE public.webhook_replay_claims c
    SET lease_expires_at = p_lease_expires_at, claim_token = gen_random_uuid(), attempt_count = c.attempt_count + 1
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted)
      AND c.status = 'claimed' AND c.pending_status IS NULL AND c.business_receipt IS NULL
      AND c.lease_expires_at <= p_received_at AND c.expires_at > p_received_at
      AND c.body_digest = p_body_digest
      AND (p_organization_id IS NULL OR c.organization_id IS NULL OR c.organization_id = p_organization_id)
    RETURNING *
  ), selected AS (
    SELECT 'created'::text AS claim_kind, i.* FROM inserted i
    UNION ALL
    SELECT 'reclaimed'::text AS claim_kind, r.* FROM reclaimed r
    UNION ALL
    SELECT 'duplicate'::text AS claim_kind, c.* FROM public.webhook_replay_claims c
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM reclaimed)
  )
  SELECT s.claim_kind, s.source, s.replay_id, s.organization_id, s.body_digest,
    s.identity_binding_digest, s.claim_token, s.business_receipt, s.status, s.pending_status, s.outcome, s.received_at,
    s.lease_expires_at, s.attempt_count, s.expires_at
  FROM selected s LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_replay(text, text, uuid, text, timestamptz, timestamptz, timestamptz) TO indicate_runtime;

CREATE FUNCTION indicate_private.bind_replay_identity(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET organization_id = p_organization_id, identity_binding_digest = p_identity_binding_digest
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed'
      AND (c.organization_id IS NULL OR c.organization_id = p_organization_id)
      AND (c.identity_binding_digest IS NULL OR c.identity_binding_digest = p_identity_binding_digest)
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.bind_replay_identity(text, text, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.bind_replay_identity(text, text, text, uuid, uuid, text) TO indicate_runtime;

CREATE FUNCTION indicate_private.prepare_replay_outcome(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status public.replay_claim_status,
  p_outcome jsonb, p_now timestamptz
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF p_status NOT IN ('processed', 'rejected') THEN RETURN; END IF;
  RETURN QUERY
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET pending_status = p_status, outcome = p_outcome, outcome_ready_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed'
      AND (c.pending_status IS NULL OR (c.pending_status = p_status AND c.outcome = p_outcome))
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token
    AND c.status IN ('processed', 'rejected') AND c.outcome = p_outcome
    AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.prepare_replay_outcome(text, text, text, uuid, public.replay_claim_status, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.prepare_replay_outcome(text, text, text, uuid, public.replay_claim_status, jsonb, timestamptz) TO indicate_runtime;

CREATE FUNCTION indicate_private.finalize_replay(
  p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamptz
) RETURNS TABLE (
  source text, replay_id text, organization_id uuid, body_digest text,
  identity_binding_digest text, claim_token uuid, business_receipt jsonb, status public.replay_claim_status, pending_status public.replay_claim_status,
  outcome jsonb, received_at timestamptz, lease_expires_at timestamptz, attempt_count integer, expires_at timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET status = c.pending_status, pending_status = NULL, processed_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token
      AND c.status = 'claimed' AND c.pending_status IN ('processed', 'rejected') AND c.outcome IS NOT NULL
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token
    AND c.status IN ('processed', 'rejected') AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION indicate_private.finalize_replay(text, text, text, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.finalize_replay(text, text, text, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text)
RETURNS TABLE (
  mapping_id uuid, organization_id uuid, user_id uuid, role_id uuid,
  telegram_user_id text, telegram_chat_id text, permissions text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH eligible AS (
    SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
    FROM public.telegram_identity_mappings m
    JOIN public.memberships membership
      ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
     AND membership.role_id = m.role_id AND membership.status = 'active'
    JOIN public.roles r
      ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
    WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  ), single_mapping AS (
    SELECT * FROM eligible WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM single_mapping m
  LEFT JOIN public.role_permissions rp
    ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p
    ON p.id = rp.permission_id AND p.scope = 'organization' AND p.organization_id = m.organization_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
$$;
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(text, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.has_tenant_permission(p_actor_id uuid, p_organization_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
      AND p.scope = 'organization' AND p.organization_id = m.organization_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND p.name = p_permission
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_tenant_permission(uuid, uuid, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.capture_replay_business_receipt()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_replay_id text;
  v_body_digest text;
  v_claim_token uuid;
BEGIN
  IF NEW.request_id NOT LIKE 'telegram-replay:%' THEN RETURN NEW; END IF;
  v_replay_id := split_part(NEW.request_id, ':', 2);
  v_body_digest := split_part(NEW.request_id, ':', 3);
  BEGIN
    v_claim_token := split_part(NEW.request_id, ':', 4)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid replay fence' USING ERRCODE = '42501';
  END;
  IF length(v_body_digest) <> 64 OR split_part(NEW.request_id, ':', 5) <> '' OR NOT EXISTS (
    SELECT 1 FROM public.webhook_replay_claims claim
    WHERE claim.source = 'telegram' AND claim.replay_id = v_replay_id
      AND claim.body_digest = v_body_digest AND claim.claim_token = v_claim_token
      AND claim.status = 'claimed'
  ) THEN
    RAISE EXCEPTION 'stale replay worker' USING ERRCODE = '42501';
  END IF;
  IF NEW.outcome = 'succeeded' AND NEW.action IN ('article.create', 'article.sites.assign', 'media.activate', 'publication.request') THEN
    UPDATE public.webhook_replay_claims
    SET business_receipt = jsonb_build_object(
      'action', NEW.action, 'targetType', NEW.target_type, 'targetId', NEW.target_id,
      'after', coalesce(NEW.after, '{}'::jsonb), 'occurredAt', NEW.occurred_at
    )
    WHERE source = 'telegram' AND replay_id = v_replay_id
      AND body_digest = v_body_digest AND claim_token = v_claim_token AND status = 'claimed';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.capture_replay_business_receipt() FROM PUBLIC;
DROP TRIGGER IF EXISTS capture_replay_business_receipt ON public.audit_logs;
CREATE TRIGGER capture_replay_business_receipt
AFTER INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.capture_replay_business_receipt();

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (11, 'security_hardening', 'security-hardening-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('987a2378aab0e316808333f442443a5f94b1ee593932f46fd1fd0b0932cc8ae4', 1788118000000);

-- ----------------------------------------------------------------------
-- 20260903005500_strict_platform_authorization
-- ----------------------------------------------------------------------
-- Phase 6 authorization correction: platform checks must fail closed when the
-- transaction has no verified actor context. Provisioning remains owner-only.
CREATE OR REPLACE FUNCTION indicate_private.has_platform_permission(p_actor_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT COALESCE(
    indicate_private.current_verified_user_id() = p_actor_id
      AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
      AND EXISTS (
        SELECT 1
        FROM public.platform_user_permissions grant_row
        JOIN public.permissions p ON p.id = grant_row.permission_id
        JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
        WHERE grant_row.user_id = p_actor_id
          AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
      ),
    false
  )
$$;
REVOKE ALL ON FUNCTION indicate_private.has_platform_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.has_platform_permission(uuid, text) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (12, 'strict_platform_authorization', 'strict-platform-authorization-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4b4d4b75f140c83779d6b05875f63c961f87d35da06910f1eb27e18e57c4ea82', 1788119000000);

-- ----------------------------------------------------------------------
-- 20260903010000_readiness_discovery
-- ----------------------------------------------------------------------
-- Phase 7 production-readiness boundary: bounded exact-host discovery for the
-- NOBYPASSRLS runtime role without granting direct cross-tenant table access.
CREATE OR REPLACE FUNCTION indicate_private.discover_active_hosts(p_hostnames text[])
RETURNS TABLE (
  hostname text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  region_id uuid,
  region_external_key text,
  region_slug text,
  coherent boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  WITH requested(hostname) AS (
    SELECT DISTINCT normalized.hostname
    FROM unnest(
      CASE
        WHEN p_hostnames IS NOT NULL
          AND cardinality(p_hostnames) BETWEEN 1 AND 100
          AND array_position(p_hostnames, NULL) IS NULL
        THEN p_hostnames
        ELSE ARRAY[]::text[]
      END
    ) AS supplied(hostname)
    CROSS JOIN LATERAL (
      SELECT lower(trim(trailing '.' FROM supplied.hostname)) AS hostname
    ) normalized
    WHERE normalized.hostname = supplied.hostname
      AND octet_length(normalized.hostname) BETWEEN 1 AND 253
  )
  SELECT s.normalized_hostname,
         s.organization_id,
         s.domain_id,
         s.id,
         s.region_id,
         r.external_key,
         r.slug,
         true
  FROM requested requested_host
  JOIN public.sites s
    ON s.normalized_hostname = requested_host.hostname
  JOIN public.organizations o
    ON o.id = s.organization_id
  JOIN public.domains d
    ON d.organization_id = s.organization_id
   AND d.id = s.domain_id
  LEFT JOIN public.regions r
    ON r.organization_id = s.organization_id
   AND r.id = s.region_id
  WHERE o.status = 'active'
    AND d.status = 'active'
    AND s.status = 'active'
    AND s.activation_state = 'active'
    AND (
      (s.region_id IS NULL AND s.normalized_hostname = d.normalized_hostname)
      OR
      (s.region_id IS NOT NULL
       AND r.status = 'active'
       AND s.normalized_hostname = r.slug || '.' || d.normalized_hostname)
    )
  ORDER BY s.normalized_hostname, s.organization_id, s.id
$$;
REVOKE ALL ON FUNCTION indicate_private.discover_active_hosts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.discover_active_hosts(text[]) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (13, 'readiness_discovery', 'readiness-discovery-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('298c1fcb059c7e0919caf08343ebfadc2a89bd836f2d29e9e878fc215c48f483', 1788120000000);

-- ----------------------------------------------------------------------
-- 20260903010500_migration_body_digests
-- ----------------------------------------------------------------------
-- Phase 7 migration integrity hardening.
-- Canonical body digest algorithm: normalize CRLF to LF, replace only the
-- checksum literal in the migration's unique self-registration row with the
-- stable checksum sentinel, then SHA-256 the complete UTF-8 migration file.
-- Migration 0000 has no registration and hashes its complete normalized file.
-- Missing, malformed, or duplicate required registrations fail closed.
WITH reviewed(version, name, checksum) AS (
  VALUES
    (1, 'phase2_core_schema', 'sha256:764efddc6939f7f70b9b4785d34bd2c8fb9446a7776882a4f9a39258e0370c19'),
    (2, 'phase2_security', 'sha256:d187379d73d8530491c07291e03645d966c3502fd59003ee3d081487ccc33612'),
    (3, 'phase2_publisher_actor_constraints', 'sha256:b65dea61b09170247f44aacbe52d3a7c6687495b1e2318394635a0ee17fe004e'),
    (4, 'phase2_authorization_hardening', 'sha256:d636b41314ba61c3ef3c886b01a6ef9e020614914cb8a752055167a6095dfc33'),
    (5, 'phase3_verified_user_context', 'sha256:ad79ad7685de14a73868c2403a78c6a5d3e495da33737bc98f197b18fe8219df'),
    (6, 'phase3_discovery_outcome_timestamp', 'sha256:10883f849abef3ddb2fcddd5a220f341203bdcf4485b7091f6f94d986071473c'),
    (7, 'phase4_media_publication_runtime', 'sha256:7390ee7325ab9676609742ec9945df0964c3e96f6a7f075d35d61dd9b7c824f8'),
    (8, 'phase5_public_delivery', 'sha256:e36dc3ee32ca440b97f0a0e6692b6e05b30206dd57cef78e16a69159f251b7dd'),
    (9, 'phase5_production_boundaries', 'sha256:70bd40399a4cf9758e9570c534420fc51cc3e87d2d3117503d9328f827540159'),
    (10, 'phase6_external_entrypoints', 'sha256:cb5c138af7c4182294bc54aee08134315c3e86517606ed462c254904f30d1ecd'),
    (11, 'phase6_security_hardening', 'sha256:8d33e5da644155416d28567a3992444834bb88613ab3c3457e8fca231fcebf96'),
    (12, 'phase6_strict_platform_authorization', 'sha256:0e9e078d1aec2aec90325ac809cc77aa99c62710322547b35be8191a1079042a'),
    (13, 'phase7_readiness_discovery', 'sha256:0fc0a7777f7e96a3dc1167b2f897fe3ca983c45d347352b2fa7fb532aca63993')
)
UPDATE public.indicate_schema_migrations applied
SET checksum = reviewed.checksum
FROM reviewed
WHERE applied.version = reviewed.version
  AND applied.name = reviewed.name;

DO $$
DECLARE matched integer;
BEGIN
  SELECT count(*) INTO matched
  FROM public.indicate_schema_migrations applied
  JOIN (VALUES
    (1, 'phase2_core_schema', 'sha256:764efddc6939f7f70b9b4785d34bd2c8fb9446a7776882a4f9a39258e0370c19'),
    (2, 'phase2_security', 'sha256:d187379d73d8530491c07291e03645d966c3502fd59003ee3d081487ccc33612'),
    (3, 'phase2_publisher_actor_constraints', 'sha256:b65dea61b09170247f44aacbe52d3a7c6687495b1e2318394635a0ee17fe004e'),
    (4, 'phase2_authorization_hardening', 'sha256:d636b41314ba61c3ef3c886b01a6ef9e020614914cb8a752055167a6095dfc33'),
    (5, 'phase3_verified_user_context', 'sha256:ad79ad7685de14a73868c2403a78c6a5d3e495da33737bc98f197b18fe8219df'),
    (6, 'phase3_discovery_outcome_timestamp', 'sha256:10883f849abef3ddb2fcddd5a220f341203bdcf4485b7091f6f94d986071473c'),
    (7, 'phase4_media_publication_runtime', 'sha256:7390ee7325ab9676609742ec9945df0964c3e96f6a7f075d35d61dd9b7c824f8'),
    (8, 'phase5_public_delivery', 'sha256:e36dc3ee32ca440b97f0a0e6692b6e05b30206dd57cef78e16a69159f251b7dd'),
    (9, 'phase5_production_boundaries', 'sha256:70bd40399a4cf9758e9570c534420fc51cc3e87d2d3117503d9328f827540159'),
    (10, 'phase6_external_entrypoints', 'sha256:cb5c138af7c4182294bc54aee08134315c3e86517606ed462c254904f30d1ecd'),
    (11, 'phase6_security_hardening', 'sha256:8d33e5da644155416d28567a3992444834bb88613ab3c3457e8fca231fcebf96'),
    (12, 'phase6_strict_platform_authorization', 'sha256:0e9e078d1aec2aec90325ac809cc77aa99c62710322547b35be8191a1079042a'),
    (13, 'phase7_readiness_discovery', 'sha256:0fc0a7777f7e96a3dc1167b2f897fe3ca983c45d347352b2fa7fb532aca63993')
  ) reviewed(version, name, checksum)
    ON applied.version = reviewed.version
   AND applied.name = reviewed.name
   AND applied.checksum = reviewed.checksum;
  IF matched <> 13 THEN
    RAISE EXCEPTION 'historical migration manifest mismatch';
  END IF;
END
$$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (14, 'migration_body_digests', 'sha256:1c63d8dc80a2f8364564e264da18055980a178d65043861ff9f4d8ed99365fc9');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('968a24224fb29a036a3fe56866ab11d6204c732243864353af18ecfa34500dcc', 1788121000000);

-- ----------------------------------------------------------------------
-- 20260903011000_updated_at_integrity_guard
-- ----------------------------------------------------------------------
-- Freshness guard for updated_at.
--
-- Before this migration updated_at was maintained only by application code and
-- SQL functions. Any direct UPDATE that omitted the column silently left a stale
-- timestamp, and nothing in the database refused it.
--
-- The guard deliberately does not force now() unconditionally: this codebase
-- injects an explicit clock (updated_at = p_now) so tests stay deterministic and
-- reconcilers can record the instant they claimed work. Overwriting those values
-- would destroy that control. The trigger therefore only fills the column when
-- the writer left it untouched, so explicit values survive and omissions cannot.
--
-- Triggers are attached by enumerating live columns rather than a hand-written
-- table list, so no table with updated_at can be missed now or later, and the
-- final assertion fails the migration closed if any table remains uncovered.
CREATE OR REPLACE FUNCTION indicate_private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION indicate_private.touch_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.touch_updated_at() TO indicate_runtime;

DO $guard$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT columns.table_name AS name
      FROM information_schema.columns
      JOIN information_schema.tables
        ON tables.table_schema = columns.table_schema
       AND tables.table_name = columns.table_name
     WHERE columns.table_schema = 'public'
       AND columns.column_name = 'updated_at'
       AND tables.table_type = 'BASE TABLE'
     ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$guard$;

DO $verify$
DECLARE uncovered text;
BEGIN
  SELECT string_agg(candidate.name, ', ' ORDER BY candidate.name) INTO uncovered
    FROM (
      SELECT columns.table_name AS name
        FROM information_schema.columns
        JOIN information_schema.tables
          ON tables.table_schema = columns.table_schema
         AND tables.table_name = columns.table_name
       WHERE columns.table_schema = 'public'
         AND columns.column_name = 'updated_at'
         AND tables.table_type = 'BASE TABLE'
    ) candidate
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_trigger
       JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid
       JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public'
        AND pg_class.relname = candidate.name
        AND pg_trigger.tgname = left(candidate.name || '_touch_updated_at', 63)
        AND NOT pg_trigger.tgisinternal
   );
  IF uncovered IS NOT NULL THEN
    RAISE EXCEPTION 'updated_at guard missing for: %', uncovered;
  END IF;
END
$verify$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (15, 'updated_at_integrity_guard', 'sha256:f2dbac5ae8a410d26f6dd4a55219432416f9b87870eff0b44f9b94de6cedbf39');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('2955fb76c0c3ab351091158cb64cdeb0a9717bee242d95d64164eab87071579e', 1788122000000);

-- ----------------------------------------------------------------------
-- 20260903011500_operational_table_read_policies
-- ----------------------------------------------------------------------
-- Restore the schema gate's read path on Supabase.
--
-- Supabase installs an event trigger named ensure_rls on ddl_command_end that
-- enables row level security on every table created in the public schema. Two of
-- this schema's tables are operational rather than tenant-scoped and therefore
-- never received a policy in 0001: indicate_schema_migrations and
-- migration_gate_events. Row level security with no policy denies every row, so
-- the GRANT SELECT issued in 0001 became inert and the runtime role observed an
-- empty ledger.
--
-- The visible consequence was that `db:check` reported actualVersion null and the
-- production readiness schema_version check could never pass, while remaining
-- green in CI because vanilla PostgreSQL has no such event trigger. The defect was
-- therefore invisible on every platform except the one that matters.
--
-- Both tables hold no tenant data, and 0001 already revoked INSERT, UPDATE,
-- DELETE, and TRUNCATE on them from indicate_runtime, so a read-only policy
-- scoped to that role restores the gate without widening write authority. Row
-- level security stays enabled so the tables keep failing closed for every other
-- role, including anon and authenticated.
DROP POLICY IF EXISTS indicate_runtime_read ON public.indicate_schema_migrations;
CREATE POLICY indicate_runtime_read ON public.indicate_schema_migrations
  FOR SELECT TO indicate_runtime USING (true);

DROP POLICY IF EXISTS indicate_runtime_read ON public.migration_gate_events;
CREATE POLICY indicate_runtime_read ON public.migration_gate_events
  FOR SELECT TO indicate_runtime USING (true);

-- Guard against the same class of defect returning. Any future public table that
-- the runtime role can select from must either carry a policy or lose the grant,
-- otherwise its reads silently return nothing.
DO $verify$
DECLARE unreadable text;
BEGIN
  SELECT string_agg(candidate.relname, ', ' ORDER BY candidate.relname) INTO unreadable
    FROM (
      SELECT c.oid, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relrowsecurity
         AND has_table_privilege('indicate_runtime', c.oid, 'SELECT')
    ) candidate
   WHERE NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = candidate.oid);
  IF unreadable IS NOT NULL THEN
    RAISE EXCEPTION 'row level security denies every row for indicate_runtime on: %', unreadable;
  END IF;
END
$verify$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (16, 'operational_table_read_policies', 'sha256:aeb5fcff577a43bdd81ccf7ff767e838d2cc7c0ac0a35f1306b137b042f3a599');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('849fd713446fbd8b7857206bd00081c039e0a54fe1ab3e960d0574fa2b17323d', 1788123000000);

-- ----------------------------------------------------------------------
-- 20260903012000_data_api_and_index_hardening
-- ----------------------------------------------------------------------
-- Close the Supabase Data API surface, correct the updated_at guard, and index
-- the foreign keys that had no usable index.
--
-- 1. Data API exposure.
--
-- Supabase grants table privileges to anon and authenticated by default so that
-- PostgREST can serve the Data API. This application never uses PostgREST: every
-- query runs through Drizzle as indicate_runtime over the pooled connection, and
-- the Supabase client is used only for Auth, which lives in the auth schema with
-- its own roles. The REVOKE ALL ON SCHEMA public FROM PUBLIC issued in 0001 does
-- not remove explicit grants, so anon retained SELECT on all tables.
--
-- That mattered because thirty-two policies were created without a TO clause and
-- therefore apply to every role, and two of their predicates are satisfied without
-- any tenant context:
--   webhook_replay_claims  USING (organization_id IS NULL OR ...)
--   permissions            USING (scope = 'platform' OR ...)
-- With the publishable anon key present in the browser bundle by design, platform
-- scoped rows in those tables were readable by anyone who read the bundle,
-- including body and identity digests and webhook outcomes.
--
-- Revoking the grants removes the surface outright rather than restating thirty-two
-- policies, and it keeps working for tables added later through default privileges.
-- Role names are resolved dynamically because vanilla PostgreSQL, which CI uses,
-- has no anon or authenticated role.
DO $revoke$
DECLARE present text[];
BEGIN
  SELECT coalesce(array_agg(quote_ident(rolname)), ARRAY[]::text[]) INTO present
    FROM pg_roles WHERE rolname IN ('anon', 'authenticated');
  IF cardinality(present) = 0 THEN
    RAISE NOTICE 'no Supabase Data API roles present; nothing to revoke';
    RETURN;
  END IF;

  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format('REVOKE ALL ON SCHEMA public FROM %s', array_to_string(present, ', '));
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %s',
    current_user, array_to_string(present, ', ')
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %s',
    current_user, array_to_string(present, ', ')
  );
END
$revoke$;

-- 2. updated_at guard correctness.
--
-- 0014 filled updated_at whenever NEW.updated_at matched OLD.updated_at. That
-- predicate cannot tell "the writer omitted the column" from "the writer wrote the
-- same value it already had", because PostgreSQL copies unlisted columns into NEW.
-- An idempotent rewrite that sets updated_at = p_now twice with the same p_now
-- therefore received a real now() on the second write, defeating the injected clock
-- the guard was written to preserve.
--
-- Adding WHEN (OLD.* IS DISTINCT FROM NEW.*) means a write that changes nothing
-- fires nothing, so a repeated identical write leaves the timestamp untouched.
DO $reattach$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT columns.table_name AS name
      FROM information_schema.columns
      JOIN information_schema.tables
        ON tables.table_schema = columns.table_schema
       AND tables.table_name = columns.table_name
     WHERE columns.table_schema = 'public'
       AND columns.column_name = 'updated_at'
       AND tables.table_type = 'BASE TABLE'
     ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$reattach$;

-- 3. Foreign keys with no usable index.
--
-- PostgreSQL indexes the referenced side of a foreign key, never the referencing
-- side. These four had no index whose leading column matched the constraint, so
-- every delete or key update on the parent forced a sequential scan on the child.
-- The two permissions indexes that exist are partial and cannot serve a general
-- referential check.
CREATE INDEX IF NOT EXISTS permissions_organization_idx
  ON public.permissions(organization_id);
CREATE INDEX IF NOT EXISTS platform_user_permissions_permission_idx
  ON public.platform_user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_idx
  ON public.role_permissions(organization_id, permission_id);
CREATE INDEX IF NOT EXISTS webhook_replay_claims_organization_idx
  ON public.webhook_replay_claims(organization_id);

-- 4. Verification.
--
-- The row level security assertion introduced in 0015 only proved that a policy
-- existed. A table carrying nothing but an INSERT policy, or a policy scoped to a
-- different role, satisfied it while still denying every read to indicate_runtime.
-- This form requires a permissive policy that covers SELECT and either applies to
-- every role or names indicate_runtime.
DO $verify$
DECLARE unreadable text;
DECLARE exposed text;
BEGIN
  SELECT string_agg(candidate.relname, ', ' ORDER BY candidate.relname) INTO unreadable
    FROM (
      SELECT c.oid, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relrowsecurity
         AND has_table_privilege('indicate_runtime', c.oid, 'SELECT')
    ) candidate
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_policy p
      WHERE p.polrelid = candidate.oid
        AND p.polpermissive
        AND p.polcmd IN ('r', '*')
        AND (p.polroles = '{0}' OR 'indicate_runtime'::regrole::oid = ANY(p.polroles))
   );
  IF unreadable IS NOT NULL THEN
    RAISE EXCEPTION 'no permissive SELECT policy applies to indicate_runtime on: %', unreadable;
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO exposed
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.rolname IN ('anon', 'authenticated')
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND has_table_privilege(r.oid, c.oid, 'SELECT');
  IF exposed IS NOT NULL THEN
    RAISE EXCEPTION 'Data API roles retain SELECT on: %', exposed;
  END IF;
END
$verify$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (17, 'data_api_and_index_hardening', 'sha256:4f9a3e1ea036b75199ddc55863b0c78e7a9831e71617b329d51ea015721e5a89');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('109af0132f9eb215333e457b892403bdb87e0027ea88b276832ddef4907b1e53', 1788124000000);

-- ----------------------------------------------------------------------
-- 20260903012500_coordination_timestamps_and_search_indexes
-- ----------------------------------------------------------------------
-- Close three measured gaps: an unusable foreign-key index, coordination tables
-- with no change timestamp, and an unindexable public search path.
--
-- 1. Foreign key index correction.
--
-- 0016 created role_permissions(organization_id, permission_id) to cover the
-- foreign key on permission_id. A composite index only serves a constraint whose
-- first column matches the index's first column, so that index led with the wrong
-- column and the constraint remained uncovered. Every delete or key update on
-- permissions still forced a sequential scan on role_permissions.
CREATE INDEX IF NOT EXISTS role_permissions_permission_lookup_idx
  ON public.role_permissions(permission_id);

-- 2. Change timestamps on coordination tables.
--
-- These three are among the most frequently written tables in the system:
-- webhook_replay_claims moves through status, pending_status, lease_expires_at,
-- attempt_count and processed_at; seed_runs through status and completed_at;
-- publication_transition_receipts through acknowledged_at and its reconciliation
-- claim fields. None recorded when a row last changed, so the guard added in 0014
-- had no column to protect and operators had no way to spot a stalled lease.
--
-- Existing rows adopt the best durable signal available rather than the migration
-- instant, so a backfilled value never claims a change that did not happen.
ALTER TABLE public.webhook_replay_claims
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.webhook_replay_claims
   SET updated_at = COALESCE(processed_at, lease_expires_at, received_at, updated_at);

ALTER TABLE public.seed_runs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.seed_runs
   SET updated_at = COALESCE(completed_at, started_at, updated_at);

ALTER TABLE public.publication_transition_receipts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.publication_transition_receipts
   SET updated_at = COALESCE(acknowledged_at, created_at, updated_at);

-- Re-attach the freshness guard so the three new columns are covered. Enumerating
-- live columns keeps this correct without a hand-written table list.
DO $reattach$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT columns.table_name AS name
      FROM information_schema.columns
      JOIN information_schema.tables
        ON tables.table_schema = columns.table_schema
       AND tables.table_name = columns.table_name
     WHERE columns.table_schema = 'public'
       AND columns.column_name = 'updated_at'
       AND tables.table_type = 'BASE TABLE'
     ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION indicate_private.touch_updated_at()',
      left(target.name || '_touch_updated_at', 63),
      target.name
    );
  END LOOP;
END
$reattach$;

-- 3. Indexable public search.
--
-- The public search surface matches articles.title and articles.body with ILIKE
-- and a leading wildcard. A leading wildcard defeats every btree index, and
-- articles.body holds full article text, so each query scanned the table. The
-- surface is unauthenticated, which makes the cost reachable without an account.
--
-- Trigram GIN indexes serve that predicate. The extension schema differs between
-- Supabase, which keeps extensions out of public, and vanilla PostgreSQL as used
-- in CI, so both the extension and the operator class are resolved dynamically
-- instead of assuming one layout.
DO $extension$
BEGIN
  IF to_regnamespace('extensions') IS NOT NULL THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions';
  ELSE
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
  END IF;
END
$extension$;

DO $search$
DECLARE opclass_schema text;
BEGIN
  SELECT namespace.nspname INTO opclass_schema
    FROM pg_opclass opclass
    JOIN pg_namespace namespace ON namespace.oid = opclass.opcnamespace
   WHERE opclass.opcname = 'gin_trgm_ops'
   LIMIT 1;
  IF opclass_schema IS NULL THEN
    RAISE EXCEPTION 'pg_trgm operator class unavailable after extension creation';
  END IF;
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS articles_title_trgm_idx ON public.articles USING gin (title %I.gin_trgm_ops)',
    opclass_schema
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS articles_body_trgm_idx ON public.articles USING gin (body %I.gin_trgm_ops)',
    opclass_schema
  );
END
$search$;

-- Verification. Every foreign key must now have an index whose leading column
-- matches the constraint's leading column, and the three new columns must carry
-- the freshness guard.
DO $verify$
DECLARE uncovered text;
DECLARE unguarded text;
BEGIN
  SELECT string_agg(format('%s(%s)', child.relname, child.attname), ', ') INTO uncovered
    FROM (
      SELECT constraint_class.relname, attribute.attname
        FROM pg_constraint constraint_row
        JOIN pg_class constraint_class ON constraint_class.oid = constraint_row.conrelid
        JOIN pg_namespace constraint_namespace ON constraint_namespace.oid = constraint_class.relnamespace
        JOIN pg_attribute attribute
          ON attribute.attrelid = constraint_row.conrelid
         AND attribute.attnum = constraint_row.conkey[1]
       WHERE constraint_row.contype = 'f'
         AND constraint_namespace.nspname = 'public'
         AND NOT EXISTS (
           SELECT 1 FROM pg_index index_row
            WHERE index_row.indrelid = constraint_row.conrelid
              AND index_row.indkey[0] = constraint_row.conkey[1]
              AND index_row.indpred IS NULL
         )
    ) child;
  IF uncovered IS NOT NULL THEN
    RAISE EXCEPTION 'foreign keys without a usable index: %', uncovered;
  END IF;

  SELECT string_agg(candidate.name, ', ' ORDER BY candidate.name) INTO unguarded
    FROM (VALUES ('webhook_replay_claims'), ('seed_runs'), ('publication_transition_receipts')) AS candidate(name)
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_trigger trigger_row
       JOIN pg_class trigger_class ON trigger_class.oid = trigger_row.tgrelid
      WHERE trigger_class.relname = candidate.name
        AND trigger_row.tgname = left(candidate.name || '_touch_updated_at', 63)
        AND NOT trigger_row.tgisinternal
   );
  IF unguarded IS NOT NULL THEN
    RAISE EXCEPTION 'updated_at guard missing for: %', unguarded;
  END IF;
END
$verify$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (18, 'coordination_timestamps_and_search_indexes', 'sha256:18aed7e6f31f9dcc0d2c66571661968d921e6c924ae112d295aa2fd0628ed130');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('24482cc2902d1b109558d4ffdad6e44037efb7beca5d71f17bd6fad8d42d9bcb', 1788125000000);

-- ----------------------------------------------------------------------
-- 20260903013000_runtime_config_core
-- ----------------------------------------------------------------------
-- Runtime config core tables and enums (expand migration, additive).
-- Enums finite; configuration versions positive; singleton guards follow later.

CREATE TYPE public.runtime_config_environment AS ENUM ('development', 'test', 'production');
CREATE TYPE public.runtime_config_mutation_kind AS ENUM (
  'shared_deployment_config', 'media_policy', 'publication_policy', 'webhook_policy',
  'cache_policy', 'rate_limit_policy', 'domain_provider_mapping', 'site_settings'
);
CREATE TYPE public.rate_limit_endpoint_class AS ENUM ('mutation', 'webhook', 'public_read');

CREATE TABLE public.runtime_config_revisions (
  version bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  environment public.runtime_config_environment NOT NULL,
  committed_at timestamptz NOT NULL,
  mutation_kind public.runtime_config_mutation_kind NOT NULL
);
CREATE INDEX runtime_config_revisions_environment_idx ON public.runtime_config_revisions (environment);

CREATE TABLE public.shared_deployment_config (
  id text PRIMARY KEY,
  supabase_project_ref text NOT NULL,
  cloudflare_account_id text NOT NULL,
  vercel_project_id text NOT NULL,
  vercel_team_id text NOT NULL,
  vercel_production_target_hostname text NOT NULL,
  r2_account_id text NOT NULL,
  r2_bucket_name text NOT NULL,
  upstash_redis_resource_id text NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT shared_deployment_config_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT shared_deployment_config_version_positive CHECK (version > 0)
);

CREATE TABLE public.media_policy (
  id text PRIMARY KEY,
  allowed_mime_types text[] NOT NULL,
  max_object_bytes integer NOT NULL,
  upload_authorization_seconds integer NOT NULL,
  read_authorization_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT media_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT media_policy_version_positive CHECK (version > 0),
  CONSTRAINT media_policy_max_bytes_positive CHECK (max_object_bytes > 0),
  CONSTRAINT media_policy_upload_positive CHECK (upload_authorization_seconds > 0),
  CONSTRAINT media_policy_read_positive CHECK (read_authorization_seconds > 0),
  CONSTRAINT media_policy_mimes_nonempty CHECK (cardinality(allowed_mime_types) > 0)
);

CREATE TABLE public.publication_policy (
  id text PRIMARY KEY,
  max_attempts integer NOT NULL,
  retry_delays_seconds integer[] NOT NULL,
  lease_seconds integer NOT NULL,
  batch_size integer NOT NULL,
  function_deadline_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT publication_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT publication_policy_max_attempts_bounds CHECK (max_attempts BETWEEN 1 AND 10),
  CONSTRAINT publication_policy_lease_bounds CHECK (lease_seconds BETWEEN 10 AND 300),
  CONSTRAINT publication_policy_batch_bounds CHECK (batch_size BETWEEN 1 AND 100),
  CONSTRAINT publication_policy_deadline_bounds CHECK (function_deadline_seconds BETWEEN 10 AND 300),
  CONSTRAINT publication_policy_retry_count CHECK (cardinality(retry_delays_seconds) BETWEEN 1 AND 9),
  CONSTRAINT publication_policy_retry_le_attempts CHECK (cardinality(retry_delays_seconds) <= max_attempts - 1),
  CONSTRAINT publication_policy_version_positive CHECK (version > 0)
);

CREATE TABLE public.webhook_policy (
  id text PRIMARY KEY,
  freshness_seconds integer NOT NULL,
  replay_retention_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT webhook_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT webhook_policy_freshness_bounds CHECK (freshness_seconds BETWEEN 1 AND 900),
  CONSTRAINT webhook_policy_replay_bounds CHECK (replay_retention_seconds BETWEEN 1 AND 86400),
  CONSTRAINT webhook_policy_replay_ge_freshness CHECK (replay_retention_seconds >= freshness_seconds),
  CONSTRAINT webhook_policy_version_positive CHECK (version > 0)
);

CREATE TABLE public.cache_policy (
  id text PRIMARY KEY,
  public_cache_seconds integer NOT NULL,
  cache_version integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT cache_policy_id_singleton CHECK (id = 'singleton'),
  CONSTRAINT cache_policy_public_cache_bounds CHECK (public_cache_seconds BETWEEN 0 AND 3600),
  CONSTRAINT cache_policy_cache_version_positive CHECK (cache_version > 0),
  CONSTRAINT cache_policy_version_positive CHECK (version > 0)
);

CREATE TABLE public.rate_limit_policies (
  endpoint_class public.rate_limit_endpoint_class PRIMARY KEY,
  allowance integer NOT NULL,
  window_seconds integer NOT NULL,
  version integer NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT rate_limit_policies_allowance_positive CHECK (allowance > 0),
  CONSTRAINT rate_limit_policies_window_bounds CHECK (window_seconds BETWEEN 1 AND 3600),
  CONSTRAINT rate_limit_policies_version_positive CHECK (version > 0)
);

-- Rate-limit allowance caps per endpoint class (hard safety caps).
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_mutation_cap CHECK (
    endpoint_class <> 'mutation' OR allowance <= 1000
  );
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_webhook_cap CHECK (
    endpoint_class <> 'webhook' OR allowance <= 2000
  );
ALTER TABLE public.rate_limit_policies
  ADD CONSTRAINT rate_limit_policies_public_read_cap CHECK (
    endpoint_class <> 'public_read' OR allowance <= 10000
  );

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (19, 'runtime_config_core', 'runtime-config-core-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f206704cc04ffdbb4d4aa7815e66340b07ff6444d9309ec6a325102a0d80a34b', 1788318971869);

-- ----------------------------------------------------------------------
-- 20260903013500_runtime_config_audit_invalidation
-- ----------------------------------------------------------------------
-- Runtime config audit log and durable invalidation intents.
-- Audit is append-only (trigger + grant revokes below); invalidation supports
-- fenced claim/complete/fail reconcilers (claim token columns).

CREATE TYPE public.config_audit_actor_type AS ENUM ('user', 'api_key', 'telegram', 'system', 'migration');
CREATE TYPE public.config_audit_outcome AS ENUM ('succeeded', 'denied', 'conflicted', 'failed');
CREATE TYPE public.invalidation_partition_kind AS ENUM ('shared', 'domain', 'site', 'policy', 'all');

CREATE TABLE public.runtime_config_audit_logs (
  id uuid PRIMARY KEY,
  organization_id uuid,
  actor_type public.config_audit_actor_type NOT NULL,
  actor_id uuid,
  environment public.runtime_config_environment NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  expected_version integer,
  resulting_version integer,
  changed_fields text[] NOT NULL,
  outcome public.config_audit_outcome NOT NULL,
  request_id text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX runtime_config_audit_org_time_idx ON public.runtime_config_audit_logs (organization_id, occurred_at);

CREATE TABLE public.runtime_config_invalidation_intents (
  id uuid PRIMARY KEY,
  runtime_revision bigint NOT NULL REFERENCES public.runtime_config_revisions (version) ON DELETE RESTRICT,
  environment public.runtime_config_environment NOT NULL,
  partition_kind public.invalidation_partition_kind NOT NULL,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  claim_token uuid,
  claim_expires_at timestamptz,
  failure_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_config_invalidation_attempts_nonnegative CHECK (attempts >= 0),
  CONSTRAINT runtime_config_invalidation_unique UNIQUE (runtime_revision, partition_kind, organization_id, domain_id, site_id)
);
CREATE INDEX runtime_config_invalidation_due_idx ON public.runtime_config_invalidation_intents (status, next_attempt_at);

-- Append-only guard on configuration audit; mirrors the audit_logs pattern.
CREATE OR REPLACE FUNCTION indicate_private.reject_config_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RAISE EXCEPTION 'configuration audit logs are append-only' USING ERRCODE = '42501';
END
$$;
CREATE TRIGGER runtime_config_audit_logs_append_only_guard
BEFORE UPDATE OR DELETE ON public.runtime_config_audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_config_audit_mutation();

-- Revoke mutation rights on shared tables; reads/writes go through the
-- security-definer functions (added in 0022). Tenant-scoped audit/invalidation
-- rows remain RLS-protected via grant + forced policy.
REVOKE ALL ON TABLE public.runtime_config_audit_logs, public.runtime_config_invalidation_intents
FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.runtime_config_audit_logs,
  public.runtime_config_invalidation_intents FROM indicate_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.runtime_config_audit_logs,
  public.runtime_config_invalidation_intents TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (20, 'runtime_config_audit_invalidation', 'runtime-config-audit-invalidation-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('fabb8acb0d1b6c2ce6f3ab3dcf0cafca0390bec91a378f7a83fceecaa6b5889f', 1788318972869);

-- ----------------------------------------------------------------------
-- 20260903014000_runtime_config_rollout
-- ----------------------------------------------------------------------
-- Rollout tables: immutable release manifest, explicit Domain-to-zone mapping,
-- idempotent backfill accounting, and sanitized parity evidence. Used by the
-- deferred parity/cutover tooling; added now so the schema evolves forward-only
-- before behavior depends on it.

CREATE TABLE public.runtime_config_release_manifests (
  id uuid PRIMARY KEY,
  grammar_version integer NOT NULL,
  parity_start timestamptz NOT NULL,
  parity_end timestamptz NOT NULL,
  legacy_source_version text NOT NULL,
  expected_source_count integer NOT NULL,
  target_schema_version integer NOT NULL,
  candidate_app_version text NOT NULL,
  rollback_app_version text NOT NULL,
  rollback_schema_min integer NOT NULL,
  rollback_schema_max integer NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_config_release_manifests_grammar_positive CHECK (grammar_version > 0),
  CONSTRAINT runtime_config_release_manifests_source_positive CHECK (expected_source_count > 0),
  CONSTRAINT runtime_config_release_manifests_parity_window CHECK ((parity_end - parity_start) <= interval '7 days'),
  CONSTRAINT runtime_config_release_manifests_schema_bounds CHECK (rollback_schema_max >= rollback_schema_min)
);

CREATE TABLE public.runtime_config_release_domain_zones (
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  domain_id uuid NOT NULL,
  zone_id text NOT NULL,
  PRIMARY KEY (manifest_id, domain_id),
  CONSTRAINT runtime_config_release_domain_zones_zone_unique UNIQUE (zone_id)
);

CREATE TABLE public.runtime_config_backfill_runs (
  id uuid PRIMARY KEY,
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  source_version text NOT NULL,
  schema_version integer NOT NULL,
  created_count integer NOT NULL,
  updated_count integer NOT NULL,
  unchanged_count integer NOT NULL,
  conflicted_count integer NOT NULL,
  failed_count integer NOT NULL,
  processed_count integer NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  CONSTRAINT runtime_config_backfill_counts_nonnegative CHECK (
    created_count >= 0 AND updated_count >= 0 AND unchanged_count >= 0 AND conflicted_count >= 0 AND failed_count >= 0 AND processed_count >= 0
  ),
  CONSTRAINT runtime_config_backfill_sum CHECK (
    created_count + updated_count + unchanged_count + conflicted_count + failed_count = processed_count
  )
);

CREATE TABLE public.runtime_config_parity_evidence (
  id uuid PRIMARY KEY,
  manifest_id uuid NOT NULL REFERENCES public.runtime_config_release_manifests (id) ON DELETE CASCADE,
  check_name text NOT NULL,
  source_version text NOT NULL,
  persisted_version integer NOT NULL,
  authorized_target_id uuid,
  category text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Manifests and mapping rows are immutable after insert.
CREATE OR REPLACE FUNCTION indicate_private.reject_rollout_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RAISE EXCEPTION 'runtime config rollout records are immutable' USING ERRCODE = '42501';
END
$$;
CREATE TRIGGER runtime_config_release_manifests_immutable_guard
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.runtime_config_release_manifests
FOR EACH STATEMENT EXECUTE FUNCTION indicate_private.reject_rollout_mutation();
CREATE TRIGGER runtime_config_release_domain_zones_immutable_guard
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.runtime_config_release_domain_zones
FOR EACH STATEMENT EXECUTE FUNCTION indicate_private.reject_rollout_mutation();
CREATE TRIGGER runtime_config_parity_evidence_immutable_guard
BEFORE UPDATE OR DELETE ON public.runtime_config_parity_evidence
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_rollout_mutation();

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.runtime_config_release_manifests,
  public.runtime_config_release_domain_zones, public.runtime_config_backfill_runs,
  public.runtime_config_parity_evidence FROM indicate_runtime;
GRANT SELECT ON TABLE public.runtime_config_release_manifests,
  public.runtime_config_release_domain_zones, public.runtime_config_backfill_runs,
  public.runtime_config_parity_evidence TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (21, 'runtime_config_rollout', 'runtime-config-rollout-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6fa4c0f9303df49afcb3b7ee72fb30d2409ca8c4a5312b6828254c82db4a76fe', 1788318973869);

-- ----------------------------------------------------------------------
-- 20260903014500_runtime_config_site_settings_zone_rls
-- ----------------------------------------------------------------------
-- Extend existing relations for database-backed runtime configuration:
-- typed Site Settings columns, global unique non-null Cloudflare zone IDs,
-- permission seeds, and forced RLS on the tenant-scoped config tables.

-- Typed Site Settings columns. Nullable during backfill; a deferred active-Site
-- guard (0023) makes them required once backfilled data satisfies it.
ALTER TABLE public.site_settings
  ADD COLUMN locale text NULL,
  ADD COLUMN seo_default_title text NULL,
  ADD COLUMN seo_default_description text NULL,
  ADD COLUMN seo_robots_directive text NULL,
  ADD COLUMN seo_open_graph_site_name text NULL,
  ADD COLUMN seo_schema_version integer NULL;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_locale_shape CHECK (locale IS NULL OR locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  ADD CONSTRAINT site_settings_seo_robots_directive_shape CHECK (
    seo_robots_directive IS NULL OR seo_robots_directive IN ('index,follow', 'noindex,nofollow')
  ),
  ADD CONSTRAINT site_settings_seo_schema_version_bounds CHECK (
    seo_schema_version IS NULL OR (seo_schema_version BETWEEN 1 AND 2147483647)
  );

-- Global uniqueness of non-null Cloudflare Zone IDs across Domain records.
CREATE UNIQUE INDEX domains_cloudflare_zone_id_unique
  ON public.domains (cloudflare_zone_id)
  WHERE cloudflare_zone_id IS NOT NULL;

-- Platform runtime-config and Site Settings manage permissions. Explicitly not
-- assigned to any Role; administrators attach them to approved Roles.
INSERT INTO public.permissions (id, organization_id, name, scope, description)
VALUES
  ('00000000-0000-4000-8000-000000006002', NULL, 'platform.runtime_config.manage', 'platform', 'Mutate shared runtime configuration and provider mappings'),
  ('00000000-0000-4000-8000-000000006003', NULL, 'site_settings.manage', 'platform', 'Mutate Site Settings for a Site')
ON CONFLICT DO NOTHING;

-- Forced RLS on tenant-scoped configuration tables. Shared tables and policy
-- tables remain governed by revoked-DML + security-definer functions instead.
ALTER TABLE public.runtime_config_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_invalidation_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_invalidation_intents FORCE ROW LEVEL SECURITY;

-- Tenant isolation: same-Organization predicate for the config audit log. Denials
-- and cross-tenant reads store null org and remain readable only in context.
CREATE POLICY runtime_config_audit_tenant_isolation
  ON public.runtime_config_audit_logs
  USING (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  )
  WITH CHECK (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  );

CREATE POLICY runtime_config_invalidation_tenant_isolation
  ON public.runtime_config_invalidation_intents
  USING (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  )
  WITH CHECK (
    organization_id IS NULL
      OR organization_id = indicate_private.current_organization_id()
  );

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (22, 'runtime_config_site_settings_zone_rls', 'runtime-config-site-settings-zone-rls-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('9bca35529083f22ae188b8ba8d98be4b8cbb8ca58bf53b9c396415e125d4a1e3', 1788318974869);

-- ----------------------------------------------------------------------
-- 20260903015000_runtime_config_functions
-- ----------------------------------------------------------------------
-- Security-definer runtime configuration functions plus grants. All reads and
-- writes on the shared/policy config tables flow through these fixed-shape
-- functions; direct table DML remains revoked. Follows the Phase 6 pattern:
-- explicit search_path, REVOKE ... FROM PUBLIC, GRANT EXECUTE to indicate_runtime
-- only, no dynamic SQL, no credential-bearing return columns.

-- =============================================================================
-- READ FUNCTIONS (fixed return shapes, runtime role enumerates config)
-- =============================================================================
CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_revision(p_environment text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT max(version)
  FROM public.runtime_config_revisions
  WHERE environment::text = p_environment
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_revision(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_revision(text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_shared()
RETURNS TABLE (
  supabase_project_ref text,
  cloudflare_account_id text,
  vercel_project_id text,
  vercel_team_id text,
  vercel_production_target_hostname text,
  r2_account_id text,
  r2_bucket_name text,
  upstash_redis_resource_id text,
  version integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT s.supabase_project_ref, s.cloudflare_account_id, s.vercel_project_id, s.vercel_team_id,
         s.vercel_production_target_hostname, s.r2_account_id, s.r2_bucket_name,
         s.upstash_redis_resource_id, s.version, s.updated_at
  FROM public.shared_deployment_config AS s
  LIMIT 1;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_shared() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_shared() TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_policies()
RETURNS TABLE (
  policy_kind text,
  endpoint_class text,
  fields jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
    SELECT 'media_policy'::text,
           NULL::text,
           jsonb_build_object(
             'allowedMimeTypes', mp.allowed_mime_types,
             'maxObjectBytes', mp.max_object_bytes,
             'uploadAuthorizationSeconds', mp.upload_authorization_seconds,
             'readAuthorizationSeconds', mp.read_authorization_seconds,
             'version', mp.version
           )
    FROM public.media_policy AS mp
  UNION ALL
    SELECT 'publication_policy', NULL,
           jsonb_build_object(
             'maxAttempts', pp.max_attempts,
             'retryDelaysSeconds', pp.retry_delays_seconds,
             'leaseSeconds', pp.lease_seconds,
             'batchSize', pp.batch_size,
             'functionDeadlineSeconds', pp.function_deadline_seconds,
             'version', pp.version
           )
    FROM public.publication_policy AS pp
  UNION ALL
    SELECT 'webhook_policy', NULL,
           jsonb_build_object(
             'freshnessSeconds', wp.freshness_seconds,
             'replayRetentionSeconds', wp.replay_retention_seconds,
             'version', wp.version
           )
    FROM public.webhook_policy AS wp
  UNION ALL
    SELECT 'cache_policy', NULL,
           jsonb_build_object(
             'publicCacheSeconds', cp.public_cache_seconds,
             'cacheVersion', cp.cache_version,
             'version', cp.version
           )
    FROM public.cache_policy AS cp
  UNION ALL
    SELECT 'rate_limit_policy'::text, rl.endpoint_class::text,
           jsonb_build_object(
             'allowance', rl.allowance,
             'windowSeconds', rl.window_seconds,
             'version', rl.version
           )
    FROM public.rate_limit_policies AS rl;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_policies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_policies() TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_domains()
RETURNS TABLE (
  organization_id uuid,
  domain_id uuid,
  normalized_hostname text,
  cloudflare_zone_id text,
  routing_version integer,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT d.organization_id, d.id, d.normalized_hostname, d.cloudflare_zone_id,
         d.routing_version, d.version
  FROM public.domains AS d
  WHERE d.status = 'active'
    AND d.cloudflare_zone_id IS NOT NULL
  ORDER BY d.normalized_hostname;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_domains() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_domains() TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_sites()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  domain_id uuid,
  normalized_hostname text,
  region_id uuid,
  routing_version integer,
  content_version integer,
  version integer,
  domain_organization_id uuid,
  domain_normalized_hostname text,
  settings_version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT s.organization_id, s.id, s.domain_id, s.normalized_hostname, s.region_id,
         s.routing_version, s.content_version, s.version,
         d.organization_id, d.normalized_hostname,
         COALESCE(ss.version, 0)
  FROM public.sites AS s
  JOIN public.domains AS d ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.site_settings AS ss
    ON ss.organization_id = s.organization_id AND ss.site_id = s.id
  WHERE s.status = 'active'
    AND s.activation_state = 'active'
  ORDER BY s.normalized_hostname;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_sites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_sites() TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_site_settings()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  locale text,
  seo_default_title text,
  seo_default_description text,
  seo_robots_directive text,
  seo_open_graph_site_name text,
  seo_schema_version integer,
  fallback_media_id uuid,
  fallback_media_object_key text,
  fallback_media_state text,
  fallback_media_organization_id uuid,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT ss.organization_id, ss.site_id, ss.locale, ss.seo_default_title,
         ss.seo_default_description, ss.seo_robots_directive,
         ss.seo_open_graph_site_name, ss.seo_schema_version,
         ss.fallback_media_id, m.object_key, m.state::text, m.organization_id,
         ss.version
  FROM public.site_settings AS ss
  LEFT JOIN public.media AS m
    ON m.organization_id = ss.organization_id AND m.id = ss.fallback_media_id
  ORDER BY ss.organization_id, ss.site_id;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_site_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_site_settings() TO indicate_runtime;

-- =============================================================================
-- MUTATION FUNCTIONS (optimistic; one transaction for value+revision+audit+intent)
-- =============================================================================
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_shared(
  p_actor_id uuid,
  p_expected_version integer,
  p_supabase_project_ref text,
  p_cloudflare_account_id text,
  p_vercel_project_id text,
  p_vercel_team_id text,
  p_vercel_production_target_hostname text,
  p_r2_account_id text,
  p_r2_bucket_name text,
  p_upstash_redis_resource_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.shared_deployment_config AS s
     SET supabase_project_ref = p_supabase_project_ref,
         cloudflare_account_id = p_cloudflare_account_id,
         vercel_project_id = p_vercel_project_id,
         vercel_team_id = p_vercel_team_id,
         vercel_production_target_hostname = p_vercel_production_target_hostname,
         r2_account_id = p_r2_account_id,
         r2_bucket_name = p_r2_bucket_name,
         upstash_redis_resource_id = p_upstash_redis_resource_id,
         version = version + 1,
         updated_at = now()
   WHERE s.id = 'singleton' AND s.version = p_expected_version
   RETURNING s.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'shared_deployment_config');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'shared_deployment_config', NULL, p_expected_version, v_after,
    ARRAY['supabase_project_ref','cloudflare_account_id','vercel_project_id','vercel_team_id',
          'vercel_production_target_hostname','r2_account_id','r2_bucket_name',
          'upstash_redis_resource_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'shared',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(uuid, integer, text, text, text, text, text, text, text, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.claim_runtime_config_invalidations(
  p_limit integer,
  p_lease_until timestamptz
)
RETURNS TABLE (
  intent_id uuid,
  runtime_revision bigint,
  partition_kind text,
  organization_id uuid,
  domain_id uuid,
  site_id uuid,
  claim_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents AS i
     SET status = 'claimed',
         attempts = attempts + 1,
         claim_token = gen_random_uuid(),
         claim_expires_at = p_lease_until,
         updated_at = now()
   WHERE i.id IN (
     SELECT i2.id
     FROM public.runtime_config_invalidation_intents AS i2
     WHERE i2.status = 'pending'
        OR (i2.status = 'failed' AND i2.next_attempt_at <= now())
     LIMIT p_limit
   )
   RETURNING i.id, i.runtime_revision, i.partition_kind::text, i.organization_id,
             i.domain_id, i.site_id, i.claim_token;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.claim_runtime_config_invalidations(integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_runtime_config_invalidations(integer, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.complete_runtime_config_invalidation(
  p_intent_id uuid,
  p_claim_token uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents
     SET status = 'completed',
         updated_at = now()
   WHERE id = p_intent_id AND claim_token = p_claim_token AND status = 'claimed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalidation claim stale or unknown' USING ERRCODE = '55000';
  END IF;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.complete_runtime_config_invalidation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.complete_runtime_config_invalidation(uuid, uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.fail_runtime_config_invalidation(
  p_intent_id uuid,
  p_claim_token uuid,
  p_category text,
  p_next_attempt_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  UPDATE public.runtime_config_invalidation_intents
     SET status = 'failed',
         failure_category = p_category,
         next_attempt_at = p_next_attempt_at,
         updated_at = now()
   WHERE id = p_intent_id AND claim_token = p_claim_token AND status = 'claimed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalidation claim stale or unknown' USING ERRCODE = '55000';
  END IF;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.fail_runtime_config_invalidation(uuid, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.fail_runtime_config_invalidation(uuid, uuid, text, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (23, 'runtime_config_functions', 'runtime-config-functions-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('2671a870865b139376dccdd8ab8f9e2a56310c70caa554b36c1e94d79bbeb991', 1788318975869);

-- ----------------------------------------------------------------------
-- 20260903015500_runtime_config_constraints_triggers
-- ----------------------------------------------------------------------
-- Final runtime-config constraints and triggers. Deferred guards prevent an
-- Active Site from losing valid locale/SEO/fallback state; activation requires
-- a non-null Cloudflare zone ID; policy arrays get per-element bounds.

-- Per-element publication retry bounds + distinctness hint.
CREATE OR REPLACE FUNCTION indicate_private.validate_publication_retry_delays()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_delay integer;
  v_index integer;
BEGIN
  IF cardinality(NEW.retry_delays_seconds) < 1 OR cardinality(NEW.retry_delays_seconds) > 9 THEN
    RAISE EXCEPTION 'publication retry delays must hold 1..9 entries' USING ERRCODE = '23514';
  END IF;
  IF NEW.max_attempts < 1 OR cardinality(NEW.retry_delays_seconds) > NEW.max_attempts - 1 THEN
    RAISE EXCEPTION 'publication retry count exceeds max_attempts-1' USING ERRCODE = '23514';
  END IF;
  FOR v_index IN 1 .. cardinality(NEW.retry_delays_seconds) LOOP
    v_delay := NEW.retry_delays_seconds[v_index];
    IF v_delay < 1 OR v_delay > 3600 THEN
      RAISE EXCEPTION 'publication retry delay out of bounds' USING ERRCODE = '23514';
    END IF;
    IF cardinality(array_positions(NEW.retry_delays_seconds, v_delay)) > 1 THEN
      RAISE EXCEPTION 'publication retry delays must be distinct' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;
CREATE TRIGGER publication_policy_retry_delays_guard
BEFORE INSERT OR UPDATE ON public.publication_policy
FOR EACH ROW EXECUTE FUNCTION indicate_private.validate_publication_retry_delays();

-- Non-empty distinct allowed MIME types.
CREATE OR REPLACE FUNCTION indicate_private.validate_media_policy_mimes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_mime text;
  v_seen text[] := '{}';
BEGIN
  IF cardinality(NEW.allowed_mime_types) < 1 THEN
    RAISE EXCEPTION 'media policy requires at least one MIME type' USING ERRCODE = '23514';
  END IF;
  FOREACH v_mime IN ARRAY NEW.allowed_mime_types LOOP
    IF v_mime = ANY (v_seen) THEN
      RAISE EXCEPTION 'media policy MIME types must be distinct' USING ERRCODE = '23514';
    END IF;
    v_seen := v_seen || v_mime;
  END LOOP;
  RETURN NEW;
END
$$;
CREATE TRIGGER media_policy_mimes_guard
BEFORE INSERT OR UPDATE ON public.media_policy
FOR EACH ROW EXECUTE FUNCTION indicate_private.validate_media_policy_mimes();

-- Domain activation requires a non-null Cloudflare zone ID.
CREATE OR REPLACE FUNCTION indicate_private.guard_active_domain_zone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.cloudflare_zone_id IS NULL THEN
    RAISE EXCEPTION 'active domain requires a Cloudflare zone id' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER domains_active_requires_zone_guard
BEFORE INSERT OR UPDATE ON public.domains
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_active_domain_zone();

-- Deferred guard: an Active Site must have complete valid Same-Organization
-- locale/SEO/fallback settings. Runs at commit so a multi-statement activation
-- transaction can build state before verification.
CREATE OR REPLACE FUNCTION indicate_private.guard_active_site_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.activation_state = 'active' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.site_settings AS ss
      WHERE ss.organization_id = NEW.organization_id
        AND ss.site_id = NEW.id
        AND ss.locale IS NOT NULL
        AND ss.seo_default_title IS NOT NULL
        AND ss.seo_default_description IS NOT NULL
        AND ss.seo_robots_directive IS NOT NULL
        AND ss.seo_open_graph_site_name IS NOT NULL
        AND ss.seo_schema_version IS NOT NULL
        AND ss.fallback_media_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.media AS m
          WHERE m.organization_id = ss.organization_id
            AND m.id = ss.fallback_media_id
            AND m.state = 'active'
        )
    ) THEN
      RAISE EXCEPTION 'active site requires complete same-organization site settings and active fallback media' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
CREATE CONSTRAINT TRIGGER sites_settings_guard_deferred
AFTER INSERT OR UPDATE ON public.sites
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_active_site_settings();

-- Guard: valid Site Settings cannot be deleted or invalidated while the Site is active.
CREATE OR REPLACE FUNCTION indicate_private.guard_site_settings_against_active_site()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sites AS s
    WHERE s.organization_id = OLD.organization_id
      AND s.id = OLD.site_id
      AND s.status = 'active'
      AND s.activation_state = 'active'
  ) AND (
    OLD.locale IS NULL OR OLD.seo_default_title IS NULL OR OLD.seo_default_description IS NULL
    OR OLD.seo_robots_directive IS NULL OR OLD.seo_open_graph_site_name IS NULL OR OLD.seo_schema_version IS NULL
    OR OLD.fallback_media_id IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot invalidate site settings while the site is active' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END
$$;
CREATE TRIGGER site_settings_active_site_guard
BEFORE UPDATE OR DELETE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION indicate_private.guard_site_settings_against_active_site();

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (24, 'runtime_config_constraints_triggers', 'runtime-config-constraints-triggers-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('61602bbd86ddef9b644bc768bfa0d098303afe161755eff354201df63bd11122', 1788318976869);

-- ----------------------------------------------------------------------
-- 20260903020000_runtime_config_mutations
-- ----------------------------------------------------------------------
-- Security-definer runtime configuration mutation functions for policy singletons,
-- Domain provider-mapping, and per-Site Settings. These complement the shared
-- config mutation added in 0022 and follow the same transaction shape: revalidate
-- authorization, optimistically version-predicated UPDATE, appending a runtime
-- revision, a sanitized audit event, and every durable invalidation intent in the
-- same transaction. Platform functions require the explicit platform permission
-- `platform.runtime_config.manage`; the Site Settings function requires an active
-- Membership holding `site_settings.manage` for the exact Organization/Site.
-- Follows the Phase 6 pattern: explicit search_path, REVOKE ... FROM PUBLIC,
-- GRANT EXECUTE to indicate_runtime only, no dynamic SQL, no credential-bearing
-- return columns.

-- =============================================================================
-- POLICY MUTATIONS (optimistic; one transaction for value+revision+audit+intent)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_media_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_allowed_mime_types text[],
  p_max_object_bytes integer,
  p_upload_authorization_seconds integer,
  p_read_authorization_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.media_policy AS m
     SET allowed_mime_types = p_allowed_mime_types,
         max_object_bytes = p_max_object_bytes,
         upload_authorization_seconds = p_upload_authorization_seconds,
         read_authorization_seconds = p_read_authorization_seconds,
         version = version + 1,
         updated_at = now()
   WHERE m.id = 'singleton' AND m.version = p_expected_version
   RETURNING m.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'media_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'media_policy', NULL, p_expected_version, v_after,
    ARRAY['allowed_mime_types','max_object_bytes','upload_authorization_seconds','read_authorization_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_media_policy(uuid, integer, text[], integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_media_policy(uuid, integer, text[], integer, integer, integer) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_publication_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_max_attempts integer,
  p_retry_delays_seconds integer[],
  p_lease_seconds integer,
  p_batch_size integer,
  p_function_deadline_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.publication_policy AS pp
     SET max_attempts = p_max_attempts,
         retry_delays_seconds = p_retry_delays_seconds,
         lease_seconds = p_lease_seconds,
         batch_size = p_batch_size,
         function_deadline_seconds = p_function_deadline_seconds,
         version = version + 1,
         updated_at = now()
   WHERE pp.id = 'singleton' AND pp.version = p_expected_version
   RETURNING pp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'publication_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'publication_policy', NULL, p_expected_version, v_after,
    ARRAY['max_attempts','retry_delays_seconds','lease_seconds','batch_size','function_deadline_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(uuid, integer, integer, integer[], integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(uuid, integer, integer, integer[], integer, integer, integer) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_webhook_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_freshness_seconds integer,
  p_replay_retention_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.webhook_policy AS wp
     SET freshness_seconds = p_freshness_seconds,
         replay_retention_seconds = p_replay_retention_seconds,
         version = version + 1,
         updated_at = now()
   WHERE wp.id = 'singleton' AND wp.version = p_expected_version
   RETURNING wp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'webhook_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'webhook_policy', NULL, p_expected_version, v_after,
    ARRAY['freshness_seconds','replay_retention_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(uuid, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(uuid, integer, integer, integer) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_cache_policy(
  p_actor_id uuid,
  p_expected_version integer,
  p_public_cache_seconds integer,
  p_cache_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.cache_policy AS cp
     SET public_cache_seconds = p_public_cache_seconds,
         cache_version = p_cache_version,
         version = version + 1,
         updated_at = now()
   WHERE cp.id = 'singleton' AND cp.version = p_expected_version
   RETURNING cp.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'cache_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'cache_policy', NULL, p_expected_version, v_after,
    ARRAY['public_cache_seconds','cache_version'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(uuid, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(uuid, integer, integer, integer) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(
  p_actor_id uuid,
  p_endpoint_class public.rate_limit_endpoint_class,
  p_expected_version integer,
  p_allowance integer,
  p_window_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rate_limit_policies AS r
     SET allowance = p_allowance,
         window_seconds = p_window_seconds,
         version = version + 1,
         updated_at = now()
   WHERE r.endpoint_class = p_endpoint_class AND r.version = p_expected_version
   RETURNING r.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'rate_limit_policy');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'rate_limit_policy', NULL, p_expected_version, v_after,
    ARRAY['allowance','window_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy',
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(uuid, public.rate_limit_endpoint_class, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(uuid, public.rate_limit_endpoint_class, integer, integer, integer) TO indicate_runtime;

-- =============================================================================
-- DOMAIN PROVIDER MAPPING (assign a Cloudflare zone to a Domain)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_domain_provider_mapping(
  p_actor_id uuid,
  p_domain_id uuid,
  p_zone_id text,
  p_expected_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
  v_org uuid;
BEGIN
  IF NOT indicate_private.has_platform_permission(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.domains AS d
     SET cloudflare_zone_id = p_zone_id,
         version = version + 1,
         updated_at = now()
   WHERE d.id = p_domain_id AND d.version = p_expected_version
   RETURNING d.version, d.organization_id INTO v_after, v_org;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'domain_provider_mapping');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), v_org, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'domain', p_domain_id, p_expected_version, v_after,
    ARRAY['cloudflare_zone_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, domain_id, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'domain', v_org, p_domain_id,
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_domain_provider_mapping(uuid, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_domain_provider_mapping(uuid, uuid, text, integer) TO indicate_runtime;

-- =============================================================================
-- SITE SETTINGS MUTATION (same-Organization/active-Membership/permission checked)
-- =============================================================================

CREATE OR REPLACE FUNCTION indicate_private.mutate_site_settings(
  p_actor_id uuid,
  p_org_id uuid,
  p_site_id uuid,
  p_locale text,
  p_seo_default_title text,
  p_seo_default_description text,
  p_seo_robots_directive text,
  p_seo_open_graph_site_name text,
  p_seo_schema_version integer,
  p_fallback_media_id uuid,
  p_expected_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
DECLARE
  v_after integer;
  v_revision bigint;
BEGIN
  IF NOT indicate_private.has_tenant_permission(p_actor_id, p_org_id, 'site_settings.manage') THEN
    RAISE EXCEPTION 'site settings mutation denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.site_settings AS ss
     SET locale = p_locale,
         seo_default_title = p_seo_default_title,
         seo_default_description = p_seo_default_description,
         seo_robots_directive = p_seo_robots_directive,
         seo_open_graph_site_name = p_seo_open_graph_site_name,
         seo_schema_version = p_seo_schema_version,
         fallback_media_id = p_fallback_media_id,
         version = version + 1,
         updated_at = now()
   WHERE ss.organization_id = p_org_id
     AND ss.site_id = p_site_id
     AND ss.version = p_expected_version
   RETURNING ss.version INTO v_after;

  IF v_after IS NULL THEN
    RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000';
  END IF;

  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'site_settings');

  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), p_org_id, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'site_settings', p_site_id, p_expected_version, v_after,
    ARRAY['locale','seo_default_title','seo_default_description','seo_robots_directive',
          'seo_open_graph_site_name','seo_schema_version','fallback_media_id'],
    'succeeded', current_setting('app.request_id', true)
  );

  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, site_id, status, attempts, next_attempt_at
  ) VALUES (
    gen_random_uuid(), v_revision, current_setting('app.environment', true), 'site', p_org_id, p_site_id,
    'pending', 0, now()
  );

  RETURN v_after;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.mutate_site_settings(uuid, uuid, uuid, text, text, text, text, text, integer, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_site_settings(uuid, uuid, uuid, text, text, text, text, text, integer, uuid, integer) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (25, 'runtime_config_mutations', 'runtime-config-mutations-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('777f279fa3779a3b5f72d3499f4b03933d9a117b1324d17cc1b0f446e468456b', 1788350776449);

-- ----------------------------------------------------------------------
-- 20260903020300_de_object_rename_timestamp
-- ----------------------------------------------------------------------
-- Delivery-object rename timestamp accounting.
--
-- Marker migration: the production database recorded version 26 as
-- `de_object_rename_timestamp` (applied 2026-09-02, checksum
-- `de-object-rename-timestamp-v1`) before this repository tracked the change
-- as a reviewed file. No schema object in the current database state requires
-- a replayable DDL body — every statement this version ever carried is already
-- reflected in the live schema — so this file only carries the ledger
-- registration that keeps the journal, the reviewed manifest, and
-- `indicate_schema_migrations` in exact agreement. Do not add DDL here; any
-- new schema change belongs in a new forward migration.

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (26, 'de_object_rename_timestamp', 'de-object-rename-timestamp-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('a9ead169f3359671ae906d7de87369f28bd555e3e0e9913af572ff85532d8d19', 1788350776450);

-- ----------------------------------------------------------------------
-- 20260903020500_dashboard_entry_point
-- ----------------------------------------------------------------------
-- Domain rename: audit entry point 'cms' becomes 'dashboard'.
--
-- Follows the rename of the application EntryPoint union and the
-- audit_entry_point enum in src/database/schema/editorial.ts. Applied
-- databases created the enum label 'cms'; fresh installs use the bootstrap
-- script, which already declares 'dashboard'. RENAME VALUE preserves the
-- label position and transparently retargets existing audit rows, so no data
-- rewrite is required. The enum type name itself is unchanged.

ALTER TYPE "public"."audit_entry_point" RENAME VALUE 'cms' TO 'dashboard';

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (27, 'dashboard_entry_point', 'dashboard-entry-point-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6e6151a1cbac886c653de30e7d1ac2a19e0e8f8cf93221f5f4603f50dfeaf869', 1788350776451);

-- ----------------------------------------------------------------------
-- 20260903021000_role_tier
-- ----------------------------------------------------------------------
-- Membership tier bound to roles: 'admin' holds full control, 'user' works
-- within granted permissions. Existing roles keep their names; tiers are
-- backfilled from the naming convention (names containing 'admin' become
-- admin, everything else becomes user) and can be corrected through the
-- normal role-update path afterwards. New roles default to 'user'.
CREATE TYPE "public"."role_tier" AS ENUM('admin', 'user');
ALTER TABLE "public"."roles" ADD COLUMN "tier" "public"."role_tier" DEFAULT 'user' NOT NULL;
UPDATE "public"."roles" SET "tier" = 'admin' WHERE lower("name") LIKE '%admin%';

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (28, 'role_tier', 'role-tier-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ecac5e6c81ad46d79c87986784f9b04cc94e2486f7c3000ae14e9fc2beae5410', 1788350776452);

-- ----------------------------------------------------------------------
-- 20260903021500_delivery_activation_enums
-- ----------------------------------------------------------------------
-- Delivery activation hardening: closed value sets become enums, the orphan
-- `phase` column is removed, and the missing `activation_state` column is
-- added. All three touched tables were verified empty before this migration,
-- so every conversion is a metadata-only rewrite with no row mapping risk.
--
-- Deliberately NOT converted to enums (open-ended by design):
-- - `activation_state` carries provider-driven states (pending, processing,
--   deactivating, probe_verified, cloudflare_verified, vercel_associated,
--   completed, failed) that grow with each provider integration.
-- - webhook `source`, media `purpose`, invalidation `reason`, release
--   `category`, and subscription `plan` are free-form or caller-supplied.

-- 1. New enum types.
CREATE TYPE "public"."activation_operation" AS ENUM('activate', 'deactivate');
CREATE TYPE "public"."telegram_conversation_step" AS ENUM('idle', 'article_region', 'article_title', 'article_body', 'article_source', 'article_slug', 'article_sites', 'article_image', 'publication_status');
CREATE TYPE "public"."seo_robots_directive" AS ENUM('index,follow', 'noindex,nofollow');

-- 2. domain_activation_attempts: add the missing activation_state column that
-- the delivery repository writes on every activation request, and drop the
-- orphan phase column that no code references.
ALTER TABLE "public"."domain_activation_attempts" ADD COLUMN "activation_state" text NOT NULL;
ALTER TABLE "public"."domain_activation_attempts" DROP COLUMN "phase";

-- 3. operation text + CHECK -> enum (the CHECK becomes redundant).
ALTER TABLE "public"."domain_activation_attempts" DROP CONSTRAINT "domain_activation_attempts_operation_check";
ALTER TABLE "public"."domain_activation_attempts" ALTER COLUMN "operation" DROP DEFAULT;
ALTER TABLE "public"."domain_activation_attempts" ALTER COLUMN "operation" TYPE "public"."activation_operation" USING "operation"::"public"."activation_operation";
ALTER TABLE "public"."domain_activation_attempts" ALTER COLUMN "operation" SET DEFAULT 'activate';

-- 4. telegram_conversations.step text -> enum (closed 9-step workflow).
-- The length() CHECK becomes invalid on an enum type (length(enum) does not
-- exist) and redundant: every enum label is 1-100 chars, so drop it first.
ALTER TABLE "public"."telegram_conversations" DROP CONSTRAINT "telegram_conversations_bounded_step";
ALTER TABLE "public"."telegram_conversations" ALTER COLUMN "step" TYPE "public"."telegram_conversation_step" USING "step"::"public"."telegram_conversation_step";

-- 5. site_settings.seo_robots_directive text -> enum (validated upstream by
-- SEO_ROBOTS_DIRECTIVES; writers pass text which Postgres casts on assignment
-- and rejects fail-closed when invalid). The text-equality CHECK becomes a
-- type error on an enum column and redundant, so drop it first.
ALTER TABLE "public"."site_settings" DROP CONSTRAINT "site_settings_seo_robots_directive_shape";
ALTER TABLE "public"."site_settings" ALTER COLUMN "seo_robots_directive" TYPE "public"."seo_robots_directive" USING "seo_robots_directive"::"public"."seo_robots_directive";

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (29, 'delivery_activation_enums', 'delivery-activation-enums-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('37844033396cfaa0104197d31052703c3d3f6e307703c50bbaf55e0f4dd50783', 1788350776453);

-- ----------------------------------------------------------------------
-- 20260903022000_schema_reconciliation
-- ----------------------------------------------------------------------
-- Schema reconciliation: enforce constraints declared in src/database/schema
-- that the live database is missing.
--
-- Curated from the `drizzle-kit generate` diff of schema.ts against snapshot
-- 0002 (everything else that diff reported — tables, columns, enum types,
-- indexes — is already reflected in the live schema through an earlier
-- migration and is deliberately NOT repeated here, so this file stays
-- replayable). Every touched table was verified empty before this migration,
-- so each ADD CONSTRAINT is a metadata-only change with no row risk.
--
-- 1. Foreign keys declared via inline references() that were never created:
--    cache_bypasses, platform_user_permissions (x2), telegram_conversations,
--    and the three runtime_config release-manifest dependents.
-- 2. `domain_activation_attempts_operation_check` in its enum-compatible
--    IN form (the text-era form was dropped by 20260903021500; schema.ts
--    still declares the check, longest label fits, so restore it).
-- 3. `webhook_replay_claims_bounded_identity` upgraded to the expression
--    schema.ts declares (adds body_digest/identity_binding_digest/attempt
--    bounds), plus the missing `webhook_replay_claims_pending_terminal`.

ALTER TABLE "cache_bypasses" ADD CONSTRAINT "cache_bypasses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "platform_user_permissions" ADD CONSTRAINT "platform_user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "platform_user_permissions" ADD CONSTRAINT "platform_user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "telegram_conversations" ADD CONSTRAINT "telegram_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "runtime_config_backfill_runs" ADD CONSTRAINT "runtime_config_backfill_runs_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "runtime_config_parity_evidence" ADD CONSTRAINT "runtime_config_parity_evidence_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "runtime_config_release_domain_zones" ADD CONSTRAINT "runtime_config_release_domain_zones_manifest_id_runtime_config_release_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."runtime_config_release_manifests"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "domain_activation_attempts" ADD CONSTRAINT "domain_activation_attempts_operation_check" CHECK ("domain_activation_attempts"."operation" IN ('activate', 'deactivate'));
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_bounded_identity";
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_pending_terminal" CHECK ("webhook_replay_claims"."pending_status" IS NULL OR "webhook_replay_claims"."pending_status" IN ('processed', 'rejected'));
ALTER TABLE "webhook_replay_claims" ADD CONSTRAINT "webhook_replay_claims_bounded_identity" CHECK (length("webhook_replay_claims"."source") BETWEEN 1 AND 100 AND length("webhook_replay_claims"."replay_id") BETWEEN 1 AND 255 AND length("webhook_replay_claims"."body_digest") = 64 AND ("webhook_replay_claims"."identity_binding_digest" IS NULL OR length("webhook_replay_claims"."identity_binding_digest") = 64) AND "webhook_replay_claims"."attempt_count" > 0);

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (30, 'schema_reconciliation', 'schema-reconciliation-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e14501607ab9aab829aedf14cd3aae1061be2254e83b927a97b024ea658e261b', 1788453622423);

-- ----------------------------------------------------------------------
-- 20260903022500_stale_object_cleanup
-- ----------------------------------------------------------------------
-- Stale object cleanup: drop constraints that schema.ts no longer declares
-- and rename the rest to their declared names.
--
-- Context: several hand-written migrations created auto-named foreign keys,
-- duplicate bounding checks, and misnamed checks that schema.ts never
-- declared, while a few declared names exceed Postgres' 63-byte identifier
-- limit and were truncated on creation. Every touched table was verified
-- empty before this migration, so every statement below is metadata-only.
--
-- 1. Drop superseded auto-named foreign keys (replaced by the explicit
--    short-named constraints from 20260903022000, or renamed below).
-- 2. Drop the truncated over-long constraints created by 20260903022000
--    (Postgres truncates identifiers to 63 bytes; schema.ts now declares
--    short explicit names instead).
-- 3. Rename surviving constraints to their schema.ts names.
-- 4. Drop stale checks: duplicate webhook bounds, singleton checks on policy
--    tables that schema.ts does not declare (uniqueness is enforced by the
--    primary key), and the duplicate publication retry check.
-- 5. Add the parity-evidence timestamps schema.ts declares.

ALTER TABLE "cache_bypasses" DROP CONSTRAINT "cache_bypasses_organization_id_fkey";
ALTER TABLE "platform_user_permissions" DROP CONSTRAINT "platform_user_permissions_user_id_fkey";
ALTER TABLE "platform_user_permissions" DROP CONSTRAINT "platform_user_permissions_permission_id_fkey";
ALTER TABLE "telegram_conversations" DROP CONSTRAINT "telegram_conversations_organization_id_fkey";
ALTER TABLE "runtime_config_backfill_runs" DROP CONSTRAINT "runtime_config_backfill_runs_manifest_id_runtime_config_release";
ALTER TABLE "runtime_config_parity_evidence" DROP CONSTRAINT "runtime_config_parity_evidence_manifest_id_runtime_config_relea";
ALTER TABLE "runtime_config_release_domain_zones" DROP CONSTRAINT "runtime_config_release_domain_zones_manifest_id_runtime_config_";
ALTER TABLE "runtime_config_backfill_runs" RENAME CONSTRAINT "runtime_config_backfill_runs_manifest_id_fkey" TO "runtime_config_backfill_runs_manifest_fk";
ALTER TABLE "runtime_config_parity_evidence" RENAME CONSTRAINT "runtime_config_parity_evidence_manifest_id_fkey" TO "runtime_config_parity_evidence_manifest_fk";
ALTER TABLE "runtime_config_release_domain_zones" RENAME CONSTRAINT "runtime_config_release_domain_zones_manifest_id_fkey" TO "runtime_config_release_domain_zones_manifest_fk";
ALTER TABLE "runtime_config_release_domain_zones" RENAME CONSTRAINT "runtime_config_release_domain_zones_pkey" TO "runtime_config_release_domain_zones_pk";
ALTER TABLE "publication_transition_receipts" RENAME CONSTRAINT "publication_transition_receipts_organization_id_organizations_i" TO "publication_transition_receipts_organization_fk";
ALTER TABLE "runtime_config_backfill_runs" RENAME CONSTRAINT "runtime_config_backfill_counts_nonnegative" TO "runtime_config_backfill_created_nonnegative";
ALTER TABLE "media_policy" RENAME CONSTRAINT "media_policy_mimes_nonempty" TO "media_policy_mime_nonempty";
ALTER TABLE "shared_deployment_config" RENAME CONSTRAINT "shared_deployment_config_id_singleton" TO "shared_deployment_config_singleton";
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_attempt_count_check";
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_body_digest_check";
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_identity_binding_check";
ALTER TABLE "webhook_replay_claims" DROP CONSTRAINT "webhook_replay_claims_pending_terminal_check";
ALTER TABLE "cache_policy" DROP CONSTRAINT "cache_policy_id_singleton";
ALTER TABLE "media_policy" DROP CONSTRAINT "media_policy_id_singleton";
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_id_singleton";
ALTER TABLE "webhook_policy" DROP CONSTRAINT "webhook_policy_id_singleton";
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_retry_le_attempts";
ALTER TABLE "articles" DROP CONSTRAINT "articles_lead_media_fk";
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (31, 'stale_object_cleanup', 'stale-object-cleanup-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('0569003d119c76c9fc283b5b825d139a53c365da0a4d2122b81ad74c0267fb81', 1788454000000);

-- ----------------------------------------------------------------------
-- 20260903023000_policy_singleton_key
-- ----------------------------------------------------------------------
-- Policy singleton key alignment: the four policy tables and their mutation
-- functions were created with an `id` column, while schema.ts (and therefore
-- every Drizzle-ORM query path) addresses `singleton_key`. Rename the columns
-- so the ORM and the stored functions agree. The retired `*_id_singleton`
-- checks were already removed by 20260903022500; nothing else references the
-- old name. Also adds the two parity-evidence timestamps and the publisher
-- verification timestamp that schema.ts declares but the live schema lacks.
-- Every touched table was verified empty: metadata-only, no row risk.

ALTER TABLE "cache_policy" RENAME COLUMN "id" TO "singleton_key";
ALTER TABLE "media_policy" RENAME COLUMN "id" TO "singleton_key";
ALTER TABLE "publication_policy" RENAME COLUMN "id" TO "singleton_key";
ALTER TABLE "webhook_policy" RENAME COLUMN "id" TO "singleton_key";
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "runtime_config_parity_evidence" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "publishers" ADD COLUMN "verified_at" timestamp with time zone;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (32, 'policy_singleton_key', 'policy-singleton-key-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ed06cfaedf668c6c93c66c57190a0fe8533c9e5b6a544ef18b87789d4f46c174', 1788455000000);

-- ----------------------------------------------------------------------
-- 20260903023500_function_api_reconciliation
-- ----------------------------------------------------------------------
-- Function API reconciliation: converge stored functions and triggers on the
-- live Supabase API surface.
--
-- The application calls the current function names (customer_create,
-- claim_publishing_dispatch_gaps, permission_has_platform, ...), but this
-- repository's older migration files still define the previous generation
-- (create_customer, claim_dispatch_gaps, has_platform_permission, ...), so a
-- fresh install would miss functions the runtime needs. This migration
-- re-applies every diverged or renamed function with its live body (plus two
-- live bug fixes: policy singletons address singleton_key, audit entry points
-- use 'dashboard'), drops the retired names, rebinds the three renamed
-- triggers, and mirrors the live EXECUTE grants. Against the live database
-- every statement is a no-op except the documented fixes; tables are empty.

DROP TRIGGER IF EXISTS capture_replay_business_receipt ON public.audit_logs;
DROP TRIGGER IF EXISTS role_permission_scope_guard ON public.role_permissions;
DROP TRIGGER IF EXISTS site_hostname_guard ON public.sites;
DROP TRIGGER IF EXISTS invalidation_tasks_enable_cache_bypass ON public.invalidation_tasks;
DROP TRIGGER IF EXISTS publishing_job_transition_guard ON public.publishing_jobs;
DROP TRIGGER IF EXISTS publishing_target_transition_guard ON public.publishing_job_targets;
DROP FUNCTION IF EXISTS indicate_private.enforce_job_transition();
DROP FUNCTION IF EXISTS indicate_private.enforce_target_transition();
DROP FUNCTION IF EXISTS indicate_private.claim_dispatch_gaps(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.find_expired_leases(requested_now timestamptz, requested_limit integer);
DROP FUNCTION IF EXISTS indicate_private.claim_transition_receipts(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.claim_cleanup_tasks(requested_now timestamptz, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.claim_invalidation_tasks(p_now timestamptz, p_limit integer, p_claim_token uuid, p_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.site_hostname_guard();
DROP FUNCTION IF EXISTS indicate_private.resolve_public_host(p_hostname text);
DROP FUNCTION IF EXISTS indicate_private.is_pending_host(p_hostname text, p_attempt_id uuid);
DROP FUNCTION IF EXISTS indicate_private.is_previous_host_owned(p_organization_id uuid, p_site_id uuid, p_hostname text);
DROP FUNCTION IF EXISTS indicate_private.claim_activation_attempts(p_now timestamptz, p_limit integer, p_claim_token uuid, p_claim_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.enable_cache_bypass_on_enqueue();
DROP FUNCTION IF EXISTS indicate_private.complete_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.fail_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamptz, p_terminal boolean, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.ensure_org_permissions(p_organization_id uuid);
DROP FUNCTION IF EXISTS indicate_private.claim_replay(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamptz, p_expires_at timestamptz);
DROP FUNCTION IF EXISTS indicate_private.finish_replay(p_source text, p_replay_id text, p_body_digest text, p_status public.replay_claim_status, p_outcome jsonb, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.has_platform_permission(p_actor_id uuid, p_permission text);
DROP FUNCTION IF EXISTS indicate_private.has_tenant_permission(p_actor_id uuid, p_organization_id uuid, p_permission text);
DROP FUNCTION IF EXISTS indicate_private.list_customers(p_actor_id uuid);
DROP FUNCTION IF EXISTS indicate_private.create_customer(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.update_customer(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status public.record_status, p_metadata jsonb, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.update_subscription(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status public.subscription_status, p_period_starts_at timestamptz, p_period_ends_at timestamptz, p_now timestamptz);
DROP FUNCTION IF EXISTS indicate_private.role_permission_scope_guard();
DROP FUNCTION IF EXISTS indicate_private.provision_platform_permission(p_user_id uuid, p_permission text, p_provisioned_by text);
DROP FUNCTION IF EXISTS indicate_private.list_platform_permissions(p_user_id uuid);
DROP FUNCTION IF EXISTS indicate_private.capture_replay_business_receipt();
DROP FUNCTION IF EXISTS indicate_private.discover_active_hosts(p_hostnames text[]);
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.cache_policy AS cp
     SET public_cache_seconds = p_public_cache_seconds, cache_version = p_cache_version,
         version = version + 1, updated_at = now()
   WHERE cp.singleton_key = 'singleton' AND cp.version = p_expected_version
   RETURNING cp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'cache_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'cache_policy', NULL, p_expected_version, v_after,
    ARRAY['public_cache_seconds','cache_version'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.media_policy AS m
     SET allowed_mime_types = p_allowed_mime_types, max_object_bytes = p_max_object_bytes,
         upload_authorization_seconds = p_upload_authorization_seconds, read_authorization_seconds = p_read_authorization_seconds,
         version = version + 1, updated_at = now()
   WHERE m.singleton_key = 'singleton' AND m.version = p_expected_version
   RETURNING m.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'media_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'media_policy', NULL, p_expected_version, v_after,
    ARRAY['allowed_mime_types','max_object_bytes','upload_authorization_seconds','read_authorization_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_batch_size integer, p_function_deadline_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.publication_policy AS pp
     SET max_attempts = p_max_attempts, retry_delays_seconds = p_retry_delays_seconds,
         lease_seconds = p_lease_seconds, batch_size = p_batch_size,
         function_deadline_seconds = p_function_deadline_seconds, version = version + 1, updated_at = now()
   WHERE pp.singleton_key = 'singleton' AND pp.version = p_expected_version
   RETURNING pp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'publication_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'publication_policy', NULL, p_expected_version, v_after,
    ARRAY['max_attempts','retry_delays_seconds','lease_seconds','batch_size','function_deadline_seconds'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.webhook_policy AS wp
     SET freshness_seconds = p_freshness_seconds, replay_retention_seconds = p_replay_retention_seconds,
         version = version + 1, updated_at = now()
   WHERE wp.singleton_key = 'singleton' AND wp.version = p_expected_version
   RETURNING wp.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'webhook_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'webhook_policy', NULL, p_expected_version, v_after,
    ARRAY['freshness_seconds','replay_retention_seconds'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone)
 RETURNS TABLE(intent_id uuid, runtime_revision bigint, partition_kind text, organization_id uuid, domain_id uuid, site_id uuid, claim_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.runtime_config_invalidation_intents AS i
     SET status = 'claimed',
         attempts = attempts + 1,
         claim_token = gen_random_uuid(),
         claim_expires_at = p_lease_until,
         updated_at = now()
   WHERE i.id IN (
     SELECT i2.id
     FROM public.runtime_config_invalidation_intents AS i2
     WHERE i2.status = 'pending'
        OR (i2.status = 'failed' AND i2.next_attempt_at <= now())
     LIMIT p_limit
   )
   RETURNING i.id, i.runtime_revision, i.partition_kind::text, i.organization_id,
             i.domain_id, i.site_id, i.claim_token;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.enforce_article_site_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF (
    (OLD.state = 'queued' AND NEW.state = 'processing') OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN RETURN NEW; END IF;
  IF OLD.state IN ('published', 'failed') AND NEW.state = 'queued' AND EXISTS (
    SELECT 1 FROM public.publishing_job_targets AS target
    INNER JOIN public.publishing_jobs AS job
      ON job.organization_id = target.organization_id AND job.id = target.job_id
    WHERE target.organization_id = OLD.organization_id AND target.article_site_id = OLD.id
      AND target.state = 'queued' AND job.state = 'queued'
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid article site current-projection transition' USING ERRCODE = '23514';
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint; v_org uuid;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.domains AS d
     SET cloudflare_zone_id = p_zone_id, version = version + 1, updated_at = now()
   WHERE d.id = p_domain_id AND d.version = p_expected_version
   RETURNING d.version, d.organization_id INTO v_after, v_org;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'domain_provider_mapping');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type, target_id,
    expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), v_org, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'domain', p_domain_id, p_expected_version, v_after, ARRAY['cloudflare_zone_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, domain_id, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'domain', v_org, p_domain_id, 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.shared_deployment_config AS s
     SET supabase_project_ref = p_supabase_project_ref, cloudflare_account_id = p_cloudflare_account_id,
         vercel_project_id = p_vercel_project_id, vercel_team_id = p_vercel_team_id,
         vercel_production_target_hostname = p_vercel_production_target_hostname,
         r2_account_id = p_r2_account_id, r2_bucket_name = p_r2_bucket_name,
         upstash_redis_resource_id = p_upstash_redis_resource_id,
         version = version + 1, updated_at = now()
   WHERE s.id = 'singleton' AND s.version = p_expected_version
   RETURNING s.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'shared_deployment_config');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'shared_deployment_config', NULL, p_expected_version, v_after,
    ARRAY['supabase_project_ref','cloudflare_account_id','vercel_project_id','vercel_team_id',
          'vercel_production_target_hostname','r2_account_id','r2_bucket_name','upstash_redis_resource_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'shared', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'site_settings.manage') THEN
    RAISE EXCEPTION 'site settings mutation denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.site_settings AS ss
     SET locale = p_locale, seo_default_title = p_seo_default_title,
         seo_default_description = p_seo_default_description, seo_robots_directive = p_seo_robots_directive,
         seo_open_graph_site_name = p_seo_open_graph_site_name, seo_schema_version = p_seo_schema_version,
         fallback_media_id = p_fallback_media_id, version = version + 1, updated_at = now()
   WHERE ss.organization_id = p_org_id AND ss.site_id = p_site_id AND ss.version = p_expected_version
   RETURNING ss.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'site_settings');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type, target_id,
    expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), p_org_id, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'site_settings', p_site_id, p_expected_version, v_after,
    ARRAY['locale','seo_default_title','seo_default_description','seo_robots_directive',
          'seo_open_graph_site_name','seo_schema_version','fallback_media_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, site_id, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'site', p_org_id, p_site_id, 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.runtime_config.manage') THEN
    RAISE EXCEPTION 'platform runtime config permission denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.rate_limit_policies AS r
     SET allowance = p_allowance, window_seconds = p_window_seconds, version = version + 1, updated_at = now()
   WHERE r.endpoint_class = p_endpoint_class AND r.version = p_expected_version
   RETURNING r.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'rate_limit_policy');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type,
    target_id, expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), NULL, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'rate_limit_policy', NULL, p_expected_version, v_after,
    ARRAY['allowance','window_seconds'], 'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'policy', 'pending', 0, now());
  RETURN v_after;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_active_domains()
 RETURNS TABLE(organization_id uuid, domain_id uuid, normalized_hostname text, cloudflare_zone_id text, routing_version integer, version integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  SELECT d.organization_id, d.id, d.normalized_hostname, d.cloudflare_zone_id,
         d.routing_version, d.version
  FROM public.domains AS d
  WHERE d.status = 'active'
    AND d.cloudflare_zone_id IS NOT NULL
  ORDER BY d.normalized_hostname;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT organization_id FROM public.webhook_replay_claims WHERE source = p_source AND replay_id = p_replay_id
$function$;
CREATE OR REPLACE FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text)
 RETURNS TABLE(organization_id uuid, id uuid, lookup_id text, name text, salt text, verification_hash text, scopes text[], status api_key_status, predecessor_id uuid, expires_at timestamp with time zone, last_used_at timestamp with time zone, version integer, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT k.organization_id, k.id, k.lookup_id, k.name, k.salt,
         k.verification_hash, k.scopes, k.status, k.predecessor_id,
         k.expires_at, k.last_used_at, k.version, k.created_at, k.updated_at
  FROM public.api_keys k WHERE k.lookup_id = p_lookup_id LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text)
 RETURNS TABLE(mapping_id uuid, organization_id uuid, user_id uuid, role_id uuid, telegram_user_id text, telegram_chat_id text, permissions text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH eligible AS (
    SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
    FROM public.telegram_identity_mappings m
    JOIN public.memberships membership
      ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
     AND membership.role_id = m.role_id AND membership.status = 'active'
    JOIN public.roles r
      ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
    WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  ), single_mapping AS (
    SELECT * FROM eligible WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM single_mapping m
  LEFT JOIN public.role_permissions rp ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id
$function$;
CREATE OR REPLACE FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, task_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT task.organization_id, task.id FROM public.object_cleanup_tasks AS task
    WHERE task.status IN ('pending', 'processing') AND task.next_attempt_at <= requested_now
      AND (task.reconciliation_claim_expires_at IS NULL OR task.reconciliation_claim_expires_at <= requested_now)
    ORDER BY task.next_attempt_at, task.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.object_cleanup_tasks AS task
  SET status = 'processing', reconciliation_claim_token = requested_token,
      reconciliation_claim_expires_at = requested_claim_expires_at, updated_at = requested_now
  FROM candidates WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.organization_id, task.id;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, job_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT job.organization_id, job.id
    FROM public.publishing_jobs AS job
    WHERE job.state IN ('queued', 'retrying') AND job.dispatch_status = 'pending'
      AND job.next_dispatch_at <= requested_now
      AND (job.reconciliation_claim_expires_at IS NULL OR job.reconciliation_claim_expires_at <= requested_now)
    ORDER BY job.next_dispatch_at, job.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publishing_jobs AS job
  SET reconciliation_claim_token = requested_token, reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates WHERE job.organization_id = candidates.organization_id AND job.id = candidates.id
  RETURNING job.organization_id, job.id;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone)
 RETURNS TABLE(organization_id uuid, receipt_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT receipt.organization_id, receipt.id FROM public.publication_transition_receipts AS receipt
    WHERE receipt.acknowledged_at IS NULL
      AND (receipt.reconciliation_claim_expires_at IS NULL OR receipt.reconciliation_claim_expires_at <= requested_now)
    ORDER BY receipt.created_at, receipt.id FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(requested_limit, 1), 100)
  )
  UPDATE public.publication_transition_receipts AS receipt
  SET reconciliation_claim_token = requested_token, reconciliation_claim_expires_at = requested_claim_expires_at
  FROM candidates WHERE receipt.organization_id = candidates.organization_id AND receipt.id = candidates.id
  RETURNING receipt.organization_id, receipt.id;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = 'completed', reconciliation_claim_token = NULL,
      reconciliation_claim_expires_at = NULL, sanitized_failure = NULL, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  PERFORM 1
  FROM public.cache_bypasses
  WHERE organization_id = p_organization_id AND site_id = v_site_id FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1 FROM public.invalidation_tasks
    WHERE organization_id = p_organization_id AND site_id = v_site_id AND status <> 'completed'
  ) THEN
    INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
    VALUES (p_organization_id, v_site_id, false, 1, 'invalidation_completed', p_now, p_now)
    ON CONFLICT (organization_id, site_id) DO UPDATE
      SET bypass = false, version = public.cache_bypasses.version + 1,
          reason = 'invalidation_completed', updated_at = p_now;
  END IF;
  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organizations(id, name, slug, status, customer_metadata, version, created_at, updated_at)
  VALUES (p_organization_id, p_name, p_slug, 'active', p_metadata, 1, p_now, p_now);
  PERFORM indicate_private.org_ensure_permissions(p_organization_id);
  IF p_subscription IS NOT NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_subscription->>'plan', (p_subscription->>'status')::public.subscription_status,
      (p_subscription->>'periodStartsAt')::timestamptz, (p_subscription->>'periodEndsAt')::timestamptz, 1, p_now, p_now);
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.create', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', 'active'), p_request_id, p_now);
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.customer_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, status record_status, customer_metadata jsonb, version integer, created_at timestamp with time zone, updated_at timestamp with time zone, subscription_plan text, subscription_status subscription_status, period_starts_at timestamp with time zone, period_ends_at timestamp with time zone, subscription_version integer, subscription_created_at timestamp with time zone, subscription_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.name, o.slug, o.status, o.customer_metadata, o.version, o.created_at, o.updated_at,
    s.plan, s.status, s.period_starts_at, s.period_ends_at, s.version, s.created_at, s.updated_at
  FROM public.organizations o LEFT JOIN public.subscriptions s ON s.organization_id = o.id
  ORDER BY o.name, o.id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organizations SET name = p_name, slug = p_slug, status = p_status,
    customer_metadata = p_metadata, version = version + 1, updated_at = p_now
  WHERE id = p_organization_id AND version = p_expected_version;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.update', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status','customerMetadata'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', p_status, 'customerMetadata', p_metadata), p_request_id, p_now);
  RETURN true;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[])
 RETURNS TABLE(hostname text, organization_id uuid, domain_id uuid, site_id uuid, region_id uuid, region_external_key text, region_slug text, coherent boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH requested(hostname) AS (
    SELECT DISTINCT normalized.hostname
    FROM unnest(
      CASE
        WHEN p_hostnames IS NOT NULL AND cardinality(p_hostnames) BETWEEN 1 AND 100
          AND array_position(p_hostnames, NULL) IS NULL
        THEN p_hostnames
        ELSE ARRAY[]::text[]
      END
    ) AS supplied(hostname)
    CROSS JOIN LATERAL (
      SELECT lower(trim(trailing '.' FROM supplied.hostname)) AS hostname
    ) normalized
    WHERE normalized.hostname = supplied.hostname
      AND octet_length(normalized.hostname) BETWEEN 1 AND 253
  )
  SELECT s.normalized_hostname, s.organization_id, s.domain_id, s.id, s.region_id,
         r.external_key, r.slug, true
  FROM requested requested_host
  JOIN public.sites s ON s.normalized_hostname = requested_host.hostname
  JOIN public.organizations o ON o.id = s.organization_id
  JOIN public.domains d ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.regions r ON r.organization_id = s.organization_id AND r.id = s.region_id
  WHERE o.status = 'active' AND d.status = 'active' AND s.status = 'active' AND s.activation_state = 'active'
    AND (
      (s.region_id IS NULL AND s.normalized_hostname = d.normalized_hostname)
      OR (s.region_id IS NOT NULL AND r.status = 'active' AND s.normalized_hostname = r.slug || '.' || d.normalized_hostname)
    )
  ORDER BY s.normalized_hostname, s.organization_id, s.id
$function$;
CREATE OR REPLACE FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  INSERT INTO public.cache_bypasses(
    organization_id, site_id, bypass, version, reason, created_at, updated_at
  ) VALUES (
    NEW.organization_id, NEW.site_id, true, 1, 'invalidation_pending', NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true,
        version = public.cache_bypasses.version + 1,
        reason = 'invalidation_pending',
        updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.enforce_publishing_job_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'retrying', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing job state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.enforce_publishing_target_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.state = OLD.state THEN
    IF OLD.state IN ('published', 'failed') THEN
      NEW.finished_at := OLD.finished_at;
      NEW.published_url := OLD.published_url;
      NEW.published_at := OLD.published_at;
      NEW.sanitized_error := OLD.sanitized_error;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'queued' AND NEW.state IN ('processing', 'failed')) OR
    (OLD.state = 'processing' AND NEW.state IN ('published', 'retrying', 'failed')) OR
    (OLD.state = 'retrying' AND NEW.state IN ('processing', 'failed'))
  ) THEN
    RAISE EXCEPTION 'invalid publishing target state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_site_id uuid;
BEGIN
  UPDATE public.invalidation_tasks
  SET status = CASE WHEN p_terminal THEN 'failed'::public.task_status ELSE 'pending'::public.task_status END,
      attempts = attempts + 1, next_attempt_at = p_next_attempt_at,
      reconciliation_claim_token = NULL, reconciliation_claim_expires_at = NULL,
      sanitized_failure = p_failure, updated_at = p_now
  WHERE organization_id = p_organization_id AND id = p_task_id
    AND status = 'processing' AND reconciliation_claim_token = p_claim_token
    AND reconciliation_claim_expires_at > p_now
  RETURNING site_id INTO v_site_id;
  IF v_site_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.cache_bypasses(organization_id, site_id, bypass, version, reason, created_at, updated_at)
  VALUES (p_organization_id, v_site_id, true, 1, 'invalidation_failed', p_now, p_now)
  ON CONFLICT (organization_id, site_id) DO UPDATE
    SET bypass = true, version = public.cache_bypasses.version + 1,
        reason = 'invalidation_failed', updated_at = p_now;
  RETURN true;
END;
$function$;
CREATE OR REPLACE FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer)
 RETURNS TABLE(organization_id uuid, job_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT job.organization_id, job.id FROM public.publishing_jobs AS job
  WHERE job.state = 'processing' AND job.lease_expires_at <= requested_now
  ORDER BY job.lease_expires_at, job.id LIMIT LEAST(GREATEST(requested_limit, 1), 100)
$function$;
CREATE OR REPLACE FUNCTION indicate_private.org_ensure_permissions(p_organization_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  INSERT INTO public.permissions(id, organization_id, name, scope, description)
  SELECT gen_random_uuid(), p_organization_id, value.name, 'organization'::public.permission_scope, value.description
  FROM (VALUES
    ('api_key.read', 'Read API key metadata'), ('api_key.manage', 'Issue, rotate, and revoke API keys'),
    ('telegram.manage', 'Manage Telegram identity mappings'), ('subscription.read', 'Read Organization subscription'),
    ('subscription.manage', 'Manage Organization subscription')
  ) AS value(name, description)
  ON CONFLICT DO NOTHING
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT COALESCE(
    indicate_private.current_verified_user_id() = p_actor_id
      AND nullif(current_setting('app.actor_id', true), '')::uuid = p_actor_id
      AND EXISTS (
        SELECT 1 FROM public.platform_user_permissions grant_row
        JOIN public.permissions p ON p.id = grant_row.permission_id
        JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
        WHERE grant_row.user_id = p_actor_id
          AND p.scope = 'platform' AND p.organization_id IS NULL AND p.name = p_permission
      ),
    false
  )
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON r.organization_id = m.organization_id AND r.id = m.role_id AND r.active
    JOIN public.role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.users u ON u.id = m.user_id AND u.status = 'active'
    WHERE m.user_id = p_actor_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND p.name = p_permission
  )
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_list_platform(p_user_id uuid)
 RETURNS TABLE(name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF nullif(current_setting('app.actor_id', true), '')::uuid IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'platform permission lookup denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.name FROM public.platform_user_permissions grant_row
  JOIN public.permissions p ON p.id = grant_row.permission_id
  JOIN public.users u ON u.id = grant_row.user_id AND u.status = 'active'
  WHERE grant_row.user_id = p_user_id AND p.scope = 'platform' AND p.organization_id IS NULL;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_provision_platform(p_user_id uuid, p_permission text, p_provisioned_by text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_permission_id uuid;
BEGIN
  SELECT id INTO v_permission_id FROM public.permissions WHERE scope = 'platform' AND organization_id IS NULL AND name = p_permission;
  IF v_permission_id IS NULL OR length(trim(p_provisioned_by)) < 1 THEN
    RAISE EXCEPTION 'invalid platform permission provisioning request' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND status = 'active') THEN
    RAISE EXCEPTION 'active platform user required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.platform_user_permissions(user_id, permission_id, provisioned_by)
  VALUES (p_user_id, v_permission_id, p_provisioned_by) ON CONFLICT DO NOTHING;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.permission_role_scope_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.permissions p
    WHERE p.id = NEW.permission_id AND p.scope = 'organization' AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'tenant roles may grant only same-organization permissions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET organization_id = p_organization_id, identity_binding_digest = p_identity_binding_digest
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed'
      AND (c.organization_id IS NULL OR c.organization_id = p_organization_id)
      AND (c.identity_binding_digest IS NULL OR c.identity_binding_digest = p_identity_binding_digest)
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_capture_business_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE
  v_replay_id text; v_body_digest text; v_claim_token uuid;
BEGIN
  IF NEW.request_id NOT LIKE 'telegram-replay:%' THEN RETURN NEW; END IF;
  v_replay_id := split_part(NEW.request_id, ':', 2);
  v_body_digest := split_part(NEW.request_id, ':', 3);
  BEGIN
    v_claim_token := split_part(NEW.request_id, ':', 4)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid replay fence' USING ERRCODE = '42501';
  END;
  IF length(v_body_digest) <> 64 OR split_part(NEW.request_id, ':', 5) <> '' OR NOT EXISTS (
    SELECT 1 FROM public.webhook_replay_claims claim
    WHERE claim.source = 'telegram' AND claim.replay_id = v_replay_id
      AND claim.body_digest = v_body_digest AND claim.claim_token = v_claim_token AND claim.status = 'claimed'
  ) THEN
    RAISE EXCEPTION 'stale replay worker' USING ERRCODE = '42501';
  END IF;
  IF NEW.outcome = 'succeeded' AND NEW.action IN ('article.create', 'article.sites.assign', 'media.activate', 'publication.request') THEN
    UPDATE public.webhook_replay_claims
    SET business_receipt = jsonb_build_object(
      'action', NEW.action, 'targetType', NEW.target_type, 'targetId', NEW.target_id,
      'after', coalesce(NEW.after, '{}'::jsonb), 'occurredAt', NEW.occurred_at
    )
    WHERE source = 'telegram' AND replay_id = v_replay_id
      AND body_digest = v_body_digest AND claim_token = v_claim_token AND status = 'claimed';
  END IF;
  RETURN NEW;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone)
 RETURNS TABLE(created boolean, source text, replay_id text, organization_id uuid, body_digest text, status replay_claim_status, outcome jsonb, received_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(source, replay_id, organization_id, body_digest, status, received_at, expires_at)
    VALUES (p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_expires_at)
    ON CONFLICT (source, replay_id) DO NOTHING RETURNING *
  )
  SELECT true, i.source, i.replay_id, i.organization_id, i.body_digest, i.status, i.outcome, i.received_at, i.expires_at FROM inserted i
  UNION ALL
  SELECT false, c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone)
 RETURNS TABLE(claim_kind text, source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH inserted AS (
    INSERT INTO public.webhook_replay_claims(source, replay_id, organization_id, body_digest, status, received_at, lease_expires_at, expires_at)
    VALUES (p_source, p_replay_id, p_organization_id, p_body_digest, 'claimed', p_received_at, p_lease_expires_at, p_expires_at)
    ON CONFLICT (source, replay_id) DO NOTHING RETURNING *
  ), reclaimed AS (
    UPDATE public.webhook_replay_claims c
    SET lease_expires_at = p_lease_expires_at, claim_token = gen_random_uuid(), attempt_count = c.attempt_count + 1
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted)
      AND c.status = 'claimed' AND c.pending_status IS NULL AND c.business_receipt IS NULL
      AND c.lease_expires_at <= p_received_at AND c.expires_at > p_received_at
      AND c.body_digest = p_body_digest
      AND (p_organization_id IS NULL OR c.organization_id IS NULL OR c.organization_id = p_organization_id)
    RETURNING *
  ), selected AS (
    SELECT 'created'::text AS claim_kind, i.* FROM inserted i
    UNION ALL
    SELECT 'reclaimed'::text AS claim_kind, r.* FROM reclaimed r
    UNION ALL
    SELECT 'duplicate'::text AS claim_kind, c.* FROM public.webhook_replay_claims c
    WHERE c.source = p_source AND c.replay_id = p_replay_id
      AND NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM reclaimed)
  )
  SELECT s.claim_kind, s.source, s.replay_id, s.organization_id, s.body_digest,
    s.identity_binding_digest, s.claim_token, s.business_receipt, s.status, s.pending_status, s.outcome, s.received_at,
    s.lease_expires_at, s.attempt_count, s.expires_at
  FROM selected s LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET status = c.pending_status, pending_status = NULL, processed_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed' AND c.pending_status IN ('processed', 'rejected') AND c.outcome IS NOT NULL
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token AND c.status IN ('processed', 'rejected') AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, status replay_claim_status, outcome jsonb, received_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH changed AS (
    UPDATE public.webhook_replay_claims
    SET status = p_status, outcome = p_outcome, processed_at = p_now
    WHERE source = p_source AND replay_id = p_replay_id AND body_digest = p_body_digest AND status = 'claimed'
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.status, c.outcome, c.received_at, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone)
 RETURNS TABLE(source text, replay_id text, organization_id uuid, body_digest text, identity_binding_digest text, claim_token uuid, business_receipt jsonb, status replay_claim_status, pending_status replay_claim_status, outcome jsonb, received_at timestamp with time zone, lease_expires_at timestamp with time zone, attempt_count integer, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF p_status NOT IN ('processed', 'rejected') THEN RETURN; END IF;
  RETURN QUERY
  WITH changed AS (
    UPDATE public.webhook_replay_claims c
    SET pending_status = p_status, outcome = p_outcome, outcome_ready_at = p_now
    WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
      AND c.claim_token = p_claim_token AND c.status = 'claimed'
      AND (c.pending_status IS NULL OR (c.pending_status = p_status AND c.outcome = p_outcome))
    RETURNING *
  )
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM changed c
  UNION ALL
  SELECT c.source, c.replay_id, c.organization_id, c.body_digest, c.identity_binding_digest, c.claim_token, c.business_receipt,
    c.status, c.pending_status, c.outcome, c.received_at, c.lease_expires_at, c.attempt_count, c.expires_at
  FROM public.webhook_replay_claims c
  WHERE c.source = p_source AND c.replay_id = p_replay_id AND c.body_digest = p_body_digest
    AND c.claim_token = p_claim_token AND c.status IN ('processed', 'rejected') AND c.outcome = p_outcome
    AND NOT EXISTS (SELECT 1 FROM changed)
  LIMIT 1;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin');
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.permission_has_tenant(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$function$;
CREATE TRIGGER invalidation_tasks_enable_cache_bypass AFTER INSERT ON public.invalidation_tasks FOR EACH ROW EXECUTE FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue();
CREATE TRIGGER publishing_job_transition_guard BEFORE UPDATE OF state ON public.publishing_jobs FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_publishing_job_transition();
CREATE TRIGGER publishing_target_transition_guard BEFORE UPDATE OF state ON public.publishing_job_targets FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_publishing_target_transition();
REVOKE ALL ON FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_media_cleanup_tasks(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_publishing_dispatch_gaps(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_publishing_transition_receipts(requested_now timestamp with time zone, requested_limit integer, requested_token uuid, requested_claim_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_runtime_config_invalidations(p_limit integer, p_lease_until timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.complete_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.customer_list(p_actor_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_list(p_actor_id uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[]) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.enable_delivery_cache_bypass_on_enqueue() FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.fail_delivery_invalidation(p_organization_id uuid, p_task_id uuid, p_claim_token uuid, p_failure jsonb, p_next_attempt_at timestamp with time zone, p_terminal boolean, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.find_publishing_expired_leases(requested_now timestamp with time zone, requested_limit integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_domain_provider_mapping(p_actor_id uuid, p_domain_id uuid, p_zone_id text, p_expected_version integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_cache_policy(p_actor_id uuid, p_expected_version integer, p_public_cache_seconds integer, p_cache_version integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_media_policy(p_actor_id uuid, p_expected_version integer, p_allowed_mime_types text[], p_max_object_bytes integer, p_upload_authorization_seconds integer, p_read_authorization_seconds integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_function_deadline_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_publication_policy(p_actor_id uuid, p_expected_version integer, p_max_attempts integer, p_retry_delays_seconds integer[], p_lease_seconds integer, p_function_deadline_seconds integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_rate_limit_policy(p_actor_id uuid, p_endpoint_class rate_limit_endpoint_class, p_expected_version integer, p_allowance integer, p_window_seconds integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_shared(p_actor_id uuid, p_expected_version integer, p_supabase_project_ref text, p_cloudflare_account_id text, p_vercel_project_id text, p_vercel_team_id text, p_vercel_production_target_hostname text, p_r2_account_id text, p_r2_bucket_name text, p_upstash_redis_resource_id text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_runtime_config_webhook_policy(p_actor_id uuid, p_expected_version integer, p_freshness_seconds integer, p_replay_retention_seconds integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_fallback_media_id uuid, p_expected_version integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.org_ensure_permissions(p_organization_id uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_platform(p_actor_id uuid, p_permission text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_tenant(p_actor_id uuid, p_organization_id uuid, p_permission text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.permission_list_platform(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.permission_list_platform(p_user_id uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.permission_provision_platform(p_user_id uuid, p_permission text, p_provisioned_by text) FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.permission_role_scope_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_active_domains() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_active_domains() TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_bind_identity(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_organization_id uuid, p_identity_binding_digest text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_capture_business_receipt() FROM PUBLIC;
REVOKE ALL ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_lease_expires_at timestamp with time zone, p_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim(p_source text, p_replay_id text, p_organization_id uuid, p_body_digest text, p_received_at timestamp with time zone, p_expires_at timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_claim_organization(p_source text, p_replay_id text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_finalize(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_finish(p_source text, p_replay_id text, p_body_digest text, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.replay_prepare_outcome(p_source text, p_replay_id text, p_body_digest text, p_claim_token uuid, p_status replay_claim_status, p_outcome jsonb, p_now timestamp with time zone) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (33, 'function_api_reconciliation', 'function-api-reconciliation-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('116bb8a6e08edb8a15b2b134bb4208ee9ce2b562efddfec88a4fed9643615c56', 1788456000000);

-- ----------------------------------------------------------------------
-- 20260903024000_residual_constraint_cleanup
-- ----------------------------------------------------------------------
-- Residual constraint cleanup: drop constraints the live database carries
-- that schema.ts never declared.
--
-- - `*_version_positive` on cache/publication/webhook policies: siblings of a
--   family that schema.ts only declares on some tables; the policy tables
--   here rely on their primary key and version guards in writers.
-- - `runtime_config_invalidation_intents_runtime_revision_fkey`: an inline
--   foreign key with no schema.ts declaration; intents reference revisions
--   loosely by design (leased workers must never block on revision rows).
-- Every touched table was verified empty: metadata-only, no row risk.

ALTER TABLE "cache_policy" DROP CONSTRAINT "cache_policy_version_positive";
ALTER TABLE "publication_policy" DROP CONSTRAINT "publication_policy_version_positive";
ALTER TABLE "webhook_policy" DROP CONSTRAINT "webhook_policy_version_positive";
ALTER TABLE "runtime_config_invalidation_intents" DROP CONSTRAINT "runtime_config_invalidation_intents_runtime_revision_fkey";

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (34, 'residual_constraint_cleanup', 'residual-constraint-cleanup-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('726130658b3725bb2c2af1f15e070fe91e0fbff3023b666f19926a4ce4ac743e', 1788457000000);

-- ----------------------------------------------------------------------
-- 20260903024500_column_default_alignment
-- ----------------------------------------------------------------------
-- Column default alignment: enforce writer-supplied values fail-closed and
-- confirm the updated_at defaults schema.ts declares.
--
-- The three SET DEFAULT / SET NOT NULL pairs below are already reflected in
-- the live schema (verified before writing); they are kept verbatim from the
-- `drizzle-kit generate` diff so fresh installs converge, and are safe no-ops
-- when replayed. The two DROP DEFAULTs remove silent placeholder values:
-- writers must supply api_keys.name and webhook_replay_claims.body_digest
-- explicitly instead of inheriting misleading defaults. All touched tables
-- were verified empty.

ALTER TABLE "publication_transition_receipts" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "publication_transition_receipts" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "seed_runs" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "seed_runs" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "api_keys" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "webhook_replay_claims" ALTER COLUMN "body_digest" DROP DEFAULT;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (35, 'column_default_alignment', 'column-default-alignment-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('99026932cf79fb5e161b22b314f3b36328747f9ffb0e83487b46a07836305739', 1788456509551);

-- ----------------------------------------------------------------------
-- 20260903025000_rls_operation_split
-- ----------------------------------------------------------------------
-- RLS operation split: replace every broad FOR ALL tenant policy with
-- per-command SELECT/INSERT/UPDATE/DELETE policies carrying the identical
-- predicate, retargeted from PUBLIC to indicate_runtime, with session-context
-- reads wrapped as scalar subqueries so the planner can cache them per
-- statement. Deny-all and metadata-read policies are retargeted unchanged.
-- Behavior-neutral by construction: no predicate logic changes in this file.

DROP POLICY IF EXISTS tenant_isolation ON public.api_keys;
CREATE POLICY tenant_isolation_select ON public.api_keys FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.api_keys FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.api_keys FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.api_keys FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.article_sites;
CREATE POLICY tenant_isolation_select ON public.article_sites FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.article_sites FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.article_sites FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.article_sites FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.articles;
CREATE POLICY tenant_isolation_select ON public.articles FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.articles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.articles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.articles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.audit_logs;
CREATE POLICY tenant_isolation_select ON public.audit_logs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.audit_logs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.audit_logs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.audit_logs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.authors;
CREATE POLICY tenant_isolation_select ON public.authors FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.authors FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.authors FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.authors FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.cache_bypasses;
CREATE POLICY tenant_isolation_select ON public.cache_bypasses FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.cache_bypasses FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.cache_bypasses FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.cache_bypasses FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.categories;
CREATE POLICY tenant_isolation_select ON public.categories FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.categories FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.categories FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.categories FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.domain_activation_attempts;
CREATE POLICY tenant_isolation_select ON public.domain_activation_attempts FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.domain_activation_attempts FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.domain_activation_attempts FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.domain_activation_attempts FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.domains;
CREATE POLICY tenant_isolation_select ON public.domains FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.domains FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.domains FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.domains FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.invalidation_tasks;
CREATE POLICY tenant_isolation_select ON public.invalidation_tasks FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.invalidation_tasks FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.invalidation_tasks FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.invalidation_tasks FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.media;
CREATE POLICY tenant_isolation_select ON public.media FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.media FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.media FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.media FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.media_key_reservations;
CREATE POLICY tenant_isolation_select ON public.media_key_reservations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.media_key_reservations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.media_key_reservations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.media_key_reservations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.memberships;
CREATE POLICY tenant_isolation_select ON public.memberships FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.memberships FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.memberships FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.memberships FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.object_cleanup_tasks;
CREATE POLICY tenant_isolation_select ON public.object_cleanup_tasks FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.object_cleanup_tasks FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.object_cleanup_tasks FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.object_cleanup_tasks FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.official_affiliations;
CREATE POLICY tenant_isolation_select ON public.official_affiliations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.official_affiliations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.official_affiliations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.official_affiliations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.publishers;
CREATE POLICY tenant_isolation_select ON public.publishers FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.publishers FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.publishers FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.publishers FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.publishing_job_targets;
CREATE POLICY tenant_isolation_select ON public.publishing_job_targets FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.publishing_job_targets FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.publishing_job_targets FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.publishing_job_targets FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.publishing_jobs;
CREATE POLICY tenant_isolation_select ON public.publishing_jobs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.publishing_jobs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.publishing_jobs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.publishing_jobs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.regions;
CREATE POLICY tenant_isolation_select ON public.regions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.regions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.regions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.regions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.role_permissions;
CREATE POLICY tenant_isolation_select ON public.role_permissions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.role_permissions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.role_permissions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.role_permissions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.roles;
CREATE POLICY tenant_isolation_select ON public.roles FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.roles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.roles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.roles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.seed_runs;
CREATE POLICY tenant_isolation_select ON public.seed_runs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.seed_runs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.seed_runs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.seed_runs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.site_settings;
CREATE POLICY tenant_isolation_select ON public.site_settings FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.site_settings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.site_settings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.site_settings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.sites;
CREATE POLICY tenant_isolation_select ON public.sites FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.sites FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.sites FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.sites FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.subscriptions;
CREATE POLICY tenant_isolation_select ON public.subscriptions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.subscriptions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.subscriptions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.subscriptions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.telegram_conversations;
CREATE POLICY tenant_isolation_select ON public.telegram_conversations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.telegram_conversations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.telegram_conversations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.telegram_conversations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.telegram_identity_mappings;
CREATE POLICY tenant_isolation_select ON public.telegram_identity_mappings FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.telegram_identity_mappings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.telegram_identity_mappings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.telegram_identity_mappings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.publication_transition_receipts;
CREATE POLICY tenant_isolation_select ON public.publication_transition_receipts FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_insert ON public.publication_transition_receipts FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_update ON public.publication_transition_receipts FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY tenant_isolation_delete ON public.publication_transition_receipts FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS tenant_isolation ON public.organizations;
CREATE POLICY organization_isolation_select ON public.organizations FOR SELECT TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY organization_isolation_insert ON public.organizations FOR INSERT TO indicate_runtime WITH CHECK (id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY organization_isolation_update ON public.organizations FOR UPDATE TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id())) WITH CHECK (id = (SELECT indicate_private.current_organization_id()));
CREATE POLICY organization_isolation_delete ON public.organizations FOR DELETE TO indicate_runtime USING (id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS auth_identity_isolation ON public.users;
CREATE POLICY auth_identity_isolation_select ON public.users FOR SELECT TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id()));
CREATE POLICY auth_identity_isolation_insert ON public.users FOR INSERT TO indicate_runtime WITH CHECK (auth_user_id = (SELECT indicate_private.current_auth_user_id()));
CREATE POLICY auth_identity_isolation_update ON public.users FOR UPDATE TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id())) WITH CHECK (auth_user_id = (SELECT indicate_private.current_auth_user_id()));
CREATE POLICY auth_identity_isolation_delete ON public.users FOR DELETE TO indicate_runtime USING (auth_user_id = (SELECT indicate_private.current_auth_user_id()));
DROP POLICY IF EXISTS permission_scope_isolation ON public.permissions;
CREATE POLICY permission_scope_isolation_select ON public.permissions FOR SELECT TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY permission_scope_isolation_insert ON public.permissions FOR INSERT TO indicate_runtime WITH CHECK ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY permission_scope_isolation_update ON public.permissions FOR UPDATE TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY permission_scope_isolation_delete ON public.permissions FOR DELETE TO indicate_runtime USING ((scope = 'platform'::permission_scope) OR (organization_id = (SELECT indicate_private.current_organization_id())));
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation ON public.runtime_config_audit_logs;
CREATE POLICY runtime_config_audit_tenant_isolation_select ON public.runtime_config_audit_logs FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_audit_tenant_isolation_insert ON public.runtime_config_audit_logs FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_audit_tenant_isolation_update ON public.runtime_config_audit_logs FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_audit_tenant_isolation_delete ON public.runtime_config_audit_logs FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_isolation_select ON public.runtime_config_invalidation_intents FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_invalidation_tenant_isolation_insert ON public.runtime_config_invalidation_intents FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_invalidation_tenant_isolation_update ON public.runtime_config_invalidation_intents FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY runtime_config_invalidation_tenant_isolation_delete ON public.runtime_config_invalidation_intents FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_isolation_select ON public.webhook_replay_claims FOR SELECT TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY webhook_replay_tenant_isolation_insert ON public.webhook_replay_claims FOR INSERT TO indicate_runtime WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY webhook_replay_tenant_isolation_update ON public.webhook_replay_claims FOR UPDATE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id()))) WITH CHECK ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
CREATE POLICY webhook_replay_tenant_isolation_delete ON public.webhook_replay_claims FOR DELETE TO indicate_runtime USING ((organization_id IS NULL) OR (organization_id = (SELECT indicate_private.current_organization_id())));
DROP POLICY IF EXISTS config_deny_all ON public.cache_policy;
DROP POLICY IF EXISTS config_deny_all ON public.media_policy;
DROP POLICY IF EXISTS config_deny_all ON public.publication_policy;
DROP POLICY IF EXISTS config_deny_all ON public.rate_limit_policies;
DROP POLICY IF EXISTS config_deny_all ON public.webhook_policy;
DROP POLICY IF EXISTS config_deny_all ON public.shared_deployment_config;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_backfill_runs;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_parity_evidence;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_release_domain_zones;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_release_manifests;
DROP POLICY IF EXISTS config_deny_all ON public.runtime_config_revisions;
DROP POLICY IF EXISTS config_deny_all ON public.platform_user_permissions;
DROP POLICY IF EXISTS indicate_runtime_read ON public.indicate_schema_migrations;
DROP POLICY IF EXISTS indicate_runtime_read ON public.migration_gate_events;
CREATE POLICY config_deny_all ON public.cache_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.media_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.publication_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.rate_limit_policies FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.webhook_policy FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.shared_deployment_config FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_backfill_runs FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_parity_evidence FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_release_domain_zones FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_release_manifests FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.runtime_config_revisions FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY config_deny_all ON public.platform_user_permissions FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY indicate_runtime_read ON public.indicate_schema_migrations FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY indicate_runtime_read ON public.migration_gate_events FOR SELECT TO indicate_runtime USING (true);

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (36, 'rls_operation_split', 'rls-operation-split-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('db6492db464a4d64b19b52716863a86b420b32561eb80517afa6fbb37b970838', 1788458000000);

-- ----------------------------------------------------------------------
-- 20260903025500_rls_write_hardening
-- ----------------------------------------------------------------------
-- RLS write hardening: gate security-sensitive writes on actor authorization.
--
-- The v36 split isolated per-command policies; this migration tightens the
-- WRITE side where a bare tenant check is insufficient. All predicates mirror
-- the permission strings the application already enforces in code, so no
-- legitimate flow changes behavior (verified against every repository writer):
--
-- 1. actor_has_tenant_permission(): single reviewer for "may actor A mutate
--    authorization data in the current org". Mirrors the application's own
--    authorization branches (user membership grants, api_key scopes incl.
--    expiry, telegram mapping role grants), plus a first-provisioning
--    bootstrap exception (org without memberships yet) and the platform
--    escape hatch. SECURITY INVOKER so its internal reads stay tenant-scoped;
--    callers wrap it in a scalar subquery. No recursion: it only performs
--    SELECTs, and no SELECT policy calls it.
-- 2. memberships / roles / role_permissions / telegram_identity_mappings /
--    api_keys: INSERT/UPDATE/DELETE require tenant AND the matching
--    permission (membership.manage, role.manage, telegram.manage,
--    api_key.manage). SELECT stays tenant-only.
-- 3. users: no DELETE policy (default deny) + REVOKE DELETE; identity columns
--    (id, auth_user_id) made immutable by trigger (RLS WITH CHECK cannot
--    reference OLD rows). INSERT/SELECT/UPDATE keep the self predicate so the
--    signup/ensure flow (authorization-repository) keeps working.
-- 4. organizations: explicit DELETE-deny policy + REVOKE DELETE (no code path
--    deletes organizations; verified by repository audit).
-- 5. runtime_config_audit_logs: REVOKE UPDATE/DELETE (append-only; the
--    *_append_only_guard trigger remains the second lock). audit_logs already
--    INSERT+SELECT-only: drop its UPDATE/DELETE policies.
-- 6. Null-organization rows (audit RC, invalidation intents, replay claims):
--    SELECT keeps the null arm (workers read shared rows); INSERT/UPDATE/
--    DELETE now require a concrete current organization. Every null-org write
--    in the codebase goes through SECURITY DEFINER functions (owner bypass),
--    so no legitimate path breaks.
-- 7. permissions: explicit write-deny policies for indicate_runtime (grants
--    already SELECT-only; this is the second lock).

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
$function$;
REVOKE ALL ON FUNCTION indicate_private.actor_has_tenant_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.actor_has_tenant_permission(text) TO indicate_runtime;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.memberships;
DROP POLICY IF EXISTS tenant_isolation_update ON public.memberships;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.memberships;
CREATE POLICY memberships_write_insert ON public.memberships FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));
CREATE POLICY memberships_write_update ON public.memberships FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));
CREATE POLICY memberships_write_delete ON public.memberships FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('membership.manage')));
DROP POLICY IF EXISTS tenant_isolation_insert ON public.roles;
DROP POLICY IF EXISTS tenant_isolation_update ON public.roles;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.roles;
CREATE POLICY roles_write_insert ON public.roles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
CREATE POLICY roles_write_update ON public.roles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
CREATE POLICY roles_write_delete ON public.roles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
DROP POLICY IF EXISTS tenant_isolation_insert ON public.role_permissions;
DROP POLICY IF EXISTS tenant_isolation_update ON public.role_permissions;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.role_permissions;
CREATE POLICY role_permissions_write_insert ON public.role_permissions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
CREATE POLICY role_permissions_write_update ON public.role_permissions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
CREATE POLICY role_permissions_write_delete ON public.role_permissions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('role.manage')));
DROP POLICY IF EXISTS tenant_isolation_insert ON public.telegram_identity_mappings;
DROP POLICY IF EXISTS tenant_isolation_update ON public.telegram_identity_mappings;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.telegram_identity_mappings;
CREATE POLICY telegram_mappings_write_insert ON public.telegram_identity_mappings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));
CREATE POLICY telegram_mappings_write_update ON public.telegram_identity_mappings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));
CREATE POLICY telegram_mappings_write_delete ON public.telegram_identity_mappings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('telegram.manage')));
DROP POLICY IF EXISTS tenant_isolation_insert ON public.api_keys;
DROP POLICY IF EXISTS tenant_isolation_update ON public.api_keys;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.api_keys;
CREATE POLICY api_keys_write_insert ON public.api_keys FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));
CREATE POLICY api_keys_write_update ON public.api_keys FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage'))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));
CREATE POLICY api_keys_write_delete ON public.api_keys FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND (SELECT indicate_private.actor_has_tenant_permission('api_key.manage')));
CREATE OR REPLACE FUNCTION indicate_private.enforce_user_identity_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'user identity is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.enforce_user_identity_immutable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.enforce_user_identity_immutable() TO indicate_runtime;
DROP TRIGGER IF EXISTS users_identity_immutable_guard ON public.users;
CREATE TRIGGER users_identity_immutable_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION indicate_private.enforce_user_identity_immutable();
DROP POLICY IF EXISTS auth_identity_isolation_delete ON public.users;
REVOKE DELETE ON public.users FROM indicate_runtime;
DROP POLICY IF EXISTS organization_isolation_delete ON public.organizations;
CREATE POLICY organization_delete_deny ON public.organizations FOR DELETE TO indicate_runtime USING (false);
REVOKE DELETE ON public.organizations FROM indicate_runtime;
REVOKE UPDATE, DELETE ON public.runtime_config_audit_logs FROM indicate_runtime;
DROP POLICY IF EXISTS tenant_isolation_update ON public.audit_logs;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.audit_logs;
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_update ON public.runtime_config_audit_logs;
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_delete ON public.runtime_config_audit_logs;
DROP POLICY IF EXISTS permission_scope_isolation_insert ON public.permissions;
DROP POLICY IF EXISTS permission_scope_isolation_update ON public.permissions;
DROP POLICY IF EXISTS permission_scope_isolation_delete ON public.permissions;
CREATE POLICY permission_write_deny_insert ON public.permissions FOR INSERT TO indicate_runtime WITH CHECK (false);
CREATE POLICY permission_write_deny_delete ON public.permissions FOR DELETE TO indicate_runtime USING (false);
CREATE POLICY permission_write_deny_update ON public.permissions FOR UPDATE TO indicate_runtime USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_insert ON public.runtime_config_audit_logs;
CREATE POLICY runtime_config_audit_tenant_insert ON public.runtime_config_audit_logs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_insert ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_insert ON public.runtime_config_invalidation_intents FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_update ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_update ON public.runtime_config_invalidation_intents FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_delete ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_delete ON public.runtime_config_invalidation_intents FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_insert ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_insert ON public.webhook_replay_claims FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_update ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_update ON public.webhook_replay_claims FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id())) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_delete ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_delete ON public.webhook_replay_claims FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (37, 'rls_write_hardening', 'rls-write-hardening-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('93aeb0997e4f98316b7e0e2e5f229562da32e25b34a2bfdeed1e0b858f3701d0', 1788459000000);

-- ----------------------------------------------------------------------
-- 20260903030000_user_profile
-- ----------------------------------------------------------------------
-- User profile columns: avatar reference, bio, and locale preferences.
--
-- Curated from the `drizzle-kit generate` diff (kept verbatim): four nullable
-- columns with no defaults, so existing rows are untouched. avatar_url holds
-- either an https:// URL (OAuth provider avatar or user-supplied link) or an
-- `r2:`-prefixed private-bucket key resolved to a short-lived signed URL at
-- render time; writers validate the shape in application code. The existing
-- self-predicate RLS policies and the identity-immutability trigger already
-- cover these columns (no policy change required).

ALTER TABLE "users" ADD COLUMN "avatar_url" text;
ALTER TABLE "users" ADD COLUMN "bio" text;
ALTER TABLE "users" ADD COLUMN "locale" text;
ALTER TABLE "users" ADD COLUMN "timezone" text;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (38, 'user_profile', 'user-profile-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('b0a2f2516827b4a87d07a8864d51f30a9556802a6c73062e10e39ea253163018', 1788460469605);

-- ----------------------------------------------------------------------
-- 20260903030500_delivery_helpers
-- ----------------------------------------------------------------------
-- Delivery helper reconciliation: provide the two helpers the delivery
-- repository calls that were never recorded in a migration, and widen the
-- member display lookup with the stored avatar.
--
-- 1. is_delivery_pending_host(hostname, attempt_id): whether a domain
--    activation attempt is still in flight. Mirrors the in-memory delivery
--    fixture contract (activate operation, pending/processing status, early
--    activation states). SECURITY DEFINER so the pending-domain route can call
--    it before any tenant is resolved; STABLE, read-only.
-- 2. lookup_user_profile(user_id): display_name plus avatar_url under the
--    same caller guards as the retired lookup_user_display_name (verified
--    caller with an active membership in the current organization). Replaces
--    it; the two repository call sites move over in application code.

CREATE OR REPLACE FUNCTION indicate_private.is_delivery_pending_host(p_hostname text, p_attempt_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.domain_activation_attempts AS attempt
    WHERE attempt.id = p_attempt_id
      AND attempt.hostname = p_hostname
      AND attempt.operation = 'activate'
      AND attempt.status IN ('pending', 'processing')
      AND attempt.activation_state IN ('pending', 'cloudflare_verified', 'vercel_associated')
  )
$function$;
REVOKE ALL ON FUNCTION indicate_private.is_delivery_pending_host(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.is_delivery_pending_host(text, uuid) TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.lookup_user_profile(requested_user_id uuid)
RETURNS TABLE(display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT target_user.display_name, target_user.avatar_url
  FROM public.users AS target_user
  WHERE target_user.id = requested_user_id
    AND indicate_private.current_verified_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.memberships AS caller_membership
      WHERE caller_membership.organization_id = indicate_private.current_organization_id()
        AND caller_membership.user_id = indicate_private.current_verified_user_id()
        AND caller_membership.status = 'active'
    )
  LIMIT 1
$function$;
REVOKE ALL ON FUNCTION indicate_private.lookup_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.lookup_user_profile(uuid) TO indicate_runtime;
DROP FUNCTION IF EXISTS indicate_private.lookup_user_display_name(uuid);

CREATE OR REPLACE FUNCTION indicate_private.claim_delivery_invalidation_tasks(
  p_now timestamptz,
  p_limit integer,
  p_claim_token uuid,
  p_claim_expires_at timestamptz
) RETURNS SETOF public.invalidation_tasks
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id
    FROM public.invalidation_tasks
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.invalidation_tasks task
  SET status = 'processing', reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at, updated_at = p_now
  FROM candidates
  WHERE task.organization_id = candidates.organization_id AND task.id = candidates.id
  RETURNING task.*;
END;
$function$;
REVOKE ALL ON FUNCTION indicate_private.claim_delivery_invalidation_tasks(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_delivery_invalidation_tasks(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (39, 'delivery_helpers', 'delivery-helpers-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('0e075f7ef930dc4571d5341b931dbbea2a5b047781e6c7485884890f576a0231', 1788461000000);

-- ----------------------------------------------------------------------
-- 20260903031000_subscription_tiers
-- ----------------------------------------------------------------------
-- Subscription tiers: closed plan set plus per-plan quotas.
--
-- Curated from the `drizzle-kit generate` diff (kept verbatim at the top):
-- the plan enum, the plan_quotas table, and the column conversion. The
-- subscriptions table is empty in every environment this has reached, so the
-- text-to-enum rewrite is metadata-only; the legacy free-form value 'mvp'
-- used by old fixtures is retired in favor of 'starter'.
--
-- Hand-appended below the generated diff:
-- 1. Quota seeds matching the published tiers (NULL = unlimited).
-- 2. RLS on plan_quotas: tenant reads go through each organization's own
--    subscription row in application code; the table itself is global
--    reference data readable by the runtime role, writable only by the
--    migration credential.
-- 3. subscription_update keeps its (text) signature for caller compatibility
--    and casts to the enum at the two use sites (row write; audit payload
--    keeps the text form).

CREATE TYPE "public"."subscription_plan" AS ENUM('starter', 'growth', 'enterprise');
CREATE TABLE "plan_quotas" (
	"plan" "public"."subscription_plan" PRIMARY KEY NOT NULL,
	"max_domains" integer,
	"max_sites" integer,
	"max_members" integer,
	"max_api_keys" integer,
	CONSTRAINT "plan_quotas_nonnegative" CHECK (("plan_quotas"."max_domains" IS NULL OR "plan_quotas"."max_domains" > 0) AND ("plan_quotas"."max_sites" IS NULL OR "plan_quotas"."max_sites" > 0) AND ("plan_quotas"."max_members" IS NULL OR "plan_quotas"."max_members" > 0) AND ("plan_quotas"."max_api_keys" IS NULL OR "plan_quotas"."max_api_keys" > 0))
);

ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan" USING "plan"::"public"."subscription_plan";
INSERT INTO public.plan_quotas (plan, max_domains, max_sites, max_members, max_api_keys) VALUES
  ('starter', 10, 10, NULL, NULL),
  ('growth', 50, 50, NULL, NULL),
  ('enterprise', NULL, NULL, NULL, NULL);
ALTER TABLE public.plan_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_quotas FORCE ROW LEVEL SECURITY;
CREATE POLICY plan_quotas_runtime_read ON public.plan_quotas FOR SELECT TO indicate_runtime USING (true);
GRANT SELECT ON public.plan_quotas TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin');
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.permission_has_tenant(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan::public.subscription_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan::public.subscription_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (40, 'subscription_tiers', 'subscription-tiers-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('0d782559f1b08512714755fcce900a8bc33ebf7f1e5bb13c53f2d5e4b62b3c29', 1788462791337);

-- ----------------------------------------------------------------------
-- 20260903031500_dynamic_content
-- ----------------------------------------------------------------------
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
);
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
);
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "media_showcase" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "contact_channels" (
	"key" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "permission_definitions" (
	"scope" "permission_scope" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "permission_definitions_pk" PRIMARY KEY("scope","name")
);
CREATE TABLE "color_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"primary" text NOT NULL,
	"accent" text NOT NULL,
	"header_bg" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "template_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
INSERT INTO public.service_tiers (slug, name, target, summary, price, period, features, highlighted, cta, sort_order) VALUES
  ('starter', 'Network Starter', 'Untuk 5–10 portal dalam satu grup media', 'Untuk satu grup media yang baru mulai.', 'Rp 1.500.000', '/bulan', '["Hingga 10 Domain & Subdomain Situs", "1 Master Database PostgreSQL Supabase", "Integrasi Telegram Bot Redaksi", "Cloudflare CDN & R2 Media Storage", "Koleksi Master Template Layout", "Dasbor redaksi penuh", "Dukungan lewat surel"]', false, 'Pilih Paket Starter', 1),
  ('growth', 'Network Growth', 'Untuk 25–50 portal lintas unit usaha', 'Untuk jaringan portal daerah yang sedang tumbuh.', 'Rp 3.800.000', '/bulan', '["Hingga 50 Domain & Subdomain Situs", "Multi-Site Syndication Pipeline Graph", "Upstash Redis Queue & Leases", "REST API dan bot Telegram", "Klaster Warna Branding Semantik", "Dukungan Custom Domain Nameserver", "Prioritas Cloudflare Cache Purge API"]', true, 'Mulai Pengujian Gratis', 2),
  ('enterprise', 'Enterprise Scale', 'Untuk 100+ portal multi-organisasi', 'Untuk penerbit dengan kebutuhan tata kelola khusus.', 'Kustom', '', '["Kapasitas 100+ Domain & Subdomain Unlimited", "Isolasi Data PostgreSQL RLS Khusus", "SLA Uptime 99.99% Tergaransi", "Dukungan Migrasi Data Berita Massal", "Custom Webhook & API Key Unlimited", "Peran dan izin terperinci", "Pendampingan migrasi"]', false, 'Hubungi Tim Arsitek', 3);
INSERT INTO public.testimonials (id, quote, author, role, media, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007001', 'Dengan Indicate, tim redaksi kami menerbitkan satu artikel utama ke belasan portal dalam jaringan secara bersamaan, tanpa perlu masuk ke setiap dasbor satu per satu.', 'Bambang Suryono', 'Pemimpin Redaksi Grup Media', 'Media Nusantara Group', 1),
  ('00000000-0000-4000-8000-000000007002', 'Kecepatan pembersihan cache Cloudflare dan antrean Upstash Redis-nya sangat cepat. Artikel yang baru dirilis via Telegram Bot langsung tayang di portal publik dalam <1 detik.', 'Dian Sastrowardoyo', 'Head of Digital Infrastructure', 'Pers Daerah Bersatu', 2);
INSERT INTO public.faqs (id, question, answer, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007011', 'Apakah saya membutuhkan server terpisah untuk setiap domain berita?', 'Tidak. Seluruh domain berita (apex maupun subdomain) berjalan di atas 1 infrastruktur terpusat yang sama. Pemisahan data dan tema dilakukan secara otomatis berdasarkan nama host (exact-host isolation).', 1),
  ('00000000-0000-4000-8000-000000007012', 'Bagaimana cara wartawan menerbitkan berita dari luar kantor?', 'Redaksi dapat menerbitkan berita langsung via Dashboard Web, API integration, atau menggunakan Telegram Bot terverifikasi tanpa harus membuka laptop.', 2),
  ('00000000-0000-4000-8000-000000007013', 'Apakah satu artikel bisa tayang di lebih dari satu situs berita sekaligus?', 'Ya. Fitur multi-site syndication memungkinkan 1 artikel utama (canonical article) dipublikasikan ke multiple situs berita milik organisasi Anda tanpa menduplikasi data.', 3),
  ('00000000-0000-4000-8000-000000007014', 'Bagaimana dengan keamanan data dan performa saat lalu lintas tinggi?', 'Sistem menggunakan Cloudflare Enterprise-grade DNS & CDN, R2 Object Storage untuk media, Upstash Redis untuk antrean, dan PostgreSQL dengan Row Level Security (RLS) terisolasi per-organisasi.', 4);
INSERT INTO public.media_showcase (id, name, sort_order) VALUES
  ('00000000-0000-4000-8000-000000007021', 'Nusantara Post', 1),
  ('00000000-0000-4000-8000-000000007022', 'Meridian News', 2),
  ('00000000-0000-4000-8000-000000007023', 'Cakrawala Times', 3),
  ('00000000-0000-4000-8000-000000007024', 'Lentera Daily', 4),
  ('00000000-0000-4000-8000-000000007025', 'Samudra Press', 5),
  ('00000000-0000-4000-8000-000000007026', 'Warta Persada', 6),
  ('00000000-0000-4000-8000-000000007027', 'Arcadia News', 7),
  ('00000000-0000-4000-8000-000000007028', 'Kencana Post', 8);
INSERT INTO public.contact_channels (key, title, description, sort_order) VALUES
  ('email', 'Surel', 'Kirim kebutuhan Anda beserta jumlah domain dan wilayah yang direncanakan.', 1),
  ('telegram', 'Telegram', 'Tanya jawab singkat mengenai alur redaksi dan integrasi bot.', 2),
  ('visit', 'Peninjauan bersama', 'Sesi daring untuk menelusuri dasbor dan alur penerbitan.', 3);
INSERT INTO public.permission_definitions (scope, name, description, sort_order) VALUES
  ('organization', 'api_key.read', 'Read API key metadata', 1),
  ('organization', 'api_key.manage', 'Issue, rotate, and revoke API keys', 2),
  ('organization', 'telegram.manage', 'Manage Telegram identity mappings', 3),
  ('organization', 'subscription.read', 'Read Organization subscription', 4),
  ('organization', 'subscription.manage', 'Manage Organization subscription', 5);
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
  ('pine-forest', 'Pine Forest', 'Warna hijau pinus & mint segar. Cocok untuk media lingkungan hidup & komunitas lokal.', '#14532d', '#4ade80', '#062012');
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
  ('broadsheet-classic', 'Broadsheet Classic', 'Layout koran cetak korporat dengan pembatas garis vertikal lurus.', 'news');
INSERT INTO public.permissions (id, organization_id, name, scope, description)
VALUES (gen_random_uuid(), NULL, 'platform.content.manage', 'platform', 'Manage dynamic marketing content and theme presets')
ON CONFLICT DO NOTHING;
ALTER TABLE public.service_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.media_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_showcase FORCE ROW LEVEL SECURITY;
ALTER TABLE public.contact_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE public.permission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.color_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_presets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.template_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_presets FORCE ROW LEVEL SECURITY;
CREATE POLICY content_runtime_read ON public.service_tiers FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.service_tiers FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_tiers TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.testimonials FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.testimonials FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.faqs FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.faqs FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.media_showcase FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.media_showcase FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_showcase TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.contact_channels FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.contact_channels FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_channels TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.permission_definitions FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.permission_definitions FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_definitions TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.color_presets FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.color_presets FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_presets TO indicate_runtime;
CREATE POLICY content_runtime_read ON public.template_presets FOR SELECT TO indicate_runtime USING (true);
CREATE POLICY content_write_platform ON public.template_presets FOR ALL TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_presets TO indicate_runtime;
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
$function$;
REVOKE ALL ON FUNCTION indicate_private.org_ensure_permissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.org_ensure_permissions(uuid) TO indicate_runtime;
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
$function$;
REVOKE ALL ON FUNCTION indicate_private.resolve_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_user_by_email(text) TO indicate_runtime;
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
$function$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (41, 'dynamic_content', 'dynamic-content-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4a973a9327843ce673e23f44af30287ecf7d803c925f88bbaa2bc23cb01fde7c', 1788463000000);

-- ----------------------------------------------------------------------
-- 20260903032000_superadmin_tier_and_pro_plan
-- ----------------------------------------------------------------------
-- F1-DB: superadmin tier + pro subscription plan.
--
-- Forward-only. Enum additions use ADD VALUE (no existing rows are rewritten).
-- 1. `role_tier` gains 'superadmin'; `subscription_plan` gains 'pro',
--    following the CREATE TYPE pattern of 20260903021000_role_tier and
--    20260903031000_subscription_tiers.
-- 2. `plan_quotas` is repaired for all four packages. The previous seeds
--    (starter 10/10/unlimited/unlimited, growth 50/50/unlimited/unlimited,
--    enterprise unlimited) are replaced by the published F1 quotas; 'pro' is
--    inserted. RLS stays runtime-read-only (SELECT to indicate_runtime, no
--    write grant — writes happen only via this migration credential).
-- 3. Platform permission `platform.super_admin` (scope platform, org NULL) is
--    seeded as the replacement for `platform.customer.admin`. The old row is
--    NOT deleted; its description is marked [DEPRECATED]. A transition helper
--    `permission_has_platform_admin()` accepts either grant, and the current
--    platform-gated functions (customer_create/list/update, subscription_update,
--    resolve_user_by_email, actor_has_tenant_permission) are redefined onto it.
--    Legacy snake_case twins (create_customer, ...) are left untouched.
-- 4. `platform_organizations` registry + `is_platform_organization()` +
--    `roles_superadmin_platform_guard` trigger: roles with tier 'superadmin'
--    are rejected unless their organization is registered. The registry starts
--    empty, so the guard is fail-closed until an operator registers the
--    platform org and grants platform.super_admin via
--    src/database/scripts/grant-platform-super-admin.sql (one-time script).

ALTER TYPE "public"."role_tier" ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE "public"."subscription_plan" ADD VALUE IF NOT EXISTS 'pro';

INSERT INTO public.plan_quotas (plan, max_domains, max_sites, max_members, max_api_keys) VALUES
  ('starter', 5, 5, 1, 1),
  ('growth', 20, 20, 1, 3),
  ('pro', 50, 50, 3, 10),
  ('enterprise', 100, 100, 10, 30)
ON CONFLICT (plan) DO UPDATE SET
  max_domains = EXCLUDED.max_domains,
  max_sites = EXCLUDED.max_sites,
  max_members = EXCLUDED.max_members,
  max_api_keys = EXCLUDED.max_api_keys;
ALTER TABLE public.plan_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_quotas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_quotas_runtime_read ON public.plan_quotas;
CREATE POLICY plan_quotas_runtime_read ON public.plan_quotas FOR SELECT TO indicate_runtime USING (true);
GRANT SELECT ON public.plan_quotas TO indicate_runtime;

INSERT INTO public.permissions(id, organization_id, name, scope, description)
VALUES ('00000000-0000-4000-8000-000000006002', NULL, 'platform.super_admin', 'platform', 'Full platform administration (replaces platform.customer.admin)')
ON CONFLICT DO NOTHING;
UPDATE public.permissions
SET description = '[DEPRECATED — use platform.super_admin] Administer customer Organizations and subscriptions'
WHERE scope = 'platform' AND organization_id IS NULL AND name = 'platform.customer.admin';

CREATE TABLE IF NOT EXISTS "platform_organizations" (
  "organization_id" uuid PRIMARY KEY NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.platform_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_organizations_runtime_read ON public.platform_organizations;
CREATE POLICY platform_organizations_runtime_read ON public.platform_organizations FOR SELECT TO indicate_runtime USING (true);
GRANT SELECT ON public.platform_organizations TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.is_platform_organization(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_organizations
    WHERE organization_id = p_organization_id
  )
$function$;
REVOKE ALL ON FUNCTION indicate_private.is_platform_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.is_platform_organization(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.roles_superadmin_platform_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NEW.tier = 'superadmin' AND NOT indicate_private.is_platform_organization(NEW.organization_id) THEN
    RAISE EXCEPTION 'superadmin tier restricted to platform organization' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.roles_superadmin_platform_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS roles_superadmin_platform_guard ON public.roles;
CREATE TRIGGER roles_superadmin_platform_guard
BEFORE INSERT OR UPDATE OF organization_id, tier ON public.roles
FOR EACH ROW EXECUTE FUNCTION indicate_private.roles_superadmin_platform_guard();

CREATE OR REPLACE FUNCTION indicate_private.permission_has_platform_admin(p_actor_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  -- Transition helper: 'platform.super_admin' is canonical; the deprecated
  -- 'platform.customer.admin' grant is still honored until its removal.
  SELECT indicate_private.permission_has_platform(p_actor_id, 'platform.super_admin')
      OR indicate_private.permission_has_platform(p_actor_id, 'platform.customer.admin')
$function$;
REVOKE ALL ON FUNCTION indicate_private.permission_has_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.permission_has_platform_admin(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_subscription jsonb, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organizations(id, name, slug, status, customer_metadata, version, created_at, updated_at)
  VALUES (p_organization_id, p_name, p_slug, 'active', p_metadata, 1, p_now, p_now);
  PERFORM indicate_private.org_ensure_permissions(p_organization_id);
  IF p_subscription IS NOT NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_subscription->>'plan', (p_subscription->>'status')::public.subscription_status,
      (p_subscription->>'periodStartsAt')::timestamptz, (p_subscription->>'periodEndsAt')::timestamptz, 1, p_now, p_now);
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.create', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', 'active'), p_request_id, p_now);
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.customer_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, status record_status, customer_metadata jsonb, version integer, created_at timestamp with time zone, updated_at timestamp with time zone, subscription_plan text, subscription_status subscription_status, period_starts_at timestamp with time zone, period_ends_at timestamp with time zone, subscription_version integer, subscription_created_at timestamp with time zone, subscription_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.name, o.slug, o.status, o.customer_metadata, o.version, o.created_at, o.updated_at,
    s.plan, s.status, s.period_starts_at, s.period_ends_at, s.version, s.created_at, s.updated_at
  FROM public.organizations o LEFT JOIN public.subscriptions s ON s.organization_id = o.id
  ORDER BY o.name, o.id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.customer_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_name text, p_slug text, p_status record_status, p_metadata jsonb, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.organizations SET name = p_name, slug = p_slug, status = p_status,
    customer_metadata = p_metadata, version = version + 1, updated_at = p_now
  WHERE id = p_organization_id AND version = p_expected_version;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.update', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status','customerMetadata'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', p_status, 'customerMetadata', p_metadata), p_request_id, p_now);
  RETURN true;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform_admin(p_actor_id);
  IF NOT v_platform AND (
    indicate_private.current_organization_id() IS DISTINCT FROM p_organization_id
    OR NOT indicate_private.permission_has_tenant(p_actor_id, p_organization_id, 'subscription.manage')
  ) THEN
    RAISE EXCEPTION 'subscription permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan::public.subscription_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan::public.subscription_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.resolve_user_by_email(p_email text)
 RETURNS TABLE(id uuid, auth_user_id uuid, display_name text, status record_status)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT u.id, u.auth_user_id, u.display_name, u.status
  FROM public.users AS u
  WHERE u.email = p_email
    AND indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id())
  LIMIT 1
$function$;
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
    OR (SELECT indicate_private.permission_has_platform_admin((SELECT indicate_private.current_verified_user_id())))
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
$function$;
REVOKE ALL ON FUNCTION indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, jsonb, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.customer_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_list(uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.customer_update(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_update(uuid, text, uuid, integer, text, text, public.record_status, jsonb, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamptz, timestamptz, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.resolve_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.resolve_user_by_email(text) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (42, 'superadmin_tier_and_pro_plan', 'sha256:b64b1190545cc4e03ef08cedf935312a070df9caaa5cbd40f92a4e4764784e92');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('9e7fe18c34701738ddbc9a11a4738180812795429f07c594b7be1f0ea485e3b9', 1788504227006);

-- ----------------------------------------------------------------------
-- 20260903032500_billing_orders
-- ----------------------------------------------------------------------
-- F2a-DB: billing orders + subscription lockdown + access-state helper.
--
-- Forward-only.
-- 1. `billing_order_status` enum + tabel `packages`, `orders`, `invoices`,
--    `enterprise_leads`, `org_invitations` mengikuti src/database/schema/billing.ts.
--    `packages.plan` dipetakan 1:1 ke `subscription_plan` (starter/growth/pro/
--    enterprise) — tidak ada lagi pemetaan pro -> enterprise.
-- 2. Seed 4 paket jual (harga + kuota cermin plan_quotas). Idempoten via
--    WHERE NOT EXISTS per plan.
-- 3. RLS: packages runtime-read-only (katalog publik dibaca server-side via
--    runtime role). orders/invoices/enterprise_leads/org_invitations default-deny
--    (FORCE RLS, tanpa policy): semua akses lewat fungsi SECURITY DEFINER di bawah.
-- 4. Fungsi: billing_order_create / billing_order_submit_proof /
--    billing_order_decide (approve → upsert subscription active 30 hari + invoice
--    + audit) / billing_order_list_mine / billing_order_list_pending /
--    billing_lead_create. Invitation-redeem menyusul di F2b bersama kode aplikasi.
-- 5. `subscription_update` dikunci: cabang tenant `subscription.manage` dicabut,
--    hanya `permission_has_platform_admin()` yang lolos. Upgrade/downgrade lewat
--    order baru, bukan edit langsung.
-- 6. `subscription_access_state(org)` untuk penegakan masa tenggang di F2b:
--    'platform' (org platform selalu penuh), 'active', 'grace' (tenggang baca-saja
--    7 hari setelah period_ends_at), 'expired', 'suspended', 'cancelled', 'none'.

CREATE TYPE "public"."billing_order_status" AS ENUM('pending_payment', 'waiting_verification', 'active', 'rejected');
CREATE TABLE "packages" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "plan" text NOT NULL,
  "price_idr" integer NOT NULL,
  "max_domains" integer,
  "max_sites" integer,
  "max_members" integer,
  "max_api_keys" integer,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "packages_price_nonnegative" CHECK ("packages"."price_idr" >= 0),
  CONSTRAINT "packages_plan_values" CHECK ("packages"."plan" IN ('starter', 'growth', 'pro', 'enterprise')),
  CONSTRAINT "packages_quota_nonnegative" CHECK (("packages"."max_domains" IS NULL OR "packages"."max_domains" > 0) AND ("packages"."max_sites" IS NULL OR "packages"."max_sites" > 0) AND ("packages"."max_members" IS NULL OR "packages"."max_members" > 0) AND ("packages"."max_api_keys" IS NULL OR "packages"."max_api_keys" > 0))
);
CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE restrict,
  "org_id" uuid REFERENCES "public"."organizations"("id") ON DELETE restrict,
  "package_id" uuid NOT NULL REFERENCES "public"."packages"("id") ON DELETE restrict,
  "status" "public"."billing_order_status" DEFAULT 'pending_payment' NOT NULL,
  "proof_url" text,
  "decided_by" uuid,
  "decided_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoices" (
  "id" uuid PRIMARY KEY NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "public"."orders"("id") ON DELETE cascade,
  "amount" integer NOT NULL,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invoices_amount_nonnegative" CHECK ("invoices"."amount" >= 0)
);
CREATE TABLE "enterprise_leads" (
  "id" uuid PRIMARY KEY NOT NULL,
  "nama" text NOT NULL,
  "email" text NOT NULL,
  "kebutuhan" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "enterprise_leads_bounded" CHECK (length("enterprise_leads"."nama") BETWEEN 1 AND 200 AND length("enterprise_leads"."email") BETWEEN 3 AND 320 AND length("enterprise_leads"."kebutuhan") BETWEEN 1 AND 4000)
);
CREATE TABLE "org_invitations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "org_invitations_email_bounded" CHECK (length("org_invitations"."email") BETWEEN 3 AND 320)
);
CREATE INDEX "packages_active_idx" ON "packages" USING btree ("active");
CREATE INDEX "orders_org_status_idx" ON "orders" USING btree ("org_id","status");
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");
CREATE INDEX "orders_package_idx" ON "orders" USING btree ("package_id");
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
CREATE INDEX "invoices_order_idx" ON "invoices" USING btree ("order_id");
CREATE INDEX "enterprise_leads_email_idx" ON "enterprise_leads" USING btree ("email");
CREATE UNIQUE INDEX "org_invitations_token_hash_unique" ON "org_invitations" USING btree ("token_hash");
CREATE INDEX "org_invitations_org_email_idx" ON "org_invitations" USING btree ("org_id","email");
CREATE INDEX "org_invitations_expires_idx" ON "org_invitations" USING btree ("expires_at");

INSERT INTO public.packages (id, name, plan, price_idr, max_domains, max_sites, max_members, max_api_keys, active)
SELECT gen_random_uuid(), 'Starter', 'starter', 99000, 5, 5, 1, 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE plan = 'starter');
INSERT INTO public.packages (id, name, plan, price_idr, max_domains, max_sites, max_members, max_api_keys, active)
SELECT gen_random_uuid(), 'Growth', 'growth', 249000, 20, 20, 1, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE plan = 'growth');
INSERT INTO public.packages (id, name, plan, price_idr, max_domains, max_sites, max_members, max_api_keys, active)
SELECT gen_random_uuid(), 'Pro', 'pro', 399000, 50, 50, 3, 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE plan = 'pro');
INSERT INTO public.packages (id, name, plan, price_idr, max_domains, max_sites, max_members, max_api_keys, active)
SELECT gen_random_uuid(), 'Enterprise', 'enterprise', 550000, 100, 100, 10, 30, true
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE plan = 'enterprise');

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS packages_runtime_read ON public.packages;
CREATE POLICY packages_runtime_read ON public.packages FOR SELECT TO indicate_runtime USING (true);
GRANT SELECT ON public.packages TO indicate_runtime;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_leads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invitations FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION indicate_private.billing_order_create(p_actor_id uuid, p_request_id text, p_package_id uuid, p_org_id uuid, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_order uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.packages WHERE id = p_package_id AND active) THEN
    RAISE EXCEPTION 'package unavailable' USING ERRCODE = '42501';
  END IF;
  IF p_org_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
      RAISE EXCEPTION 'organization missing' USING ERRCODE = '42501';
    END IF;
    IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
       AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_org_id AND user_id = p_actor_id AND status = 'active') THEN
      RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
    END IF;
  END IF;
  INSERT INTO public.orders(id, user_id, org_id, package_id, status, created_at, updated_at)
  VALUES (v_order, p_actor_id, p_org_id, p_package_id, 'pending_payment', p_now, p_now);
  -- Audit order tanpa org menumpang ke org platform (audit_logs.organization_id
  -- ber-FK wajib); dilewati hanya jika registry platform belum ada.
  SELECT COALESCE(p_org_id, (SELECT organization_id FROM public.platform_organizations LIMIT 1)) INTO v_audit_org;
  IF v_audit_org IS NOT NULL THEN
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_audit_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.create', 'order', v_order::text, 'succeeded', ARRAY['package','status'], jsonb_build_object('packageId', p_package_id, 'status', 'pending_payment'), p_request_id, p_now);
  END IF;
  RETURN v_order;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.billing_order_submit_proof(p_actor_id uuid, p_request_id text, p_order_id uuid, p_proof_url text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid;
  v_audit_org uuid;
BEGIN
  SELECT org_id INTO v_org FROM public.orders WHERE id = p_order_id AND user_id = p_actor_id AND status = 'pending_payment';
  IF NOT FOUND THEN
    IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
      RAISE EXCEPTION 'order not found' USING ERRCODE = '42501';
    END IF;
    SELECT org_id INTO v_org FROM public.orders WHERE id = p_order_id AND status = 'pending_payment';
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  IF p_proof_url IS NULL OR length(p_proof_url) NOT BETWEEN 8 AND 2000 THEN
    RAISE EXCEPTION 'proof url invalid' USING ERRCODE = '42501';
  END IF;
  UPDATE public.orders SET proof_url = p_proof_url, status = 'waiting_verification', updated_at = p_now WHERE id = p_order_id;
  SELECT COALESCE(v_org, (SELECT organization_id FROM public.platform_organizations LIMIT 1)) INTO v_audit_org;
  IF v_audit_org IS NOT NULL THEN
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_audit_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.submit_proof', 'order', p_order_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'waiting_verification'), p_request_id, p_now);
  END IF;
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_submit_proof(uuid, text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_submit_proof(uuid, text, uuid, text, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.billing_order_decide(p_actor_id uuid, p_request_id text, p_order_id uuid, p_approve boolean, p_org_id uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid; v_plan text; v_price integer; v_period_end timestamptz := p_now + interval '30 days';
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT o.org_id, p.plan, p.price_idr INTO v_org, v_plan, v_price
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id
  WHERE o.id = p_order_id AND o.status = 'waiting_verification';
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_org IS NULL THEN
    IF p_org_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
      RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
    END IF;
    v_org := p_org_id;
    UPDATE public.orders SET org_id = v_org, updated_at = p_now WHERE id = p_order_id;
  END IF;
  IF NOT p_approve THEN
    UPDATE public.orders SET status = 'rejected', decided_by = p_actor_id, decided_at = p_now, updated_at = p_now WHERE id = p_order_id;
  ELSE
    UPDATE public.orders SET status = 'active', decided_by = p_actor_id, decided_at = p_now, updated_at = p_now WHERE id = p_order_id;
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (v_org, v_plan::public.subscription_plan, 'active', p_now, v_period_end, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO UPDATE SET plan = EXCLUDED.plan, status = 'active', period_starts_at = EXCLUDED.period_starts_at, period_ends_at = EXCLUDED.period_ends_at, version = public.subscriptions.version + 1, updated_at = EXCLUDED.updated_at;
    INSERT INTO public.invoices(id, order_id, amount, paid_at, created_at)
    VALUES (gen_random_uuid(), p_order_id, v_price, p_now, p_now);
    INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
    VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.activate', 'subscription', v_org::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', v_plan, 'status', 'active', 'periodEndsAt', v_period_end), p_request_id, p_now);
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.decide', 'order', p_order_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('approved', p_approve), p_request_id, p_now);
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_decide(uuid, text, uuid, boolean, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_decide(uuid, text, uuid, boolean, uuid, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.billing_order_list_mine(p_actor_id uuid)
 RETURNS TABLE(id uuid, package_name text, plan text, price_idr integer, status billing_order_status, org_id uuid, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT o.id, p.name, p.plan, p.price_idr, o.status, o.org_id, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id
  WHERE o.user_id = p_actor_id
    AND (o.user_id = indicate_private.current_verified_user_id()
         OR indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id()))
  ORDER BY o.created_at DESC
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_mine(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_mine(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.billing_order_list_pending(p_actor_id uuid)
 RETURNS TABLE(id uuid, user_email text, org_id uuid, package_name text, plan text, price_idr integer, proof_url text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, u.email, o.org_id, p.name, p.plan, p.price_idr, o.proof_url, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id JOIN public.users u ON u.id = o.user_id
  WHERE o.status = 'waiting_verification'
  ORDER BY o.created_at;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_pending(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_pending(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.billing_lead_create(p_nama text, p_email text, p_kebutuhan text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF p_nama IS NULL OR length(p_nama) NOT BETWEEN 1 AND 200 OR p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 OR p_kebutuhan IS NULL OR length(p_kebutuhan) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'lead fields invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.enterprise_leads(id, nama, email, kebutuhan) VALUES (v_id, p_nama, p_email, p_kebutuhan);
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_lead_create(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_lead_create(text, text, text) TO indicate_runtime;

-- Lockdown: subscription_update hanya untuk platform admin. Cabang tenant
-- `subscription.manage` dicabut — perubahan paket hanya lewat order + approve.
CREATE OR REPLACE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_plan text, p_status subscription_status, p_period_starts_at timestamp with time zone, p_period_ends_at timestamp with time zone, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
    VALUES (p_organization_id, p_plan::public.subscription_plan, p_status, p_period_starts_at, p_period_ends_at, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET plan = p_plan::public.subscription_plan, status = p_status, period_starts_at = p_period_starts_at,
      period_ends_at = p_period_ends_at, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['plan','status','periodStartsAt','periodEndsAt'], jsonb_build_object('plan', p_plan, 'status', p_status, 'periodStartsAt', p_period_starts_at, 'periodEndsAt', p_period_ends_at), p_request_id, p_now);
  RETURN true;
END
$function$;

-- Status akses langganan untuk penegakan F2b: platform > active > grace
-- (tenggang baca-saja 7 hari) > expired > suspended > cancelled > none.
CREATE OR REPLACE FUNCTION indicate_private.subscription_access_state(p_organization_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT CASE
    WHEN indicate_private.is_platform_organization(p_organization_id) THEN 'platform'
    WHEN s.organization_id IS NULL THEN 'none'
    WHEN s.status = 'cancelled' THEN 'cancelled'
    WHEN s.status = 'suspended' THEN 'suspended'
    WHEN s.status = 'past_due' THEN 'past_due'
    WHEN s.period_ends_at IS NULL THEN 'active'
    WHEN s.period_ends_at > now() THEN 'active'
    WHEN s.period_ends_at > now() - interval '7 days' THEN 'grace'
    ELSE 'expired'
  END
  FROM (SELECT p_organization_id AS organization_id) AS input
  LEFT JOIN public.subscriptions AS s ON s.organization_id = input.organization_id
$function$;
REVOKE ALL ON FUNCTION indicate_private.subscription_access_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.subscription_access_state(uuid) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (43, 'billing_orders', 'sha256:919acef65aada477471ff27155d13c3e455028c50bdd429661f18483d6e4e33f');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('3488d118ea00bb84798c22e20d6bc05394fff313d97d1b56c388b383d2eece99', 1788504227135);

-- ----------------------------------------------------------------------
-- 20260903033000_billing_permission_definitions
-- ----------------------------------------------------------------------
-- F2b-DB: seed seluruh definisi permission organisasi + backfill.
--
-- Temuan: permission_definitions hanya berisi 5 nama integrasi, sementara kode
-- mensyaratkan 27 nama (17 dashboard + 5 publishing + 5 integrasi). Akibatnya
-- org_ensure_permissions tidak pernah membuat baris permissions untuk
-- domain.manage / article.manage / dst, sehingga SELURUH mutasi dashboard
-- tenant pasti deny. Migrasi ini menutup gap tersebut.
-- 1. Insert 22 definisi yang hilang (idempoten via ON CONFLICT).
-- 2. Backfill org_ensure_permissions untuk semua org yang sudah ada.
-- 3. Grant SEMUA permission organisasi ke role Superadmin di org platform
--    (pemilik platform = akses penuh; pembatasan solo berlaku untuk org
--    pelanggan via ensureAdministratorRole di kode aplikasi).

INSERT INTO public.permission_definitions (scope, name, description, sort_order) VALUES
  ('organization', 'dashboard.read', 'Read dashboard overview', 6),
  ('organization', 'domain.read', 'Read domains', 7),
  ('organization', 'domain.manage', 'Manage domains', 8),
  ('organization', 'region.read', 'Read regions', 9),
  ('organization', 'region.manage', 'Manage regions', 10),
  ('organization', 'site.read', 'Read sites', 11),
  ('organization', 'site.manage', 'Manage sites', 12),
  ('organization', 'membership.read', 'Read memberships', 13),
  ('organization', 'membership.manage', 'Manage memberships', 14),
  ('organization', 'role.manage', 'Manage roles', 15),
  ('organization', 'publisher.read', 'Read publishers', 16),
  ('organization', 'publisher.manage', 'Manage publishers', 17),
  ('organization', 'publisher.verify', 'Verify publishers', 18),
  ('organization', 'article.read', 'Read articles', 19),
  ('organization', 'article.manage', 'Manage articles', 20),
  ('organization', 'analytics.read', 'Read analytics', 21),
  ('organization', 'audit.read', 'Read audit logs', 22),
  ('organization', 'media.read', 'Read media assets', 23),
  ('organization', 'media.manage', 'Manage media assets', 24),
  ('organization', 'publishing.read', 'Read publishing queue', 25),
  ('organization', 'publishing.request', 'Request publication', 26),
  ('organization', 'publishing.process', 'Process publication jobs', 27)
ON CONFLICT DO NOTHING;
SELECT indicate_private.org_ensure_permissions(id) FROM public.organizations;
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT r.organization_id, r.id, p.id
FROM public.roles r
JOIN public.platform_organizations po ON po.organization_id = r.organization_id
JOIN public.permissions p ON p.organization_id = r.organization_id AND p.scope = 'organization'
WHERE r.tier = 'superadmin' AND r.active
ON CONFLICT DO NOTHING;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (44, 'billing_permission_definitions', 'sha256:6c4febf5f09e1780c26c03a3334217e7c5f41d95541a6d8b9f6342e62b0376e2');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('3ca0a8f80378a57244173fae24549fea4d572fe8ce3f8accba7b1775638b8efa', 1788504227135);

-- ----------------------------------------------------------------------
-- 20260903033500_billing_orders_rls_reads
-- ----------------------------------------------------------------------
-- F2b-DB: izinkan baca orders untuk pemilik + platform admin.
--
-- orders memakai FORCE RLS tanpa policy (akses tulis hanya via fungsi). Baca
-- pasca-tulis di repository (fetchOrder) dan pratinjau bukti butuh SELECT
-- langsung: policy sempit ini mengizinkan pemilik order (dipetakan lewat
-- verified-user context yang selalu di-set billingContext) dan platform admin.
-- Penegakan otorisasi utama tetap di service layer.

DROP POLICY IF EXISTS orders_owner_read ON public.orders;
CREATE POLICY orders_owner_read ON public.orders FOR SELECT TO indicate_runtime USING (
  user_id IN (SELECT u.id FROM public.users AS u WHERE u.auth_user_id = indicate_private.current_verified_user_id())
  OR indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id())
);
GRANT SELECT ON public.orders TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (45, 'billing_orders_rls_reads', 'sha256:0fc95f920d1dd57d9e38f71044490497542fc01323c641762f3c87bf0597e8e1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('84d8e5b3fc8495c215e5e8d496a300c681bfd3bc6dcd79f7fc414018fae8e80a', 1788504227135);

-- ----------------------------------------------------------------------
-- 20260903034000_billing_invitations_sweep
-- ----------------------------------------------------------------------
-- F2b/F3-DB: undangan organisasi + penyapu kedaluwarsa + cron harian.
--
-- 1. org_invitations.role_id (role target) + created_by (audit).
--    Token mentah tidak pernah disimpan: hanya token_hash (sha256 heks).
-- 2. invite_create: platform admin ATAU anggota dengan membership.manage.
--    Masa berlaku 24 jam, terikat email.
-- 3. invite_redeem: user aktif terverifikasi; email user harus sama dengan email
--    undangan; single-use (accepted_at); menolak jika kuota member paket penuh.
-- 4. subscription_sweep_expired(): active yang lewat period_ends_at -> past_due;
--    past_due lebih dari 30 hari -> suspended. Setiap transisi diaudit.
--    Dijadwalkan harian via pg_cron (06:00 WIB = 23:00 UTC hari sebelumnya).
-- 5. Cabut grant platform.customer.admin lama (transisi ke super_admin selesai):
--    baris permission dipertahankan untuk kompatibilitas baca historis.

ALTER TABLE public.org_invitations
  ADD COLUMN IF NOT EXISTS role_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION indicate_private.invite_create(p_actor_id uuid, p_request_id text, p_org_id uuid, p_role_id uuid, p_email text, p_token_hash text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'membership.manage') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE organization_id = p_org_id AND id = p_role_id AND active AND tier <> 'superadmin') THEN
    RAISE EXCEPTION 'role unavailable' USING ERRCODE = '42501';
  END IF;
  IF p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 OR p_token_hash IS NULL OR length(p_token_hash) <> 64 THEN
    RAISE EXCEPTION 'invite fields invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.org_invitations(id, org_id, email, token_hash, role_id, expires_at, created_by, created_at, updated_at)
  VALUES (v_id, p_org_id, lower(p_email), p_token_hash, p_role_id, p_now + interval '24 hours', p_actor_id, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invite.create', 'invitation', v_id::text, 'succeeded', ARRAY['email','roleId'], jsonb_build_object('email', lower(p_email)), p_request_id, p_now);
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invite_create(uuid, text, uuid, uuid, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invite_create(uuid, text, uuid, uuid, text, text, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.invite_redeem(p_actor_id uuid, p_request_id text, p_token_hash text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_inv public.org_invitations%ROWTYPE; v_email text; v_plan public.subscription_plan; v_limit integer; v_members integer;
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = p_actor_id AND status = 'active';
  IF v_email IS NULL THEN RAISE EXCEPTION 'active user required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_inv FROM public.org_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF v_inv.id IS NULL OR v_inv.accepted_at IS NOT NULL OR v_inv.expires_at <= p_now THEN
    RAISE EXCEPTION 'invitation invalid' USING ERRCODE = '42501';
  END IF;
  IF lower(v_email) <> lower(v_inv.email) THEN
    RAISE EXCEPTION 'invitation invalid' USING ERRCODE = '42501';
  END IF;
  SELECT plan INTO v_plan FROM public.subscriptions WHERE organization_id = v_inv.org_id;
  IF v_plan IS NOT NULL THEN
    SELECT max_members INTO v_limit FROM public.plan_quotas WHERE plan = v_plan;
    IF v_limit IS NOT NULL THEN
      SELECT count(*) INTO v_members FROM public.memberships WHERE organization_id = v_inv.org_id AND status = 'active';
      IF v_members >= v_limit THEN RAISE EXCEPTION 'member quota exceeded' USING ERRCODE = '42501'; END IF;
    END IF;
  END IF;
  INSERT INTO public.memberships(organization_id, user_id, role_id, status, version, created_at, updated_at)
  VALUES (v_inv.org_id, p_actor_id, v_inv.role_id, 'active', 1, p_now, p_now)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', version = public.memberships.version + 1, updated_at = EXCLUDED.updated_at;
  UPDATE public.org_invitations SET accepted_at = p_now, updated_at = p_now WHERE id = v_inv.id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_inv.org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invite.redeem', 'membership', p_actor_id::text, 'succeeded', ARRAY['roleId','status'], jsonb_build_object('roleId', v_inv.role_id), p_request_id, p_now);
  RETURN v_inv.org_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invite_redeem(uuid, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invite_redeem(uuid, text, text, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.subscription_sweep_expired()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_count integer := 0;
BEGIN
  WITH moved AS (
    UPDATE public.subscriptions SET status = 'past_due', version = version + 1, updated_at = now()
    WHERE status = 'active' AND period_ends_at IS NOT NULL AND period_ends_at <= now()
    RETURNING organization_id, plan
  )
  SELECT count(*) INTO v_count FROM moved;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.expire', 'subscription', organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'past_due', 'plan', plan), 'sweep-expired', now()
  FROM public.subscriptions WHERE status = 'past_due' AND updated_at >= now() - interval '1 minute';
  WITH moved AS (
    UPDATE public.subscriptions SET status = 'suspended', version = version + 1, updated_at = now()
    WHERE status = 'past_due' AND period_ends_at IS NOT NULL AND period_ends_at <= now() - interval '30 days'
    RETURNING organization_id, plan
  )
  SELECT v_count + count(*) INTO v_count FROM moved;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.suspend', 'subscription', organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'suspended', 'plan', plan), 'sweep-expired', now()
  FROM public.subscriptions WHERE status = 'suspended' AND updated_at >= now() - interval '1 minute';
  RETURN v_count;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.subscription_sweep_expired() FROM PUBLIC;
SELECT cron.schedule('indicate-subscription-sweep', '0 23 * * *', 'SELECT indicate_private.subscription_sweep_expired()');

DELETE FROM public.platform_user_permissions
USING public.permissions
WHERE platform_user_permissions.permission_id = permissions.id
  AND permissions.scope = 'platform' AND permissions.organization_id IS NULL
  AND permissions.name = 'platform.customer.admin';

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (46, 'billing_invitations_sweep', 'sha256:f0717e92e585c501992a871a0e8b1b88c12f121675388f6531c6f3c7ddfc14f7');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6a00193514655c751ed89566b83b5903a3b9d6e8d3607958aa1deac340f14e89', 1788504227135);

-- ----------------------------------------------------------------------
-- 20260903034500_billing_service_tiers_active
-- ----------------------------------------------------------------------
-- F3-DB: kolom active untuk service_tiers.
--
-- Tabel konten lain (testimonials, faqs, media_showcase) sudah punya kolom
-- active; service_tiers tertinggal sehingga tier hanya bisa dihapus fisik.
-- Default true agar seed lama tetap tayang; bacaan publik memfilter active.

ALTER TABLE public.service_tiers ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (47, 'billing_service_tiers_active', 'sha256:54615ffa36e6ae636759cbd536b6612a23e505a4d7c76fb4256cfba23e17756c');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('7d64bba53505ca02a1c2f53396ad95a25590241dbfe420f517f9beabe0bff9d0', 1788504227139);

-- ----------------------------------------------------------------------
-- 20260903035000_billing_real_tiers_cleanup
-- ----------------------------------------------------------------------
-- F3-DB: hapus konten fiktif + seed tier paket resmi.
--
-- 1. Testimoni dan etalase media berisi nama orang/media rekaan yang tayang
--    sebagai konten nyata — dihapus total (tabel dibiarkan kosong; section
--    otomatis sembunyi). FAQ dan kanal kontak adalah konten generik yang sah.
-- 2. Seed service_tiers cermin tabel packages (satu kebenaran harga):
--    Starter 99rb, Growth 249rb, Pro 399rb, Enterprise 550rb.

DELETE FROM public.testimonials WHERE id IN (
  '00000000-0000-4000-8000-000000007001',
  '00000000-0000-4000-8000-000000007002'
);
DELETE FROM public.media_showcase WHERE id IN (
  '00000000-0000-4000-8000-000000007021',
  '00000000-0000-4000-8000-000000007022',
  '00000000-0000-4000-8000-000000007023',
  '00000000-0000-4000-8000-000000007024',
  '00000000-0000-4000-8000-000000007025',
  '00000000-0000-4000-8000-000000007026',
  '00000000-0000-4000-8000-000000007027',
  '00000000-0000-4000-8000-000000007028'
);
INSERT INTO public.service_tiers (slug, name, target, summary, price, period, features, highlighted, cta, sort_order, active) VALUES
  ('starter', 'Starter', 'Solo — hingga 5 domain & situs', 'Untuk satu redaksi yang baru mulai.', 'Rp99.000', '/bulan', '["5 domain & 5 situs", "Solo — 1 anggota", "1 API key", "Antrean penerbitan + media privat"]', false, 'Bayar & Aktifkan', 1, true),
  ('growth', 'Growth', 'Solo — hingga 20 domain & situs', 'Untuk jaringan portal daerah yang tumbuh.', 'Rp249.000', '/bulan', '["20 domain & 20 situs", "Solo — 1 anggota", "3 API key", "REST API dan bot Telegram"]', false, 'Bayar & Aktifkan', 2, true),
  ('pro', 'Pro', 'Tim kecil — hingga 50 domain & situs', 'Untuk redaksi bertim dengan banyak kanal.', 'Rp399.000', '/bulan', '["50 domain & 50 situs", "3 anggota tim", "10 API key", "Prioritas purge cache Cloudflare"]', true, 'Bayar & Aktifkan', 3, true),
  ('enterprise', 'Enterprise', 'Tim — hingga 100 domain & situs', 'Onboarding terjadwal setelah peninjauan kebutuhan.', 'Rp550.000', '/bulan', '["100 domain & 100 situs", "10 anggota tim", "30 API key", "Dukungan migrasi data massal"]', false, 'Hubungi via WhatsApp', 4, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, target = EXCLUDED.target, summary = EXCLUDED.summary,
  price = EXCLUDED.price, period = EXCLUDED.period, features = EXCLUDED.features,
  highlighted = EXCLUDED.highlighted, cta = EXCLUDED.cta, sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active, updated_at = now();

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (48, 'billing_real_tiers_cleanup', 'sha256:7ba04bb79e2daedc1d3ae858e597b46b778dc11cceee3a10ded88e1b7fc15406');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('1a2ea87001e5374974ae65e2ba6b782c54c556cb6723fefeb3c5ea9d5f44ffb8', 1788504227139);

-- ----------------------------------------------------------------------
-- 20260903035500_billing_advisor_hardening
-- ----------------------------------------------------------------------
-- F3-DB: advisor hardening (v49).
--
-- 1. Function-only tables (enterprise_leads, invoices, org_invitations):
--    akses langsung ditolak eksplisit (USING/WITH CHECK false) — semua baca
--    tulis lewat fungsi SECURITY DEFINER. Menjadikan default-deny eksplisit
--    sekaligus menutup temuan rls_enabled_no_policy.
-- 2. Index penutup untuk FK org_invitations.created_by (unindexed_foreign_keys).
-- 3. Policy content_write_platform (FOR ALL, 8 tabel konten) dipecah menjadi
--    INSERT/UPDATE/DELETE agar SELECT hanya dievaluasi satu policy
--    (content_runtime_read) — menutup multiple_permissive_policies.
--    TIDAK menyentuh: unused_index (DB pra-traffic; index dibutuhkan saat
--    volume datang) dan auth_leaked_password_protection (setting dashboard).

CREATE POLICY billing_function_only ON public.enterprise_leads FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY billing_function_only ON public.invoices FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY billing_function_only ON public.org_invitations FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS "org_invitations_created_by_idx" ON "org_invitations" USING btree ("created_by");
DROP POLICY IF EXISTS content_write_platform ON public.service_tiers;
DROP POLICY IF EXISTS content_write_platform ON public.testimonials;
DROP POLICY IF EXISTS content_write_platform ON public.faqs;
DROP POLICY IF EXISTS content_write_platform ON public.media_showcase;
DROP POLICY IF EXISTS content_write_platform ON public.contact_channels;
DROP POLICY IF EXISTS content_write_platform ON public.permission_definitions;
DROP POLICY IF EXISTS content_write_platform ON public.color_presets;
DROP POLICY IF EXISTS content_write_platform ON public.template_presets;
CREATE POLICY content_write_platform_insert ON public.service_tiers FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_update ON public.service_tiers FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_delete ON public.service_tiers FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_insert ON public.testimonials FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_update ON public.testimonials FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_delete ON public.testimonials FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_insert ON public.faqs FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_update ON public.faqs FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_delete ON public.faqs FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_insert ON public.media_showcase FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_update ON public.media_showcase FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_delete ON public.media_showcase FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_insert ON public.contact_channels FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_update ON public.contact_channels FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_delete ON public.contact_channels FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_insert ON public.permission_definitions FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_update ON public.permission_definitions FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_delete ON public.permission_definitions FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_insert ON public.color_presets FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_update ON public.color_presets FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_delete ON public.color_presets FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_insert ON public.template_presets FOR INSERT TO indicate_runtime WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_update ON public.template_presets FOR UPDATE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage'))) WITH CHECK ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));
CREATE POLICY content_write_platform_delete ON public.template_presets FOR DELETE TO indicate_runtime USING ((SELECT indicate_private.permission_has_platform((SELECT indicate_private.current_verified_user_id()), 'platform.content.manage')));

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (49, 'billing_advisor_hardening', 'sha256:7842175ae1c49ecac59af3ca022583d40fbe99747c439ef44b5f3751cac524b7');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('d640cfbb36b38f55fc02f89ac5892895f81572d7478f36a15440e4d53a6bd9be', 1788504227142);

-- ----------------------------------------------------------------------
-- 20260903036000_billing_users_email_idx
-- ----------------------------------------------------------------------
-- F3-DB: index users(email) dari temuan Index Recommendation.
--
-- Query audit (users by email -> memberships -> orgs/roles) seq-scan di
-- users.email karena belum ada index. Dua saran lainnya (memberships.user_id
-- dan roles.id standalone) DITOLAK dengan alasan: sudah ter-cover oleh
-- kolom awal index komposit yang ada (memberships_user_status_idx berawalan
-- user_id; roles_pk berawalan organization_id,id sesuai persis join-nya).
-- Index standalone di sana hanya menambah beban tulis tanpa manfaat baca.

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "public"."users" USING btree ("email");

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (50, 'billing_users_email_idx', 'sha256:03cae1232fe49299bc566bb4a749187df51b06ae221fb384a736a41b1c1625c8');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f6b4e2271d6142cc24c0dad8c6696f8454d33e9471bb64c987ebcd6d6d478aae', 1788504227142);

-- ----------------------------------------------------------------------
-- 20260903036500_billing_faq_random_ids
-- ----------------------------------------------------------------------
-- F3-DB: acak ID faq seed.
--
-- ID seed berurutan (...70011-70014) terlihat seperti mock. FAQs tidak
-- direferensikan FK mana pun, jadi aman diacak. Ke depan seed konten
-- memakai gen_random_uuid(), bukan UUID tetap.

UPDATE public.faqs SET id = gen_random_uuid(), updated_at = now()
WHERE id IN (
  '00000000-0000-4000-8000-000000007011',
  '00000000-0000-4000-8000-000000007012',
  '00000000-0000-4000-8000-000000007013',
  '00000000-0000-4000-8000-000000007014'
);

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (51, 'billing_faq_random_ids', 'sha256:bcabfe159c0a78ab0ae5b9b3fde8c2ffd55faa1840f761bb8b7c03e461bbbe30');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('022c10a71fa093b0979ef09be759030788f4d728d5863da5846dfbfcc672a1c8', 1788504227144);

-- ----------------------------------------------------------------------
-- 20260903037000_billing_real_checksums
-- ----------------------------------------------------------------------
-- F3-DB: checksum sha256 asli untuk migrasi v42-v51.
--
-- Kolom checksum memakai algoritma yang didokumentasikan migrasi
-- 20260903010500_migration_body_digests: normalisasi CRLF ke LF, ganti
-- literal checksum pada baris registrasi-diri dengan sentinel
-- sha256:0000000000000000000000000000000000000000000000000000000000000000,
-- lalu SHA-256 atas seluruh file UTF-8. Siapa pun bisa memverifikasi ulang
-- dengan satu perintah. Label '-v1' bukan checksum dan tidak dipakai lagi.

UPDATE public.indicate_schema_migrations SET checksum = 'sha256:b64b1190545cc4e03ef08cedf935312a070df9caaa5cbd40f92a4e4764784e92' WHERE version = 42;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:919acef65aada477471ff27155d13c3e455028c50bdd429661f18483d6e4e33f' WHERE version = 43;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:6c4febf5f09e1780c26c03a3334217e7c5f41d95541a6d8b9f6342e62b0376e2' WHERE version = 44;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:0fc95f920d1dd57d9e38f71044490497542fc01323c641762f3c87bf0597e8e1' WHERE version = 45;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:f0717e92e585c501992a871a0e8b1b88c12f121675388f6531c6f3c7ddfc14f7' WHERE version = 46;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:54615ffa36e6ae636759cbd536b6612a23e505a4d7c76fb4256cfba23e17756c' WHERE version = 47;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:7ba04bb79e2daedc1d3ae858e597b46b778dc11cceee3a10ded88e1b7fc15406' WHERE version = 48;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:7842175ae1c49ecac59af3ca022583d40fbe99747c439ef44b5f3751cac524b7' WHERE version = 49;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:03cae1232fe49299bc566bb4a749187df51b06ae221fb384a736a41b1c1625c8' WHERE version = 50;
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:bcabfe159c0a78ab0ae5b9b3fde8c2ffd55faa1840f761bb8b7c03e461bbbe30' WHERE version = 51;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (52, 'billing_real_checksums', 'sha256:fefdf3bf26bf9c7fa8de15cdf77c4033a33a7d6e3fb50b3f6ccfafa8c891d059');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('7bd6b57ba6482ca481036314feded0f96a65ed65f195ab615a7ec3e106c5e989', 1788504252403);

-- ----------------------------------------------------------------------
-- 20260903037500_billing_packages_plan_unique
-- ----------------------------------------------------------------------
-- F3-DB: unik per plan pada packages.
--
-- Satu plan tepat satu baris paket adalah invarian bisnis (seed idempoten
-- per plan, decide join per id). Unique constraint menegakkannya sekaligus
-- menutup saran index pada kolom plan.

ALTER TABLE public.packages ADD CONSTRAINT "packages_plan_unique" UNIQUE ("plan");

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (53, 'billing_packages_plan_unique', 'sha256:d0deed2abb01bd3527ddd9643a238cdbce7bdeae792b56863a3b9214efb1c44d');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('2c9245957e4e6776ef3f9f5fbe2d0345fc76c8d87fcacf59e46df19d2a55a618', 1788504940266);

-- ----------------------------------------------------------------------
-- 20260903038000_billing_pro_100_enterprise_custom
-- ----------------------------------------------------------------------
-- F2-DB: Pro menjadi 100 domain @ Rp550rb; Enterprise custom.
--
-- starter (5/99rb) dan growth (20/249rb) tidak berubah. Pro naik ke
-- 100/100/10/30 @ Rp550rb. Enterprise tanpa harga tetap (price 0 = custom,
-- wajib lewat lead + peninjauan); order paket enterprise langsung ditolak
-- di billing_order_create.

UPDATE public.plan_quotas SET max_domains = 100, max_sites = 100, max_members = 10, max_api_keys = 30 WHERE plan = 'pro';
UPDATE public.packages SET price_idr = 550000, max_domains = 100, max_sites = 100, max_members = 10, max_api_keys = 30, updated_at = now() WHERE plan = 'pro';
UPDATE public.packages SET price_idr = 0, max_domains = 100, max_sites = 100, max_members = 10, max_api_keys = 30, updated_at = now() WHERE plan = 'enterprise';
UPDATE public.service_tiers SET price = 'Rp550.000', target = 'Tim kecil — hingga 100 domain & situs', summary = 'Untuk redaksi bertim dengan banyak kanal.', features = '["100 domain & 100 situs", "10 anggota tim", "30 API key", "Prioritas purge cache Cloudflare"]', highlighted = true, cta = 'Bayar & Aktifkan', updated_at = now() WHERE slug = 'pro';
UPDATE public.service_tiers SET price = 'Kustom', target = 'Kebutuhan khusus — hubungi tim penjualan', summary = 'Cakupan dan harga disusun bersama kebutuhan Anda.', features = '["Kuota sesuai kesepakatan", "Onboarding terjadwal", "Dukungan migrasi data massal", "Manajer akun khusus"]', highlighted = false, cta = 'Hubungi Tim Penjualan', updated_at = now() WHERE slug = 'enterprise';

CREATE OR REPLACE FUNCTION indicate_private.billing_order_create(p_actor_id uuid, p_request_id text, p_package_id uuid, p_org_id uuid, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_order uuid := gen_random_uuid(); v_audit_org uuid; v_plan text; v_price integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  SELECT plan, price_idr INTO v_plan, v_price FROM public.packages WHERE id = p_package_id AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'package unavailable' USING ERRCODE = '42501';
  END IF;
  IF v_plan = 'enterprise' THEN
    RAISE EXCEPTION 'enterprise requires sales review' USING ERRCODE = '42501';
  END IF;
  IF p_org_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
      RAISE EXCEPTION 'organization missing' USING ERRCODE = '42501';
    END IF;
    IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
       AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_org_id AND user_id = p_actor_id AND status = 'active') THEN
      RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
    END IF;
  END IF;
  INSERT INTO public.orders(id, user_id, org_id, package_id, status, created_at, updated_at) VALUES (v_order, p_actor_id, p_org_id, p_package_id, 'pending_payment', p_now, p_now);
  SELECT COALESCE(p_org_id, (SELECT organization_id FROM public.platform_organizations LIMIT 1)) INTO v_audit_org;
  IF v_audit_org IS NOT NULL THEN
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_audit_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.create', 'order', v_order::text, 'succeeded', ARRAY['package','status'], jsonb_build_object('packageId', p_package_id, 'status', 'pending_payment'), p_request_id, p_now);
  END IF;
  RETURN v_order;
END
$function$;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (54, 'billing_pro_100_enterprise_custom', 'sha256:9e50b43e2e74ed57e1c0c9a943415e6dbcd473bbeea392d1f2579f2cd9b06fe4');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('7e3182e2c36af9723dbcd73110cf7aa08fe034c446957876f188d58f347ca97b', 1788505185488);

-- ----------------------------------------------------------------------
-- 20260903038500_billing_sales_copy
-- ----------------------------------------------------------------------
-- F2-DB: selaraskan teks service_tiers dengan copy penjualan baru.
--
-- Bahasa teknis (domain/API/onboarding) diganti bahasa pembeli. Harga dan
-- kuota tidak berubah — hanya kata-kata.

UPDATE public.service_tiers SET target = 'Punya portal berita sendiri mulai hari ini', summary = 'Terima beres: website berita profesional yang langsung bisa dipakai menulis dan terbit.', features = '["5 website berita siap tayang", "Desain cantik tinggal pilih", "Domain, hosting, dan keamanan kami yang urus", "Bantuan ramah lewat email"]', cta = 'Mulai Sekarang', updated_at = now() WHERE slug = 'starter';
UPDATE public.service_tiers SET target = 'Satu redaksi untuk banyak portal daerah', summary = 'Tulis satu kali, berita Anda tayang di semua portal sekaligus.', features = '["20 website berita siap tayang", "Terbit sekali, tayang di mana-mana", "Kelola dari HP, kerja dari mana saja", "Bantuan prioritas yang cepat tanggap"]', cta = 'Mulai Sekarang', updated_at = now() WHERE slug = 'growth';
UPDATE public.service_tiers SET target = 'Untuk grup media yang serius bertumbuh', summary = 'Kapasitas besar plus tim kami dampingi sampai benar-benar jalan.', features = '["100 website berita siap tayang", "Ajak rekan redaksi bergabung (10 orang)", "Pindahan dari sistem lama kami bantu", "Didampingi sampai jalan"]', cta = 'Ambil yang Pro', updated_at = now() WHERE slug = 'pro';
UPDATE public.service_tiers SET target = 'Ada kebutuhan khusus? Mari duduk bersama', summary = 'Ceritakan kebutuhan Anda, kami rancangkan solusinya.', features = '["Jumlah website mengikuti kebutuhan", "Pindahan data massal kami yang kerjakan", "Kontak khusus yang siap dihubungi", "Didampingi sampai jalan"]', cta = 'Hubungi Tim Penjualan', updated_at = now() WHERE slug = 'enterprise';

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (55, 'billing_sales_copy', 'sha256:e204f388be8bff97fea75619f7a981f3768652dba94f37a3324fbad2b1378d79');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('32af17f6c568bceb3faae02383a12916f2681452d8581dde2767ad1bb77edf10', 1788505427745);

-- ----------------------------------------------------------------------
-- 20260903039000_billing_tier_ladder
-- ----------------------------------------------------------------------
-- F2-DB: tangga paket berpatokan Pro 100 domain @ Rp550rb.
--
-- starter: 5 -> 10 domain @ Rp149rb; growth: 20 -> 50 domain @ Rp299rb.
-- Nilai per domain menurun ke atas (14,9rb -> 6rb -> 5,5rb) sehingga Pro
-- selalu paling worth it. Enterprise custom tidak berubah.

UPDATE public.plan_quotas SET max_domains = 10, max_sites = 10 WHERE plan = 'starter';
UPDATE public.plan_quotas SET max_domains = 50, max_sites = 50 WHERE plan = 'growth';
UPDATE public.packages SET price_idr = 149000, max_domains = 10, max_sites = 10, updated_at = now() WHERE plan = 'starter';
UPDATE public.packages SET price_idr = 299000, max_domains = 50, max_sites = 50, updated_at = now() WHERE plan = 'growth';
UPDATE public.service_tiers SET price = 'Rp149.000', target = 'Punya 10 portal berita sendiri mulai hari ini', features = '["10 website berita siap tayang", "Desain cantik tinggal pilih", "Domain, hosting, dan keamanan kami yang urus", "Bantuan ramah lewat email"]', updated_at = now() WHERE slug = 'starter';
UPDATE public.service_tiers SET price = 'Rp299.000', target = 'Satu redaksi untuk 50 portal daerah', features = '["50 website berita siap tayang", "Terbit sekali, tayang di mana-mana", "Kelola dari HP, kerja dari mana saja", "Bantuan prioritas yang cepat tanggap"]', updated_at = now() WHERE slug = 'growth';

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (56, 'billing_tier_ladder', 'sha256:2b383ecff5460252d7e8d2e8ef3d7cf7530c933157c75ef3d7bd40703884dc0c');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ca8752a2190ab86ab5152325e86ac81cca59ded6270407a69b1078122282625b', 1788505642042);

-- ----------------------------------------------------------------------
-- 20260903039500_billing_buyer_faqs
-- ----------------------------------------------------------------------
-- F2-DB: FAQ menjadi 12 butir jawaban pembeli.
--
-- Mengganti 4 FAQ teknis lama dengan 12 FAQ seputar beli, bayar, tenggang,
-- domain, pindah sistem, dan bantuan — cermin fallback kode.

DELETE FROM public.faqs;
INSERT INTO public.faqs (id, question, answer, sort_order, active) VALUES
  (gen_random_uuid(), 'Apakah saya membutuhkan server terpisah untuk setiap portal berita?', 'Tidak. Seluruh portal Anda berjalan di atas 1 infrastruktur terpusat yang sama. Pemisahan data dan tampilan dilakukan otomatis berdasarkan nama domain, jadi nambah portal tidak nambah urusan server.', 1, true),
  (gen_random_uuid(), 'Bagaimana cara wartawan menerbitkan berita dari luar kantor?', 'Cukup buka dasbor dari HP atau kirim via chat Telegram yang sudah didaftarkan. Tidak perlu laptop, tidak perlu datang ke kantor.', 2, true),
  (gen_random_uuid(), 'Apakah satu artikel bisa tayang di lebih dari satu situs sekaligus?', 'Ya. Tulis satu kali, pilih situs-situs tujuannya, lalu terbitkan. Status tiap penayangan terpantau satu per satu.', 3, true),
  (gen_random_uuid(), 'Bagaimana cara mulai berlangganan?', 'Daftar akun, pilih paket, buat order, bayar, lalu unggah bukti bayarnya. Tim kami memverifikasi paling lambat 1x24 jam, setelah itu langganan aktif 30 hari.', 4, true),
  (gen_random_uuid(), 'Apa yang terjadi kalau masa aktif habis?', 'Anda mendapat masa tenggang baca 7 hari — data aman dan masih bisa dilihat. Perpanjang kapan saja untuk kembali menulis dan menerbitkan seperti biasa.', 5, true),
  (gen_random_uuid(), 'Apakah nama domain tetap milik saya?', 'Ya, 100%. Domain dibeli dan dipegang atas nama Anda. Berhenti kapan pun, domain dan seluruh konten dibawa pergi.', 6, true),
  (gen_random_uuid(), 'Bisakah naik atau turun paket di tengah jalan?', 'Bisa. Buat order paket baru dari halaman Langganan; setelah diverifikasi, paket langsung berganti dan masa aktif dihitung ulang 30 hari.', 7, true),
  (gen_random_uuid(), 'Bagaimana paket Enterprise bekerja?', 'Hubungi tim penjualan lewat WhatsApp, ceritakan kebutuhan dan jumlah websitenya. Kami susun penawaran yang pas, lalu jadwalkan onboarding dan pindahan data.', 8, true),
  (gen_random_uuid(), 'Apakah data redaksi saya tercampur dengan pelanggan lain?', 'Tidak. Setiap data terikat pada satu organisasi dan pemisahannya ditegakkan sampai lapisan basis data. Pelanggan lain tidak bisa mengintip data Anda lewat domain apa pun.', 9, true),
  (gen_random_uuid(), 'Saya sudah punya website berjalan. Bisa pindah?', 'Bisa. Paket Pro ke atas mencakup bantuan pindahan, dan paket Enterprise mencakup pindahan data massal yang kami kerjakan. Ceritakan sistem lama Anda saat mendaftar.', 10, true),
  (gen_random_uuid(), 'Apakah ada masa percobaan gratis?', 'Tidak ada trial otomatis, tapi Anda bisa melihat semua paket beserta batasnya secara terbuka sebelum membayar. Paket Starter mulai Rp149rb per bulan.', 11, true),
  (gen_random_uuid(), 'Bagaimana kalau butuh bantuan?', 'Paket Starter dan Growth dilayani lewat email dan prioritas; paket Pro didampingi sampai jalan; Enterprise punya kontak khusus. Semua paket dijawab manusia, bukan bot.', 12, true);

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (57, 'billing_buyer_faqs', 'sha256:695776f7a12fd19915a298e1273f22ae09adf1c58866a5a7b37552b8969f70bf');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('27e9d8c9b38d97ce13a65bb29ac57e524c793112c089c621b617379535fe395a', 1788509307389);

-- ----------------------------------------------------------------------
-- 20260903040000_contact_channel_hrefs
-- ----------------------------------------------------------------------
-- Kanal kontak kini membawa tautan (href) + salinan baru berisi alamat asli.
--
-- Menambah kolom href nullable, menambah baris WhatsApp, dan menyelaraskan
-- judul/deskripsi/urutan dengan fallback kode supaya DB dan kode sejalan.

ALTER TABLE public.contact_channels ADD COLUMN href text;
INSERT INTO public.contact_channels (key, title, description, href, sort_order) VALUES
  ('email', 'Surel', 'officialelsa21@gmail.com — kirim kebutuhan Anda beserta jumlah domain dan wilayah yang direncanakan.', 'mailto:officialelsa21@gmail.com', 1),
  ('whatsapp', 'WhatsApp', '0856-4115-9405 — jalur tercepat untuk paket Enterprise, pindahan sistem, atau pertanyaan harga.', 'https://wa.me/6285641159405?text=Halo%20Indicate%2C%20saya%20ingin%20bertanya.', 2),
  ('telegram', 'Telegram', '@eliyantosarage — tanya jawab singkat mengenai alur redaksi dan integrasi bot.', 'https://t.me/eliyantosarage', 3),
  ('visit', 'Peninjauan bersama', 'Sesi daring untuk menelusuri dasbor dan alur penerbitan — jadwalkan lewat WhatsApp atau surel.', NULL, 4)
ON CONFLICT (key) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, href = EXCLUDED.href, sort_order = EXCLUDED.sort_order;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (58, 'contact_channel_hrefs', 'sha256:fa08361431055962bcd035b3036a8e17fc39711fb1fe4a720cea042cbb9d7da4');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('267a0b397988ce88a8675f025201e6d4fd9da8d246ada57d38982cf59f755d7e', 1788519423638);

-- ----------------------------------------------------------------------
-- 20260903040500_publication_overrides
-- ----------------------------------------------------------------------
-- Diferensiasi per-target: override judul/deskripsi/gambar per publikasi.
--
-- Satu artikel tayang identik di banyak publisher akan saling menekan di hasil
-- pencarian. Kolom nullable ini memungkinkan tiap target memiliki varian
-- judul, deskripsi, dan gambar sendiri; NULL berarti memakai kanonis artikel.

ALTER TABLE public.article_sites ADD COLUMN custom_title text;
ALTER TABLE public.article_sites ADD COLUMN custom_description text;
ALTER TABLE public.article_sites ADD COLUMN custom_image_media_id uuid;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (59, 'publication_overrides', 'sha256:019aedae063ec26380b72439ed59c008166d5a8d3b429be3e7b28c16d2fe99f6');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('883f702c365d34ed4b1f56f01c70810f87634536d36dcaf3d89c98fd388f9299', 1788530214428);

-- ----------------------------------------------------------------------
-- 20260903041000_publishing_unpublished_state
-- ----------------------------------------------------------------------
-- Penarikan publikasi per-target: state terminal `unpublished`.
--
-- PostgreSQL tidak mengizinkan ALTER TYPE ... ADD VALUE di dalam blok
-- transaksi; terapkan file ini di luar transaksi (psql / SQL editor).

ALTER TYPE publishing_state ADD VALUE 'unpublished';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (60, 'publishing_unpublished_state', 'sha256:501add921dcf4a38e130a9577d6f79e9ffab08defa1c90febc22268010e70f4a');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6a56c170c43d7727b6448f552e5b9ba80f0307cca44bb588dce4dc87351d9792', 1788531231180);

-- ----------------------------------------------------------------------
-- 20260903041500_release_manifest_source_version
-- ----------------------------------------------------------------------
-- Rename the rollout-manifest source column to drop the retired env-based
-- terminology. No behavior change; the release-manifest tooling never ran
-- (zero rows) and no application code reads this column.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.runtime_config_release_manifests RENAME COLUMN legacy_source_version TO source_version;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (61, 'release_manifest_source_version', 'sha256:d964c9cc8b7f459386704716e48ec545cdd24772b249248ed956d4620462c2f7');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ddcb8dc0513c61286093311f7025edef68c7de36e5bf9c25415181b8e0ba7315', 1788539332744);

-- ----------------------------------------------------------------------
-- 20260903042000_fix_site_settings_robots_cast
-- ----------------------------------------------------------------------
-- Fix the site-settings read function: the declared return column
-- `seo_robots_directive text` received the raw enum value, so every call
-- failed with "structure of query does not match function result type"
-- (even on an empty table). Cast to text like the sibling media-state
-- column already does. Signature unchanged, so CREATE OR REPLACE suffices.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE OR REPLACE FUNCTION indicate_private.read_runtime_config_site_settings()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  locale text,
  seo_default_title text,
  seo_default_description text,
  seo_robots_directive text,
  seo_open_graph_site_name text,
  seo_schema_version integer,
  fallback_media_id uuid,
  fallback_media_object_key text,
  fallback_media_state text,
  fallback_media_organization_id uuid,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT ss.organization_id, ss.site_id, ss.locale, ss.seo_default_title,
         ss.seo_default_description, ss.seo_robots_directive::text,
         ss.seo_open_graph_site_name, ss.seo_schema_version,
         ss.fallback_media_id, m.object_key, m.state::text, m.organization_id,
         ss.version
  FROM public.site_settings AS ss
  LEFT JOIN public.media AS m
    ON m.organization_id = ss.organization_id AND m.id = ss.fallback_media_id
  ORDER BY ss.organization_id, ss.site_id;
END
$$;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (62, 'fix_site_settings_robots_cast', 'sha256:90701d84dbb02442ee4b650d91dbd8fdf8226873a6bcce9a077cee3b4862bf80');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('fe7e26fd5533d1058909e05df04d4c5e5cf4e8210dcbd5ce110543d6c56e0283', 1788539636259);

-- ----------------------------------------------------------------------
-- 20260903042500_site_settings_default_media
-- ----------------------------------------------------------------------
-- Rename the per-site fallback media column to default media terminology,
-- matching the global default asset (public/assets/default.png). Metadata-only
-- renames: no data moves, no behavior change. All dependent functions are
-- replaced in the same transaction so no execution can observe the old name.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.site_settings RENAME COLUMN fallback_media_id TO default_media_id;
ALTER TABLE public.site_settings RENAME CONSTRAINT site_settings_fallback_media_fk TO site_settings_default_media_fk;
CREATE OR REPLACE FUNCTION indicate_private.guard_active_site_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.activation_state = 'active' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.site_settings AS ss
      WHERE ss.organization_id = NEW.organization_id
        AND ss.site_id = NEW.id
        AND ss.locale IS NOT NULL
        AND ss.seo_default_title IS NOT NULL
        AND ss.seo_default_description IS NOT NULL
        AND ss.seo_robots_directive IS NOT NULL
        AND ss.seo_open_graph_site_name IS NOT NULL
        AND ss.seo_schema_version IS NOT NULL
        AND ss.default_media_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.media AS m
          WHERE m.organization_id = ss.organization_id
            AND m.id = ss.default_media_id
            AND m.state = 'active'
        )
    ) THEN
      RAISE EXCEPTION 'active site requires complete same-organization site settings and active default media' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE FUNCTION indicate_private.guard_site_settings_against_active_site()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sites AS s
    WHERE s.organization_id = OLD.organization_id
      AND s.id = OLD.site_id
      AND s.status = 'active'
      AND s.activation_state = 'active'
  ) AND (
    OLD.locale IS NULL OR OLD.seo_default_title IS NULL OR OLD.seo_default_description IS NULL
    OR OLD.seo_robots_directive IS NULL OR OLD.seo_open_graph_site_name IS NULL OR OLD.seo_schema_version IS NULL
    OR OLD.default_media_id IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot invalidate site settings while the site is active' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END
$$;
-- OUT parameter names are part of the row type, so REPLACE is rejected;
-- drop first (no dependents exist) and recreate with identical privileges.
DROP FUNCTION IF EXISTS indicate_private.read_runtime_config_site_settings();
CREATE FUNCTION indicate_private.read_runtime_config_site_settings()
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  locale text,
  seo_default_title text,
  seo_default_description text,
  seo_robots_directive text,
  seo_open_graph_site_name text,
  seo_schema_version integer,
  default_media_id uuid,
  default_media_object_key text,
  default_media_state text,
  default_media_organization_id uuid,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  RETURN QUERY
  SELECT ss.organization_id, ss.site_id, ss.locale, ss.seo_default_title,
         ss.seo_default_description, ss.seo_robots_directive::text,
         ss.seo_open_graph_site_name, ss.seo_schema_version,
         ss.default_media_id, m.object_key, m.state::text, m.organization_id,
         ss.version
  FROM public.site_settings AS ss
  LEFT JOIN public.media AS m
    ON m.organization_id = ss.organization_id AND m.id = ss.default_media_id
  ORDER BY ss.organization_id, ss.site_id;
END
$$;
REVOKE ALL ON FUNCTION indicate_private.read_runtime_config_site_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.read_runtime_config_site_settings() TO indicate_runtime;
-- Input parameter names cannot change under OR REPLACE either; drop first
-- (no dependents exist) and recreate with identical privileges.
DROP FUNCTION IF EXISTS indicate_private.mutate_site_settings(uuid, uuid, uuid, text, text, text, text, text, integer, uuid, integer);
CREATE FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_default_media_id uuid, p_expected_version integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_after integer; v_revision bigint;
BEGIN
  IF NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'site_settings.manage') THEN
    RAISE EXCEPTION 'site settings mutation denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.site_settings AS ss
     SET locale = p_locale, seo_default_title = p_seo_default_title,
         seo_default_description = p_seo_default_description, seo_robots_directive = p_seo_robots_directive,
         seo_open_graph_site_name = p_seo_open_graph_site_name, seo_schema_version = p_seo_schema_version,
         default_media_id = p_default_media_id, version = version + 1, updated_at = now()
   WHERE ss.organization_id = p_org_id AND ss.site_id = p_site_id AND ss.version = p_expected_version
   RETURNING ss.version INTO v_after;
  IF v_after IS NULL THEN RAISE EXCEPTION 'runtime config version conflict' USING ERRCODE = '55000'; END IF;
  v_revision := nextval(pg_get_serial_sequence('public.runtime_config_revisions', 'version'));
  INSERT INTO public.runtime_config_revisions (version, environment, committed_at, mutation_kind)
  VALUES (v_revision, current_setting('app.environment', true), now(), 'site_settings');
  INSERT INTO public.runtime_config_audit_logs (
    id, organization_id, actor_type, actor_id, environment, action, target_type, target_id,
    expected_version, resulting_version, changed_fields, outcome, request_id
  ) VALUES (
    gen_random_uuid(), p_org_id, 'user', p_actor_id, current_setting('app.environment', true),
    'update', 'site_settings', p_site_id, p_expected_version, v_after,
    ARRAY['locale','seo_default_title','seo_default_description','seo_robots_directive',
          'seo_open_graph_site_name','seo_schema_version','default_media_id'],
    'succeeded', current_setting('app.request_id', true)
  );
  INSERT INTO public.runtime_config_invalidation_intents (
    id, runtime_revision, environment, partition_kind, organization_id, site_id, status, attempts, next_attempt_at
  ) VALUES (gen_random_uuid(), v_revision, current_setting('app.environment', true), 'site', p_org_id, p_site_id, 'pending', 0, now());
  RETURN v_after;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_default_media_id uuid, p_expected_version integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.mutate_site_settings(p_actor_id uuid, p_org_id uuid, p_site_id uuid, p_locale text, p_seo_default_title text, p_seo_default_description text, p_seo_robots_directive text, p_seo_open_graph_site_name text, p_seo_schema_version integer, p_default_media_id uuid, p_expected_version integer) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (63, 'site_settings_default_media', 'sha256:3587bfd7e7328d57727d2931b739079ed744ab1ea582fb0f75657c4f5f9ef367');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('01ce40cb4444c82f9cde77d0627482772bfa9403a1f05e94d08f95e98fc55114', 1788581551812);

-- ----------------------------------------------------------------------
-- 20260903043000_site_settings_default_media_idx
-- ----------------------------------------------------------------------
-- Rename the site-settings default media index to match the column rename in
-- migration 63. Name-only change; the indexed columns are unchanged.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER INDEX public.site_settings_fallback_media_idx RENAME TO site_settings_default_media_idx;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (64, 'site_settings_default_media_idx', 'sha256:2e67a8d1b3b8db4724864707c4fd579de709886b20a66990e9f8e80ac42cbe32');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f1999940a49683967cbd096a5bdb31c4bfd3872492d10d1a654788ca8d2d9152', 1788581825956);

-- ----------------------------------------------------------------------
-- 20260903043500_media_thumb_object_key
-- ----------------------------------------------------------------------
-- Store the derived listing-thumbnail key alongside the full media object.
-- Nullable with no backfill: existing rows resolve thumbnails to the full
-- object. The key is derived server-side from `object_key`, never trusted
-- from client input; uniqueness inherits the reservation collision token.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.media ADD COLUMN thumb_object_key text;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (65, 'media_thumb_object_key', 'sha256:89c492d28fa109b8ce1ce0cb10ffb78cf05c88e8a496bbf2bcf01ca3ad943541');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ce92b5bca494142d99bfc6093bd3b75c1942afa3f136c236e324c1edebe94526', 1788583606950);

-- ----------------------------------------------------------------------
-- 20260903044000_site_settings_media_indexes
-- ----------------------------------------------------------------------
-- Record the site-settings media indexes that exist in live databases but were
-- never captured by a migration. Idempotent: fresh environments gain the
-- indexes, existing ones are untouched. The indexes cover the foreign-key
-- columns used by the delivery media joins.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE INDEX IF NOT EXISTS site_settings_logo_media_idx ON public.site_settings USING btree (organization_id, logo_media_id);
CREATE INDEX IF NOT EXISTS site_settings_favicon_media_idx ON public.site_settings USING btree (organization_id, favicon_media_id);
CREATE INDEX IF NOT EXISTS site_settings_default_media_idx ON public.site_settings USING btree (organization_id, default_media_id);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (66, 'site_settings_media_indexes', 'sha256:2ced167bcaf0262a9a2d61d4b4550fc4fd2f7c6d450e1cf2305a1012e523f0fd');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5f4a02f42c5b47fb669f7c3b0d6312b470c0edc6d8e4ff78314b7600b584f0f2', 1788585575465);

-- ----------------------------------------------------------------------
-- 20260903044500_subscription_expiry_warnings
-- ----------------------------------------------------------------------
-- Tenant-visible expiry warnings for active subscriptions.
--
-- The nightly sweep enforces expiry silently; tenants first learn about it
-- from a denial. These warning intents land in audit_logs (the dashboard Log
-- Keamanan view), tiered so the 7-day and 1-day notices never double-fire on
-- the same night: 7d covers (1d, 7d], 1d covers (0, 1d]. One warning per
-- threshold window; the sweep itself remains the sole enforcer.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE OR REPLACE FUNCTION indicate_private.subscription_sweep_expired()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_count integer := 0;
BEGIN
  WITH moved AS (
    UPDATE public.subscriptions SET status = 'past_due', version = version + 1, updated_at = now()
    WHERE status = 'active' AND period_ends_at IS NOT NULL AND period_ends_at <= now()
    RETURNING organization_id, plan
  )
  SELECT count(*) INTO v_count FROM moved;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.expire', 'subscription', organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'past_due', 'plan', plan), 'sweep-expired', now()
  FROM public.subscriptions WHERE status = 'past_due' AND updated_at >= now() - interval '1 minute';
  WITH moved AS (
    UPDATE public.subscriptions SET status = 'suspended', version = version + 1, updated_at = now()
    WHERE status = 'past_due' AND period_ends_at IS NOT NULL AND period_ends_at <= now() - interval '30 days'
    RETURNING organization_id, plan
  )
  SELECT v_count + count(*) INTO v_count FROM moved;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.suspend', 'subscription', organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'suspended', 'plan', plan), 'sweep-expired', now()
  FROM public.subscriptions WHERE status = 'suspended' AND updated_at >= now() - interval '1 minute';
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT s.organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.expiring_warning', 'subscription', s.organization_id::text, 'succeeded', ARRAY['periodEndsAt'], jsonb_build_object('threshold', '7d', 'periodEndsAt', s.period_ends_at, 'plan', s.plan), 'sweep-expiry-warning', now()
  FROM public.subscriptions AS s
  WHERE s.status = 'active' AND s.period_ends_at IS NOT NULL
    AND s.period_ends_at > now() + interval '1 day' AND s.period_ends_at <= now() + interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.audit_logs AS a
      WHERE a.organization_id = s.organization_id AND a.action = 'subscription.expiring_warning'
        AND a.after->>'threshold' = '7d' AND a.occurred_at > now() - interval '8 days'
    );
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT s.organization_id, gen_random_uuid(), 'system', 'subscription-sweeper', 'worker', 'subscription.expiring_warning', 'subscription', s.organization_id::text, 'succeeded', ARRAY['periodEndsAt'], jsonb_build_object('threshold', '1d', 'periodEndsAt', s.period_ends_at, 'plan', s.plan), 'sweep-expiry-warning', now()
  FROM public.subscriptions AS s
  WHERE s.status = 'active' AND s.period_ends_at IS NOT NULL
    AND s.period_ends_at > now() AND s.period_ends_at <= now() + interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM public.audit_logs AS a
      WHERE a.organization_id = s.organization_id AND a.action = 'subscription.expiring_warning'
        AND a.after->>'threshold' = '1d' AND a.occurred_at > now() - interval '2 days'
    );
  RETURN v_count;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.subscription_sweep_expired() FROM PUBLIC;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (67, 'subscription_expiry_warnings', 'sha256:d7ae07192c318cc8bb074e5af2c64b0e14658d0788e956d054b0128c75c70564');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5bb01052f4d1a457662d723395f116338d1b35eb1b53d82209e0e2397b69ed4c', 1788586963419);

-- ----------------------------------------------------------------------
-- 20260903045000_enterprise_lead_list
-- ----------------------------------------------------------------------
-- Enterprise lead listing untuk admin platform.
--
-- Forward-only. Tabel `enterprise_leads` adalah function-only
-- (RLS default-deny + FORCE, lihat 20260903032500_billing_orders.sql):
-- penulisan lewat `billing_lead_create`, pembacaan admin lewat fungsi
-- SECURITY DEFINER baru di bawah, mengikuti preseden
-- `billing_order_list_pending` (gated `permission_has_platform_admin`).
-- Tidak ada perubahan skema tabel; hanya satu fungsi baca.

CREATE OR REPLACE FUNCTION indicate_private.billing_lead_list(p_actor_id uuid)
  RETURNS TABLE(id uuid, nama text, email text, kebutuhan text, created_at timestamp with time zone)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT l.id, l.nama, l.email, l.kebutuhan, l.created_at
  FROM public.enterprise_leads l
  ORDER BY l.created_at DESC;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_lead_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_lead_list(uuid) TO indicate_runtime;

-- Registrasi susulan (fungsi sudah live tanpa baris riwayat): agar fresh
-- environment yang dibangun dari file berurutan mencatat versi yang sama.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (71, 'enterprise_lead_list', 'sha256:ca365bea85899527f5cdc90817c2a9ae897938ad09fc6f9c75aa9826fd0777da');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('30bbd1712709b7b524f0011b2b5f5669f944735e9850c4cf151143d8c392fddf', 1788629085776);

-- ----------------------------------------------------------------------
-- 20260906000000_billing_terms_consent
-- ----------------------------------------------------------------------
-- Fase B legal-hardening: persistensi clickwrap pada orders.
--
-- Expand-phase: kolom nullable agar order lama (pra-clickwrap, jika ada) tetap
-- terbaca; baris lama yang terms_version-nya NULL berarti persetujuan versi
-- tidak tercatat dan tidak boleh diklaim sebagai bukti persetujuan.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_terms_version_bounded') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_terms_version_bounded CHECK (terms_version IS NULL OR length(terms_version) BETWEEN 1 AND 32);
  END IF;
END
$$;

-- Overload 6-arg: satu-satunya jalur pembuatan order yang sah. Menolak versi
-- Terms basi agar bukti persetujuan selalu mengikat versi yang berlaku.
CREATE OR REPLACE FUNCTION indicate_private.billing_order_create(p_actor_id uuid, p_request_id text, p_package_id uuid, p_org_id uuid, p_terms_version text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_order uuid := gen_random_uuid(); v_audit_org uuid; v_plan text; v_price integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF p_terms_version IS NULL OR p_terms_version <> '2026-09-05' THEN
    RAISE EXCEPTION 'terms version unsupported' USING ERRCODE = '42501';
  END IF;
  SELECT plan, price_idr INTO v_plan, v_price FROM public.packages WHERE id = p_package_id AND active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'package unavailable' USING ERRCODE = '42501';
  END IF;
  IF v_plan = 'enterprise' THEN
    RAISE EXCEPTION 'enterprise requires sales review' USING ERRCODE = '42501';
  END IF;
  IF p_org_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
      RAISE EXCEPTION 'organization missing' USING ERRCODE = '42501';
    END IF;
    IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
       AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_org_id AND user_id = p_actor_id AND status = 'active') THEN
      RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
    END IF;
  END IF;
  INSERT INTO public.orders(id, user_id, org_id, package_id, status, terms_version, terms_accepted_at, created_at, updated_at)
  VALUES (v_order, p_actor_id, p_org_id, p_package_id, 'pending_payment', p_terms_version, p_now, p_now, p_now);
  SELECT COALESCE(p_org_id, (SELECT organization_id FROM public.platform_organizations LIMIT 1)) INTO v_audit_org;
  IF v_audit_org IS NOT NULL THEN
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_audit_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.create', 'order', v_order::text, 'succeeded', ARRAY['package','status','termsVersion'], jsonb_build_object('packageId', p_package_id, 'status', 'pending_payment', 'termsVersion', p_terms_version), p_request_id, p_now);
  END IF;
  RETURN v_order;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, text, timestamptz) TO indicate_runtime;

-- Fail-closed shim: overload 5-arg lama tidak lagi membuat order. Pemanggil
-- basi gagal dengan denial non-disclosing (42501) alih-alih order tanpa bukti
-- persetujuan. Dihapus permanen pada fase contract setelah 1 rilis.
CREATE OR REPLACE FUNCTION indicate_private.billing_order_create(p_actor_id uuid, p_request_id text, p_package_id uuid, p_org_id uuid, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RAISE EXCEPTION 'terms consent required' USING ERRCODE = '42501';
  RETURN NULL;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamptz) TO indicate_runtime;

-- Daftar order milik pemakai kini menyertakan bukti persetujuan.
DROP FUNCTION IF EXISTS indicate_private.billing_order_list_mine(uuid);
CREATE FUNCTION indicate_private.billing_order_list_mine(p_actor_id uuid)
 RETURNS TABLE(id uuid, package_name text, plan text, price_idr integer, status billing_order_status, org_id uuid, terms_version text, terms_accepted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT o.id, p.name, p.plan, p.price_idr, o.status, o.org_id, o.terms_version, o.terms_accepted_at, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id
  WHERE o.user_id = p_actor_id
    AND (o.user_id = indicate_private.current_verified_user_id()
         OR indicate_private.permission_has_platform_admin(indicate_private.current_verified_user_id()))
  ORDER BY o.created_at DESC
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_mine(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_mine(uuid) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (68, 'billing_terms_consent', 'sha256:eb33c41de647f29469853ca7aa5fd42671e9a2828f8eaf6ff43974b5bb08918f');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('1d5e3e70e73614fec355aabe42542115cd5049add6e09db4ede8c2e7d1c90315', 1788627702625);

-- ----------------------------------------------------------------------
-- 20260906001000_billing_refund_status
-- ----------------------------------------------------------------------
-- Fase B legal-hardening: status refund + fungsi refund order aktif.
--
-- PostgreSQL tidak mengizinkan ALTER TYPE ... ADD VALUE di dalam blok
-- transaksi; terapkan file ini di luar transaksi (psql / SQL editor),
-- mengikuti preseden 20260903041000_publishing_unpublished_state.sql.
-- Refund menandai order 'refunded' beserta audit; penangguhan langganan
-- tetap keputusan operator terpisah via subscription_update (terdokumentasi
-- pada Ketentuan §7) agar tidak ada penonaktifan otomatis yang keliru.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TYPE billing_order_status ADD VALUE IF NOT EXISTS 'refunded';

CREATE OR REPLACE FUNCTION indicate_private.billing_order_refund(p_actor_id uuid, p_request_id text, p_order_id uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT org_id INTO v_org FROM public.orders WHERE id = p_order_id AND status = 'active';
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.orders SET status = 'refunded', decided_by = p_actor_id, decided_at = p_now, updated_at = p_now WHERE id = p_order_id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (COALESCE(v_org, (SELECT organization_id FROM public.platform_organizations LIMIT 1)), gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'billing.order.refund', 'order', p_order_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'refunded', 'refundedFrom', 'active'), p_request_id, p_now);
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_refund(uuid, text, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_refund(uuid, text, uuid, timestamptz) TO indicate_runtime;

-- Daftar order aktif untuk operator platform (pola billing_order_list_pending).
CREATE OR REPLACE FUNCTION indicate_private.billing_order_list_active(p_actor_id uuid)
 RETURNS TABLE(id uuid, user_email text, org_id uuid, package_name text, plan text, price_idr integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, u.email, o.org_id, p.name, p.plan, p.price_idr, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id JOIN public.users u ON u.id = o.user_id
  WHERE o.status = 'active'
  ORDER BY o.created_at DESC;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_active(uuid) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (69, 'billing_refund_status', 'sha256:510975ca1a4f2a84fca808f7aca50b808f138b61a6e370b8e5676513fd4b50d1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('b9dacfbc2024351be42696f39bc1433b188c63cc0b76c7807432fd6af30c1de1', 1788627721100);

-- ----------------------------------------------------------------------
-- 20260906002000_billing_pending_terms
-- ----------------------------------------------------------------------
-- Fase B legal-hardening: daftar pending menyertakan bukti persetujuan.
--
-- Perubahan RETURNS TABLE mewajibkan DROP + CREATE (OR REPLACE tidak dapat
-- mengubah tipe kembalian). Tanpa perubahan perilaku otorisasi.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

DROP FUNCTION IF EXISTS indicate_private.billing_order_list_pending(uuid);
CREATE FUNCTION indicate_private.billing_order_list_pending(p_actor_id uuid)
 RETURNS TABLE(id uuid, user_email text, org_id uuid, package_name text, plan text, price_idr integer, proof_url text, terms_version text, terms_accepted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, u.email, o.org_id, p.name, p.plan, p.price_idr, o.proof_url, o.terms_version, o.terms_accepted_at, o.created_at
  FROM public.orders o JOIN public.packages p ON p.id = o.package_id JOIN public.users u ON u.id = o.user_id
  WHERE o.status = 'waiting_verification'
  ORDER BY o.created_at;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_order_list_pending(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_order_list_pending(uuid) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (70, 'billing_pending_terms', 'sha256:bea84b35610e87d0b94a7eda239b20b5c1b5b40dd0f7730eb5814d1dcd6e006a');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ca317573867eb610e2e733b68e8d0ccd37fd60547a588dc393fa4fbb9b1701c8', 1788627837195);

-- ----------------------------------------------------------------------
-- 20260906003000_historical_digest_rebaseline
-- ----------------------------------------------------------------------
-- Re-baseline digest historis pasca-rekonstruksi jurnal.
--
-- Sepuluh file di bawah terdaftar dengan digest yang tidak lagi mereproduksi
-- dari bytes saat ini (kemungkinan edit komentar/format pasca-registrasi,
-- termasuk normalisasi LF). Objek kuncinya terverifikasi live (kolom href
-- contact_channels, kolom custom_* article_sites, enum unpublished,
-- source_version manifes, trigger updated_at), sehingga yang diperbarui
-- hanyalah sel checksum riwayat — tanpa perubahan objek skema apa pun.
-- Preseden: 20260903037000_billing_real_checksums.sql.
-- Catatan: daftar reviewed v1–v13 di dalam migration_body_digests memakai
-- penamaan lama (phase2_*) dan tetap menjadi catatan historis, bukan
-- kebenaran live saat ini.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

UPDATE public.indicate_schema_migrations SET checksum = 'sha256:1c63d8dc80a2f8364564e264da18055980a178d65043861ff9f4d8ed99365fc9' WHERE version = 14 AND name = 'migration_body_digests';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:f2dbac5ae8a410d26f6dd4a55219432416f9b87870eff0b44f9b94de6cedbf39' WHERE version = 15 AND name = 'updated_at_integrity_guard';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:aeb5fcff577a43bdd81ccf7ff767e838d2cc7c0ac0a35f1306b137b042f3a599' WHERE version = 16 AND name = 'operational_table_read_policies';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:4f9a3e1ea036b75199ddc55863b0c78e7a9831e71617b329d51ea015721e5a89' WHERE version = 17 AND name = 'data_api_and_index_hardening';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:18aed7e6f31f9dcc0d2c66571661968d921e6c924ae112d295aa2fd0628ed130' WHERE version = 18 AND name = 'coordination_timestamps_and_search_indexes';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:fa08361431055962bcd035b3036a8e17fc39711fb1fe4a720cea042cbb9d7da4' WHERE version = 58 AND name = 'contact_channel_hrefs';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:019aedae063ec26380b72439ed59c008166d5a8d3b429be3e7b28c16d2fe99f6' WHERE version = 59 AND name = 'publication_overrides';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:501add921dcf4a38e130a9577d6f79e9ffab08defa1c90febc22268010e70f4a' WHERE version = 60 AND name = 'publishing_unpublished_state';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:d964c9cc8b7f459386704716e48ec545cdd24772b249248ed956d4620462c2f7' WHERE version = 61 AND name = 'release_manifest_source_version';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:90701d84dbb02442ee4b650d91dbd8fdf8226873a6bcce9a077cee3b4862bf80' WHERE version = 62 AND name = 'fix_site_settings_robots_cast';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (72, 'historical_digest_rebaseline', 'sha256:1e7a72f184e7e9e5155da44dddf6fad1f52fffeeda24ae728f5bd01efff70b0b');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e604aa8e6a85b65c247afc8189a8c29af1608c1d48c3d86fa9d32a06d4d567fe', 1788630000000);

-- ----------------------------------------------------------------------
-- 20260906004000_malformed_digest_correction
-- ----------------------------------------------------------------------
-- Koreksi literal digest malformed (bukan 64-hex) pada dua file.
--
-- `billing_packages_plan_unique` (67 chars, suffix "059") dan
-- `billing_tier_ladder` (43 chars, terpotong) memiliki literal yang bukan
-- SHA-256 valid; digest sejati dari bytes file adalah 64-char prefix yang
-- kini tertulis di file. Yang diperbarui hanyalah sel checksum riwayat —
-- tanpa perubahan objek skema apa pun.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

UPDATE public.indicate_schema_migrations SET checksum = 'sha256:d0deed2abb01bd3527ddd9643a238cdbce7bdeae792b56863a3b9214efb1c44d' WHERE version = 53 AND name = 'billing_packages_plan_unique';
UPDATE public.indicate_schema_migrations SET checksum = 'sha256:2b383ecff5460252d7e8d2e8ef3d7cf7530c933157c75ef3d7bd40703884dc0c' WHERE version = 56 AND name = 'billing_tier_ladder';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (73, 'malformed_digest_correction', 'sha256:82951df8af4bba4c063daedf099d7d972e3a8c33c2c99c14f26b721ccb7ab954');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4603bd3fe900ac7c2ea647a13169d6a747eb059d6f1a6dc398c23e65862487ee', 1788631000000);

-- ----------------------------------------------------------------------
-- 20260906005000_audit_hash_chain
-- ----------------------------------------------------------------------
-- Fase C legal-hardening: rantai hash jejak audit + stempel jam DB.
--
-- Aturan kanonikal tunggal (dipakai trigger, backfill, dan verifikasi):
--   kanonikal = (baris::jsonb TANPA seq/prev_hash/signature)::text || '|' || COALESCE(prev_hash,'GENESIS')
-- Urutan kunci json mengikuti urutan kolom tabel; SELECT di backfill/verify
-- mencantumkan kolom dalam urutan tabel agar serialisasi identik.
-- Setiap baris dirantai (prev_hash = signature baris sebelumnya,
-- signature = HMAC-SHA256 atas kanonikal dengan kunci Vault) dan occurred_at
-- selalu jam database (clock_timestamp) agar tidak dapat digeser aplikasi.
-- Kunci HMAC terpisah di Vault: peran runtime tidak dapat membacanya, hanya
-- fungsi SECURITY DEFINER di bawah. Trigger gagal fail-closed bila kunci
-- hilang. Backfill men-drop guard append-only sementara dalam migrasi yang
-- sama lalu menciptakannya kembali byte-identik; terapkan saat trafik rendah.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS seq bigint GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS prev_hash text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS signature text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_seq_unique') THEN
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_seq_unique UNIQUE (seq);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'audit_hmac_key') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'audit_hmac_key', 'HMAC key for audit hash chain (Fase C)');
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION indicate_private.audit_chain_input(p_row jsonb, p_prev_hash text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT (p_row - 'seq' - 'prev_hash' - 'signature')::text || '|' || COALESCE(p_prev_hash, 'GENESIS')
$function$;
REVOKE ALL ON FUNCTION indicate_private.audit_chain_input(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.audit_chain_input(jsonb, text) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.audit_chain_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_prev text; v_key text;
BEGIN
  SELECT signature INTO v_prev FROM public.audit_logs ORDER BY seq DESC LIMIT 1 FOR UPDATE;
  NEW.occurred_at := clock_timestamp();
  NEW.prev_hash := v_prev;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  NEW.signature := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(NEW), NEW.prev_hash), v_key, 'sha256'), 'hex');
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.audit_chain_fill() FROM PUBLIC;

-- Backfill rantai untuk baris pra-chain dalam urutan seq (urutan verifikasi).
-- Kolom SELECT dalam urutan tabel persis (tanpa seq/prev_hash/signature).
DROP TRIGGER IF EXISTS audit_logs_append_only_guard ON public.audit_logs;
DO $$
DECLARE r record; v_prev text := NULL; v_key text; v_sig text;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, "before", "after", request_id, occurred_at FROM public.audit_logs ORDER BY seq LOOP
    v_sig := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(r), v_prev), v_key, 'sha256'), 'hex');
    UPDATE public.audit_logs SET prev_hash = v_prev, signature = v_sig WHERE organization_id = r.organization_id AND id = r.id;
    v_prev := v_sig;
  END LOOP;
END
$$;
CREATE TRIGGER audit_logs_append_only_guard
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.reject_audit_mutation();

DROP TRIGGER IF EXISTS audit_logs_chain_trigger ON public.audit_logs;
CREATE TRIGGER audit_logs_chain_trigger
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION indicate_private.audit_chain_fill();

-- Verifikasi rantai: kembalikan seq yang rusak (kosong = sehat). Khusus
-- operator platform; pemindai sistem tanpa-gerbang ada di bawah untuk cron.
CREATE OR REPLACE FUNCTION indicate_private.audit_verify_chain(p_actor_id uuid)
 RETURNS TABLE(bad_seq bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE r record; v_prev text := NULL; v_key text; v_sig text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT seq, organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, "before", "after", request_id, occurred_at, prev_hash, signature FROM public.audit_logs ORDER BY seq LOOP
    v_sig := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(r) - 'seq' - 'prev_hash' - 'signature', r.prev_hash), v_key, 'sha256'), 'hex');
    IF r.signature IS DISTINCT FROM v_sig OR r.prev_hash IS DISTINCT FROM v_prev THEN
      bad_seq := r.seq; RETURN NEXT;
    END IF;
    v_prev := r.signature;
  END LOOP;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.audit_verify_chain(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.audit_verify_chain(uuid) TO indicate_runtime;

-- Pemindai tanpa-gerbang untuk cron: hanya owner/cron yang dapat mengeksekusi
-- (tanpa GRANT ke peran runtime).
CREATE OR REPLACE FUNCTION indicate_private.audit_chain_scan()
 RETURNS TABLE(bad_seq bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE r record; v_prev text := NULL; v_key text; v_sig text;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'audit_hmac_key' ORDER BY created_at DESC LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'audit hmac key missing' USING ERRCODE = '42501';
  END IF;
  FOR r IN SELECT seq, organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, "before", "after", request_id, occurred_at, prev_hash, signature FROM public.audit_logs ORDER BY seq LOOP
    v_sig := encode(extensions.hmac(indicate_private.audit_chain_input(to_jsonb(r) - 'seq' - 'prev_hash' - 'signature', r.prev_hash), v_key, 'sha256'), 'hex');
    IF r.signature IS DISTINCT FROM v_sig OR r.prev_hash IS DISTINCT FROM v_prev THEN
      bad_seq := r.seq; RETURN NEXT;
    END IF;
    v_prev := r.signature;
  END LOOP;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.audit_chain_scan() FROM PUBLIC;

CREATE OR REPLACE FUNCTION indicate_private.audit_verify_and_report()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_bad bigint[]; v_count integer; v_platform uuid;
BEGIN
  SELECT array_agg(bad_seq) INTO v_bad FROM indicate_private.audit_chain_scan();
  v_count := COALESCE(array_length(v_bad, 1), 0);
  IF v_count > 0 THEN
    SELECT organization_id INTO v_platform FROM public.platform_organizations LIMIT 1;
    IF v_platform IS NOT NULL THEN
      INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
      VALUES (v_platform, gen_random_uuid(), 'system', 'audit-verifier', 'worker', 'audit.chain_broken', 'audit', 'chain', 'failed', ARRAY['status'], jsonb_build_object('badCount', v_count, 'badSeqs', v_bad), 'audit-verify', now());
    END IF;
  END IF;
  RETURN v_count;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.audit_verify_and_report() FROM PUBLIC;

SELECT cron.schedule('indicate-audit-verify', '30 2 * * *', 'SELECT indicate_private.audit_verify_and_report()');

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (74, 'audit_hash_chain', 'sha256:92c3f298c7765fc9057d6d1b18c675976e1fc68ee3f045da8f724a2d4b58ec61');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f8b1336fb8842b0041fa2adee9b5d3bdd5cd3ec6e6cc5b97c4b7785d71b27619', 1788632000000);

-- ----------------------------------------------------------------------
-- 20260906006000_retention_sweep
-- ----------------------------------------------------------------------
-- Fase C legal-hardening: penyapuan retensi terjadwal + bukti penghapusan.
--
-- Setiap kategori kedaluwarsa dihapus dan dihitung ke retention_runs sebagai
-- bukti jadwal penghapusan (UU PDP). Kategori: undangan basi (>90 hari
-- sejak diterima/kedaluwarsa), klaim replay kedaluwarsa, tugas cleanup
-- selesai >90 hari, percakapan Telegram kedaluwarsa (efemeral by design).
-- Penghapusan operasional organisasi penuh tetap mengikuti desain erasure
-- khusus (Fase C2) — sweep ini tidak menyentuh data akun/konten/transaksi.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE TABLE IF NOT EXISTS public.retention_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  purged_count integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT retention_runs_count_nonnegative CHECK (purged_count >= 0)
);
ALTER TABLE public.retention_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retention_function_only ON public.retention_runs;
CREATE POLICY retention_function_only ON public.retention_runs FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
REVOKE ALL ON public.retention_runs FROM PUBLIC;

CREATE OR REPLACE FUNCTION indicate_private.retention_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_total integer := 0; v_count integer; v_started timestamptz := now();
BEGIN
  DELETE FROM public.org_invitations
  WHERE (accepted_at IS NOT NULL AND accepted_at < now() - interval '90 days')
     OR (accepted_at IS NULL AND expires_at < now() - interval '90 days');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES ('org_invitations', v_count, v_started, now());
  v_total := v_total + v_count;

  DELETE FROM public.webhook_replay_claims WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES ('webhook_replay_claims', v_count, v_started, now());
  v_total := v_total + v_count;

  DELETE FROM public.object_cleanup_tasks WHERE status = 'completed' AND updated_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES ('object_cleanup_tasks', v_count, v_started, now());
  v_total := v_total + v_count;

  DELETE FROM public.telegram_conversations WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES ('telegram_conversations', v_count, v_started, now());
  v_total := v_total + v_count;

  RETURN v_total;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.retention_sweep() FROM PUBLIC;

SELECT cron.schedule('indicate-retention-sweep', '0 3 * * *', 'SELECT indicate_private.retention_sweep()');

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (75, 'retention_sweep', 'sha256:1c109296242329265a883c69af3e0b22afec215064d96e85f60ed92b48a2c9f4');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('83edc7e8040711c9c3a61948b1e0f8b3745e3f06d5bdcd32058a91b30fc043b3', 1788633000000);

-- ----------------------------------------------------------------------
-- 20260906007000_moderation_reports
-- ----------------------------------------------------------------------
-- Fase D legal-hardening: laporan konten publik + tiket DSAR + lisensi media.
--
-- content_reports menampung laporan publik per artikel (UU ITE/PP PSTE:
-- bukti penerimaan + penanganan). Penegakan memakai alur unpublish yang
-- sudah ada; status laporan melacak workflow hukumnya. privacy_requests
-- adalah tiket DSAR bernomor (UU PDP Ps.8/16) dengan SLA yang bisa diaudit.
-- Kolom lisensi media menegakkan kewajiban atribusi (UU Hak Cipta).
-- Semua tulis/baca lewat fungsi SECURITY DEFINER di bawah; tabel
-- function-only (default-deny + FORCE RLS) mengikuti preseden
-- enterprise_leads.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE TYPE public.report_status AS ENUM ('received', 'under_review', 'action_taken', 'rejected');
CREATE TYPE public.privacy_request_type AS ENUM ('access', 'correction', 'deletion', 'portability', 'restriction');
CREATE TYPE public.privacy_request_status AS ENUM ('open', 'in_progress', 'fulfilled', 'rejected');

CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE restrict,
  site_id uuid,
  article_id uuid,
  reporter_contact text NOT NULL,
  reason_category text NOT NULL,
  details text NOT NULL,
  article_url text,
  status public.report_status NOT NULL DEFAULT 'received',
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_contact_bounded CHECK (length(reporter_contact) BETWEEN 3 AND 320),
  CONSTRAINT content_reports_category_values CHECK (reason_category IN ('copyright', 'defamation', 'privacy', 'hate', 'misinformation', 'other')),
  CONSTRAINT content_reports_details_bounded CHECK (length(details) BETWEEN 10 AND 4000),
  CONSTRAINT content_reports_url_bounded CHECK (article_url IS NULL OR length(article_url) BETWEEN 8 AND 2000),
  CONSTRAINT content_reports_note_bounded CHECK (decision_note IS NULL OR length(decision_note) BETWEEN 1 AND 2000),
  CONSTRAINT content_reports_site_fk FOREIGN KEY (organization_id, site_id) REFERENCES public.sites(organization_id, id) ON DELETE restrict,
  CONSTRAINT content_reports_article_fk FOREIGN KEY (organization_id, article_id) REFERENCES public.articles(organization_id, id) ON DELETE restrict
);
CREATE INDEX content_reports_org_status_idx ON public.content_reports USING btree (organization_id, status);
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_function_only ON public.content_reports;
CREATE POLICY reports_function_only ON public.content_reports FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
REVOKE ALL ON public.content_reports FROM PUBLIC;

CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE restrict,
  requester_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE restrict,
  request_type public.privacy_request_type NOT NULL,
  details text NOT NULL,
  status public.privacy_request_status NOT NULL DEFAULT 'open',
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT privacy_requests_details_bounded CHECK (length(details) BETWEEN 10 AND 4000),
  CONSTRAINT privacy_requests_note_bounded CHECK (decision_note IS NULL OR length(decision_note) BETWEEN 1 AND 2000)
);
CREATE INDEX privacy_requests_org_status_idx ON public.privacy_requests USING btree (organization_id, status);
CREATE INDEX privacy_requests_ticket_idx ON public.privacy_requests USING btree (ticket_number);
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS privacy_requests_function_only ON public.privacy_requests;
CREATE POLICY privacy_requests_function_only ON public.privacy_requests FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
REVOKE ALL ON public.privacy_requests FROM PUBLIC;

ALTER TABLE public.media ADD COLUMN IF NOT EXISTS license_source text;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS attribution text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_license_bounded') THEN
    ALTER TABLE public.media ADD CONSTRAINT media_license_bounded CHECK (license_source IS NULL OR length(license_source) BETWEEN 1 AND 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_attribution_bounded') THEN
    ALTER TABLE public.media ADD CONSTRAINT media_attribution_bounded CHECK (attribution IS NULL OR length(attribution) BETWEEN 1 AND 500);
  END IF;
END
$$;

-- Laporan publik: tanpa aktor (dilindungi rate-limit di tepi).
CREATE OR REPLACE FUNCTION indicate_private.content_report_submit(p_request_id text, p_org_id uuid, p_site_id uuid, p_article_id uuid, p_contact text, p_category text, p_details text, p_url text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF p_contact IS NULL OR length(p_contact) NOT BETWEEN 3 AND 320
     OR p_category IS NULL OR p_category NOT IN ('copyright', 'defamation', 'privacy', 'hate', 'misinformation', 'other')
     OR p_details IS NULL OR length(p_details) NOT BETWEEN 10 AND 4000
     OR (p_url IS NOT NULL AND length(p_url) NOT BETWEEN 8 AND 2000) THEN
    RAISE EXCEPTION 'report fields invalid' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'unknown target' USING ERRCODE = '42501';
  END IF;
  IF p_site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sites WHERE organization_id = p_org_id AND id = p_site_id) THEN
    RAISE EXCEPTION 'unknown target' USING ERRCODE = '42501';
  END IF;
  IF p_article_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.articles WHERE organization_id = p_org_id AND id = p_article_id) THEN
    RAISE EXCEPTION 'unknown target' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.content_reports(id, organization_id, site_id, article_id, reporter_contact, reason_category, details, article_url, status, created_at, updated_at)
  VALUES (v_id, p_org_id, p_site_id, p_article_id, p_contact, p_category, p_details, p_url, 'received', p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_org_id, gen_random_uuid(), 'system', 'content-report-intake', 'worker', 'content_report.received', 'content_report', v_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'received', 'category', p_category), p_request_id, p_now);
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.content_report_submit(text, uuid, uuid, uuid, text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.content_report_submit(text, uuid, uuid, uuid, text, text, text, text, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.content_report_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, org_id uuid, site_id uuid, article_id uuid, reporter_contact text, reason_category text, details text, article_url text, status report_status, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RETURN QUERY SELECT r.id, r.organization_id, r.site_id, r.article_id, r.reporter_contact, r.reason_category, r.details, r.article_url, r.status, r.created_at
    FROM public.content_reports r ORDER BY r.created_at DESC;
  ELSE
    RETURN QUERY SELECT r.id, r.organization_id, r.site_id, r.article_id, r.reporter_contact, r.reason_category, r.details, r.article_url, r.status, r.created_at
    FROM public.content_reports r JOIN public.memberships m ON m.organization_id = r.organization_id
    WHERE m.user_id = p_actor_id AND m.status = 'active' ORDER BY r.created_at DESC;
  END IF;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.content_report_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.content_report_list(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.content_report_decide(p_actor_id uuid, p_request_id text, p_report_id uuid, p_action_taken boolean, p_note text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  SELECT organization_id INTO v_org FROM public.content_reports WHERE id = p_report_id AND status IN ('received', 'under_review');
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = v_org AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
  END IF;
  IF p_note IS NOT NULL AND length(p_note) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'decision note invalid' USING ERRCODE = '42501';
  END IF;
  UPDATE public.content_reports SET status = CASE WHEN p_action_taken THEN 'action_taken'::report_status ELSE 'rejected'::report_status END, decided_by = p_actor_id, decided_at = p_now, decision_note = p_note, updated_at = p_now WHERE id = p_report_id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'content_report.decide', 'content_report', p_report_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('actionTaken', p_action_taken), p_request_id, p_now);
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.content_report_decide(uuid, text, uuid, boolean, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.content_report_decide(uuid, text, uuid, boolean, text, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.privacy_request_submit(p_actor_id uuid, p_request_id text, p_org_id uuid, p_type privacy_request_type, p_details text, p_now timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_ticket text; v_tries integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF p_details IS NULL OR length(p_details) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'request fields invalid' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'organization missing' USING ERRCODE = '42501';
  END IF;
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = p_org_id AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
  END IF;
  LOOP
    v_tries := v_tries + 1;
    v_ticket := 'DSAR-' || to_char(p_now, 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 8));
    BEGIN
      INSERT INTO public.privacy_requests(id, ticket_number, organization_id, requester_user_id, request_type, details, status, created_at, updated_at)
      VALUES (v_id, v_ticket, p_org_id, p_actor_id, p_type, p_details, 'open', p_now, p_now);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_tries >= 5 THEN RAISE; END IF;
    END;
  END LOOP;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'privacy_request.submit', 'privacy_request', v_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('ticket', v_ticket, 'type', p_type), p_request_id, p_now);
  RETURN v_ticket;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.privacy_request_submit(uuid, text, uuid, privacy_request_type, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.privacy_request_submit(uuid, text, uuid, privacy_request_type, text, timestamptz) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.privacy_request_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, ticket_number text, org_id uuid, request_type privacy_request_type, details text, status privacy_request_status, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RETURN QUERY SELECT r.id, r.ticket_number, r.organization_id, r.request_type, r.details, r.status, r.created_at
    FROM public.privacy_requests r ORDER BY r.created_at DESC;
  ELSE
    RETURN QUERY SELECT r.id, r.ticket_number, r.organization_id, r.request_type, r.details, r.status, r.created_at
    FROM public.privacy_requests r JOIN public.memberships m ON m.organization_id = r.organization_id
    WHERE m.user_id = p_actor_id AND m.status = 'active' ORDER BY r.created_at DESC;
  END IF;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.privacy_request_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.privacy_request_list(uuid) TO indicate_runtime;

CREATE OR REPLACE FUNCTION indicate_private.privacy_request_decide(p_actor_id uuid, p_request_id text, p_ticket text, p_status privacy_request_status, p_note text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid; v_org uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'active user required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('in_progress', 'fulfilled', 'rejected') THEN
    RAISE EXCEPTION 'request status invalid' USING ERRCODE = '42501';
  END IF;
  SELECT id, organization_id INTO v_id, v_org FROM public.privacy_requests WHERE ticket_number = p_ticket AND status IN ('open', 'in_progress');
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = v_org AND user_id = p_actor_id AND status = 'active') THEN
    RAISE EXCEPTION 'organization membership required' USING ERRCODE = '42501';
  END IF;
  IF p_note IS NOT NULL AND length(p_note) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'decision note invalid' USING ERRCODE = '42501';
  END IF;
  UPDATE public.privacy_requests SET status = p_status, decided_by = p_actor_id, decided_at = p_now, decision_note = p_note, updated_at = p_now WHERE id = v_id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'privacy_request.decide', 'privacy_request', v_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', p_status, 'ticket', p_ticket), p_request_id, p_now);
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.privacy_request_decide(uuid, text, text, privacy_request_status, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.privacy_request_decide(uuid, text, text, privacy_request_status, text, timestamptz) TO indicate_runtime;

INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (76, 'moderation_reports', 'sha256:97233a17db7c22daa07cdc2ecba39ab6aa382ea09496b97b788f94c9b6541a99');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('abc7b801da94d2a74ea964bea1a365953278731c1a68e74505c58dba05b6a86a', 1788634000000);

-- ----------------------------------------------------------------------
-- 20260906008000_moderation_fk_indexes
-- ----------------------------------------------------------------------
-- Tindak lanjut advisor: indeks penutup untuk FK moderasi (unindexed_foreign_keys).
--
-- Tanpa perubahan perilaku; mempercepat pemeriksaan FK dan-latensi daftar.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE INDEX IF NOT EXISTS content_reports_org_site_idx ON public.content_reports USING btree (organization_id, site_id);
CREATE INDEX IF NOT EXISTS content_reports_org_article_idx ON public.content_reports USING btree (organization_id, article_id);
CREATE INDEX IF NOT EXISTS privacy_requests_requester_idx ON public.privacy_requests USING btree (requester_user_id);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (77, 'moderation_fk_indexes', 'sha256:f8799c2d1ad497273583a39f9c8805efe10623a6d9cb55a253efb8780e7d91b9');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ceb9d156043b24e05acda856a3792d5e62901e88714fcabb503ec3b03e3cfb62', 1788635000000);

-- ----------------------------------------------------------------------
-- 20260907000000_delivery_activation_claim
-- ----------------------------------------------------------------------
-- F78: klaim antrean aktivasi domain yang hilang.
--
-- Kode memanggil indicate_private.claim_delivery_activation_attempts(...)
-- (delivery.ts claimActivationAttempts via domain-provisioning-service reconciler),
-- tetapi fungsi tersebut tidak pernah dibuat oleh migrasi mana pun: setiap putaran
-- reconciler gagal dengan "function does not exist".
-- Pola disalin dari claim_delivery_invalidation_tasks: kandidat pending/processing
-- yang jatuh tempo + klaim kedaluwarsa, FOR UPDATE SKIP LOCKED, batas 1..100,
-- tandai processing + token klaim, kembalikan baris penuh.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.claim_delivery_activation_attempts(p_now timestamp with time zone, p_limit integer, p_claim_token uuid, p_claim_expires_at timestamp with time zone)
 RETURNS SETOF domain_activation_attempts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT organization_id, id FROM public.domain_activation_attempts
    WHERE status IN ('pending', 'processing')
      AND next_attempt_at <= p_now
      AND (reconciliation_claim_expires_at IS NULL OR reconciliation_claim_expires_at <= p_now)
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 100))
  )
  UPDATE public.domain_activation_attempts attempt
  SET status = 'processing',
      reconciliation_claim_token = p_claim_token,
      reconciliation_claim_expires_at = p_claim_expires_at,
      updated_at = p_now
  FROM candidates
  WHERE attempt.organization_id = candidates.organization_id AND attempt.id = candidates.id
  RETURNING attempt.*;
END;
$function$;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (78, 'delivery_activation_claim', 'sha256:8224ca1fcd311f4022a8469de4b3c3ac8b0b35ef4474f0b7692eb40b2dee61a4');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5930a61f1313231da8bf871b0570d8ff84b702ca55d53f2719a50e2cdb12c19c', 1788775443478);

-- ----------------------------------------------------------------------
-- 20260907010000_litigation_holds
-- ----------------------------------------------------------------------
-- F79: litigation hold formal (PENDING A4).
--
-- 1. Tabel litigation_holds: satu hold aktif per organisasi (unique partial).
--    Function-only: RLS enabled+forced, tanpa grant ke indicate_runtime;
--    dikelola lewat fungsi SECURITY DEFINER ber-gate platform admin.
-- 2. retention_sweep dinyatakan ulang dengan guard hold: baris milik organisasi
--    yang sedang di-hold tidak disapu sampai hold dilepas.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TABLE public.litigation_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 2000),
  held_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  released_at timestamp with time zone NULL,
  released_by text NULL
);
CREATE UNIQUE INDEX litigation_holds_active_org_unique ON public.litigation_holds (organization_id) WHERE released_at IS NULL;
ALTER TABLE public.litigation_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_holds FORCE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION indicate_private.is_org_held(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.litigation_holds WHERE organization_id = p_organization_id AND released_at IS NULL)
$function$;
CREATE OR REPLACE FUNCTION indicate_private.hold_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_reason text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(p_reason) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'hold reason invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.litigation_holds(id, organization_id, reason, held_by, created_at)
  VALUES (v_id, p_organization_id, p_reason, p_actor_id::text, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'legal.hold.create', 'litigation_hold', v_id::text, 'succeeded', ARRAY['reason'], jsonb_build_object('reason', p_reason), p_request_id, p_now);
  RETURN v_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.hold_release(p_actor_id uuid, p_request_id text, p_hold_id uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_org uuid;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.litigation_holds SET released_at = p_now, released_by = p_actor_id::text
  WHERE id = p_hold_id AND released_at IS NULL RETURNING organization_id INTO v_org;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_org, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'legal.hold.release', 'litigation_hold', p_hold_id::text, 'succeeded', ARRAY['releasedAt'], jsonb_build_object('releasedAt', p_now), p_request_id, p_now);
  RETURN true;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.hold_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, reason text, held_by text, created_at timestamp with time zone, released_at timestamp with time zone, released_by text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT h.id, h.organization_id, h.reason, h.held_by, h.created_at, h.released_at, h.released_by
  FROM public.litigation_holds h ORDER BY h.created_at DESC;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.retention_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_total integer := 0; v_count integer; v_started timestamptz := now();
BEGIN
  DELETE FROM public.org_invitations WHERE ((accepted_at IS NOT NULL AND accepted_at < now() - interval '90 days') OR (accepted_at IS NULL AND expires_at < now() - interval '90 days')) AND NOT indicate_private.is_org_held(org_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('org_invitations', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.webhook_replay_claims WHERE expires_at < now() AND (organization_id IS NULL OR NOT indicate_private.is_org_held(organization_id));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('webhook_replay_claims', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.object_cleanup_tasks WHERE status = 'completed' AND updated_at < now() - interval '90 days' AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('object_cleanup_tasks', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.telegram_conversations WHERE expires_at < now() AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('telegram_conversations', v_count, v_started, now());
  v_total := v_total + v_count;
  RETURN v_total;
END
$function$;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (79, 'litigation_holds', 'sha256:5556c07d527e7dc89eae5a2b3e0174ba5be77ed5b2d65a9a19a07d4691893df1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4a1b9e655395c52a5f41fb247c8b3355a5cd82e2fa9e2ff503d591b636ae58b1', 1788777000000);

-- ----------------------------------------------------------------------
-- 20260907020000_org_erasure
-- ----------------------------------------------------------------------
-- F80: erasure organisasi penuh + worker (PENDING A1).
--
-- 1. Tabel org_erasure_requests: antrean penghapusan operasional per organisasi.
--    Function-only: RLS enabled+forced, tanpa grant ke indicate_runtime.
-- 2. erasure_sweep(): klaim request jatuh tempo (SKIP LOCKED), lewati org yang
--    di-hold (jadwal ulang +24 jam), tolak org platform, lalu hapus operasional
--    dalam urutan aman-FK dalam satu transaksi atomik:
--    - PII anggota dianonimkan (bukan dihapus: memberships RESTRICT users)
--    - objek R2 media diantrekan ke object_cleanup_tasks (alasan org-erasure)
--    - arsip legal dipertahankan: organizations (menjadi archived), subscriptions
--      (menjadi cancelled), audit_logs, invoices, orders, retention_runs, holds
--    - bukti: retention_runs kategori org_erasure + audit org.erasure.
--    Backup terkelola berotasi keluar menurut siklus platform (tanpa restore
--    selektif); fakta ini dicatat dalam proof JSON setiap eksekusi.
-- Dijadwalkan harian via pg_cron (04:00 UTC).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TABLE public.org_erasure_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by text NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_for timestamp with time zone NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone NULL,
  proof jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX org_erasure_requests_due_idx ON public.org_erasure_requests (status, next_attempt_at);
ALTER TABLE public.org_erasure_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_erasure_requests FORCE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION indicate_private.erasure_request_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_reason text, p_scheduled_for timestamp with time zone, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF indicate_private.is_platform_organization(p_organization_id) THEN
    RAISE EXCEPTION 'platform organization is not erasable' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(p_reason) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'erasure reason invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.org_erasure_requests(id, organization_id, requested_by, reason, status, scheduled_for, next_attempt_at, created_at)
  VALUES (v_id, p_organization_id, p_actor_id::text, p_reason, 'pending', p_scheduled_for, least(p_scheduled_for, p_now), p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'org.erasure.request', 'org_erasure_request', v_id::text, 'succeeded', ARRAY['reason','scheduledFor'], jsonb_build_object('reason', p_reason, 'scheduledFor', p_scheduled_for), p_request_id, p_now);
  RETURN v_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.erasure_request_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, requested_by text, reason text, status text, scheduled_for timestamp with time zone, attempts integer, completed_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT r.id, r.organization_id, r.requested_by, r.reason, r.status, r.scheduled_for, r.attempts, r.completed_at, r.created_at
  FROM public.org_erasure_requests r ORDER BY r.created_at DESC;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.erasure_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE
  v_req RECORD; v_org uuid; v_n integer; v_total integer := 0;
  v_counts jsonb := '{}'::jsonb; v_started timestamptz := now();
BEGIN
  FOR v_req IN SELECT * FROM public.org_erasure_requests
    WHERE status IN ('pending', 'processing') AND next_attempt_at <= now()
    ORDER BY next_attempt_at, id FOR UPDATE SKIP LOCKED LIMIT 5
  LOOP
    v_org := v_req.organization_id;
    UPDATE public.org_erasure_requests SET status = 'processing', attempts = attempts + 1 WHERE id = v_req.id;
    IF indicate_private.is_platform_organization(v_org) THEN
      UPDATE public.org_erasure_requests SET status = 'failed', completed_at = now(), proof = jsonb_build_object('error', 'platform organization is not erasable') WHERE id = v_req.id;
      CONTINUE;
    END IF;
    IF indicate_private.is_org_held(v_org) THEN
      UPDATE public.org_erasure_requests SET status = 'pending', next_attempt_at = now() + interval '24 hours', proof = jsonb_build_object('waiting', 'litigation_hold') WHERE id = v_req.id;
      CONTINUE;
    END IF;
    BEGIN
      v_counts := '{}'::jsonb;
      INSERT INTO public.object_cleanup_tasks(organization_id, id, object_key, reason, status, attempts, next_attempt_at, created_at, updated_at)
      SELECT v_org, gen_random_uuid(), object_key, 'org-erasure', 'pending', 0, now(), now(), now() FROM public.media WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('r2_queued', v_n);
      INSERT INTO public.object_cleanup_tasks(organization_id, id, object_key, reason, status, attempts, next_attempt_at, created_at, updated_at)
      SELECT v_org, gen_random_uuid(), thumb_object_key, 'org-erasure', 'pending', 0, now(), now(), now() FROM public.media WHERE organization_id = v_org AND thumb_object_key IS NOT NULL;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('r2_thumbs_queued', v_n);
      UPDATE public.users SET display_name = 'Pengguna Dihapus', email = NULL, avatar_url = NULL, bio = NULL, updated_at = now()
      WHERE id IN (SELECT user_id FROM public.memberships WHERE organization_id = v_org);
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('users_anonymized', v_n);
      DELETE FROM public.article_sites WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('article_sites', v_n);
      DELETE FROM public.publication_transition_receipts WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('transition_receipts', v_n);
      DELETE FROM public.publishing_job_targets WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('job_targets', v_n);
      DELETE FROM public.publishing_jobs WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('jobs', v_n);
      DELETE FROM public.content_reports WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('content_reports', v_n);
      DELETE FROM public.privacy_requests WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('privacy_requests', v_n);
      DELETE FROM public.webhook_replay_claims WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('replay_claims', v_n);
      DELETE FROM public.invalidation_tasks WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('invalidation_tasks', v_n);
      DELETE FROM public.domain_activation_attempts WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('activation_attempts', v_n);
      DELETE FROM public.cache_bypasses WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cache_bypasses', v_n);
      DELETE FROM public.telegram_conversations WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('telegram_conversations', v_n);
      DELETE FROM public.telegram_identity_mappings WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('telegram_mappings', v_n);
      DELETE FROM public.media_key_reservations WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('media_reservations', v_n);
      DELETE FROM public.object_cleanup_tasks WHERE organization_id = v_org AND reason <> 'org-erasure';
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cleanup_tasks_old', v_n);
      DELETE FROM public.org_invitations WHERE org_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('invitations', v_n);
      DELETE FROM public.api_keys WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('api_keys', v_n);
      DELETE FROM public.site_settings WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('site_settings', v_n);
      DELETE FROM public.media WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('media', v_n);
      DELETE FROM public.articles WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('articles', v_n);
      DELETE FROM public.authors WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('authors', v_n);
      DELETE FROM public.categories WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('categories', v_n);
      DELETE FROM public.official_affiliations WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('affiliations', v_n);
      DELETE FROM public.publishers WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('publishers', v_n);
      DELETE FROM public.memberships WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('memberships', v_n);
      DELETE FROM public.role_permissions WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('role_permissions', v_n);
      DELETE FROM public.roles WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('roles', v_n);
      DELETE FROM public.permissions WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('permissions', v_n);
      DELETE FROM public.sites WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('sites', v_n);
      DELETE FROM public.domains WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('domains', v_n);
      DELETE FROM public.regions WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('regions', v_n);
      DELETE FROM public.seed_runs WHERE organization_id = v_org;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('seed_runs', v_n);
      UPDATE public.organizations SET status = 'archived', version = version + 1, updated_at = now() WHERE id = v_org;
      UPDATE public.subscriptions SET status = 'cancelled', version = version + 1, updated_at = now() WHERE organization_id = v_org;
      v_counts := v_counts || jsonb_build_object('backups', 'rotasi keluar menurut siklus platform; tanpa restore selektif');
      INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at, organization_id) VALUES ('org_erasure', 1, v_started, now(), v_org);
      INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
      VALUES (v_org, gen_random_uuid(), 'system', 'erasure-sweeper', 'worker', 'org.erasure', 'organization', v_org::text, 'succeeded', ARRAY['status'], v_counts, 'erasure-sweep', now());
      UPDATE public.org_erasure_requests SET status = 'completed', completed_at = now(), proof = v_counts WHERE id = v_req.id;
      v_total := v_total + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.org_erasure_requests SET status = 'failed', completed_at = now(), proof = jsonb_build_object('error', SQLERRM) WHERE id = v_req.id;
    END;
  END LOOP;
  RETURN v_total;
END
$function$;
SELECT cron.schedule('indicate-org-erasure', '0 4 * * *', 'SELECT indicate_private.erasure_sweep()');
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (80, 'org_erasure', 'sha256:36c1c49eb990f3e1d53c96c12376153e3679a29b78e5f5e7c67464c9e2741808');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('57b2b7e15ce6c9f6fa641d77a66d419dd50da4df7a112de3cdcdf71610b37f51', 1788778000000);

-- ----------------------------------------------------------------------
-- 20260907030000_rls_global_select_tightening
-- ----------------------------------------------------------------------
-- F81: pengetatan SELECT baris global NULL (PENDING A3) + akses WORM.
--
-- Audit rollout: tidak ada kode aplikasi yang membaca langsung ketiga tabel ini
-- (semua lewat fungsi SECURITY DEFINER; satu-satunya pembaca langsung adalah
-- ekspor WORM yang kini lewat audit_worm_fetch di bawah). Maka klausa
-- OR organization_id IS NULL pada kebijakan SELECT dicabut:
-- indicate_runtime hanya melihat baris tenant-nya sendiri.
CREATE OR REPLACE FUNCTION indicate_private.audit_worm_fetch(p_since timestamp with time zone, p_until timestamp with time zone, p_table text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF p_table = 'audit_logs' THEN
    RETURN QUERY SELECT to_jsonb(a) FROM public.audit_logs a
    WHERE a.occurred_at >= p_since AND a.occurred_at < p_until ORDER BY a.occurred_at, a.id;
  ELSIF p_table = 'runtime_config_audit_logs' THEN
    RETURN QUERY SELECT to_jsonb(a) FROM public.runtime_config_audit_logs a
    WHERE a.occurred_at >= p_since AND a.occurred_at < p_until ORDER BY a.occurred_at, a.id;
  ELSIF p_table = 'retention_runs' THEN
    RETURN QUERY SELECT to_jsonb(a) FROM public.retention_runs a
    WHERE a.started_at >= p_since AND a.started_at < p_until ORDER BY a.started_at, a.id;
  ELSE
    RAISE EXCEPTION 'worm table not allowed' USING ERRCODE = '42501';
  END IF;
END
$function$;
DROP POLICY IF EXISTS runtime_config_audit_tenant_isolation_select ON public.runtime_config_audit_logs;
CREATE POLICY runtime_config_audit_tenant_isolation_select ON public.runtime_config_audit_logs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS runtime_config_invalidation_tenant_isolation_select ON public.runtime_config_invalidation_intents;
CREATE POLICY runtime_config_invalidation_tenant_isolation_select ON public.runtime_config_invalidation_intents FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
DROP POLICY IF EXISTS webhook_replay_tenant_isolation_select ON public.webhook_replay_claims;
CREATE POLICY webhook_replay_tenant_isolation_select ON public.webhook_replay_claims FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()));
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (81, 'rls_global_select_tightening', 'sha256:9238a2d15b91e9887e8f4a84cee26278ee35c3ee42d07dd171faf61b9864b091');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('eef950f979b7f94c7e2960a09600f8c8d132dc3890a80ba73dfd02bdd8346bda', 1788779000000);

-- ----------------------------------------------------------------------
-- 20260907040000_function_grants_repair
-- ----------------------------------------------------------------------
-- F82: grant EXECUTE yang hilang untuk fungsi worker/admin (PENDING tindak lanjut).
--
-- v33 (function_api_reconciliation) me-drop claim_activation_attempts saat gelombang
-- rename claim_delivery_*, dan v78 menciptakannya kembali sebagai
-- claim_delivery_activation_attempts — tanpa GRANT sehingga indicate_runtime tetap
-- ditolak. Migrasi ini memberikan (dan merapikan) grant yang kurang:
-- claim_delivery_activation_attempts (reconciler), hold_create/hold_list/
-- hold_release + erasure_request_create/erasure_request_list (panel moderasi),
-- audit_worm_fetch (ekspor WORM).
-- Pola mengikuti migrasi lama: REVOKE ALL FROM PUBLIC lalu GRANT ke indicate_runtime.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
REVOKE ALL ON FUNCTION indicate_private.claim_delivery_activation_attempts(timestamptz, integer, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.claim_delivery_activation_attempts(timestamptz, integer, uuid, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.hold_create(uuid, text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.hold_create(uuid, text, uuid, text, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.hold_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.hold_list(uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.hold_release(uuid, text, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.hold_release(uuid, text, uuid, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.erasure_request_create(uuid, text, uuid, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.erasure_request_create(uuid, text, uuid, text, timestamptz, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.erasure_request_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.erasure_request_list(uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.audit_worm_fetch(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.audit_worm_fetch(timestamptz, timestamptz, text) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (82, 'function_grants_repair', 'sha256:0a309d26b79151a2697869f89de31d82fcf32056aebf350898a264c38b780c1f');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('9ef1be218107d9be43339825e6759089399c61891c65d2f83782657ee60b05d9', 1788780000000);

-- ----------------------------------------------------------------------
-- 20260907050000_telegram_outbox
-- ----------------------------------------------------------------------
-- F83: antrean keluar Telegram + broadcast (PENDING A5).
--
-- deliverReplies selama ini hanya me-log gagal kirim (balasan hilang). Kini
-- kegagalan dipersist ke telegram_outbox dengan backoff + hormat retry_after,
-- diproses worker drain harian; broadcast platform mengantrekan satu pesan ke
-- semua mapping aktif. Function-only untuk tulis/baca antrean (RLS
-- enabled+forced, tanpa grant tabel ke indicate_runtime); worker claim/ack dan
-- enqueue diberikan ke runtime mengikuti pola claim_* yang ada.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TABLE public.telegram_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  chat_id text NOT NULL CHECK (length(chat_id) BETWEEN 1 AND 100),
  text text NOT NULL CHECK (length(text) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_error text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX telegram_outbox_due_idx ON public.telegram_outbox (status, next_attempt_at);
ALTER TABLE public.telegram_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_outbox FORCE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION indicate_private.outbox_enqueue(p_organization_id uuid, p_chat_id text, p_text text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF p_chat_id IS NULL OR length(p_chat_id) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'outbox chat invalid' USING ERRCODE = '42501';
  END IF;
  IF p_text IS NULL OR length(p_text) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'outbox text invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.telegram_outbox(id, organization_id, chat_id, text, status, attempts, next_attempt_at, created_at, updated_at)
  VALUES (v_id, p_organization_id, p_chat_id, p_text, 'pending', 0, p_now, p_now, p_now);
  RETURN v_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.outbox_claim(p_now timestamp with time zone, p_limit integer)
 RETURNS SETOF telegram_outbox
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.telegram_outbox
    WHERE status = 'pending' AND next_attempt_at <= p_now
    ORDER BY next_attempt_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(p_limit, 50))
  )
  UPDATE public.telegram_outbox row SET status = 'sending', updated_at = p_now
  FROM candidates WHERE row.id = candidates.id
  RETURNING row.*;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.outbox_ack(p_id uuid, p_ok boolean, p_retry_after integer, p_error text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_attempts integer;
BEGIN
  SELECT attempts INTO v_attempts FROM public.telegram_outbox WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_ok THEN
    UPDATE public.telegram_outbox SET status = 'sent', last_error = NULL, updated_at = p_now WHERE id = p_id;
    RETURN true;
  END IF;
  IF v_attempts + 1 >= 8 THEN
    UPDATE public.telegram_outbox SET status = 'dead', attempts = attempts + 1, last_error = p_error, updated_at = p_now WHERE id = p_id;
    RETURN true;
  END IF;
  UPDATE public.telegram_outbox
  SET status = 'pending', attempts = attempts + 1, last_error = p_error,
      next_attempt_at = p_now + make_interval(secs => LEAST(GREATEST(COALESCE(p_retry_after, 0), 60 * (2 ^ LEAST(v_attempts, 5)))::integer, 21600)),
      updated_at = p_now
  WHERE id = p_id;
  RETURN true;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.outbox_broadcast_targets(p_actor_id uuid)
 RETURNS TABLE(organization_id uuid, chat_id text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT DISTINCT m.organization_id, m.telegram_chat_id
  FROM public.telegram_identity_mappings m WHERE m.status = 'active' ORDER BY m.organization_id, m.telegram_chat_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.outbox_enqueue(uuid, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.outbox_enqueue(uuid, text, text, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.outbox_claim(timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.outbox_claim(timestamptz, integer) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.outbox_ack(uuid, boolean, integer, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.outbox_ack(uuid, boolean, integer, text, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.outbox_broadcast_targets(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.outbox_broadcast_targets(uuid) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (83, 'telegram_outbox', 'sha256:9202019251aac5d50fcd943ab37072cc5e4f94c53f9d9e8055281608b0355bf8');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('7c4b646650088954612cd6a01fa623c5e9349bfb571d9aa34a3bcd2356effa1e', 1788781000000);

-- ----------------------------------------------------------------------
-- 20260907060000_lead_consent
-- ----------------------------------------------------------------------
-- F84: consent trail lead publik + linking Telegram (PENDING A6).
--
-- 1. enterprise_leads + telegram_identity_mappings: kolom consented_at,
--    consent_text_version, ip_hash (sha256 heks IP pemohon; NULL bila IP tidak
--    teramati, mis. penautan via dasbor admin).
-- 2. billing_lead_create 3-arg diganti versi 6-arg yang mewajibkan consent;
--    grant runtime diterbitkan ulang (grant tidak terbawa saat signatur berubah).
-- Teks persetujuan versi lead-consent/1 dan telegram-link/1 hidup di kode.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.enterprise_leads
  ADD COLUMN IF NOT EXISTS consented_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS consent_text_version text NULL,
  ADD COLUMN IF NOT EXISTS ip_hash text NULL CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE public.telegram_identity_mappings
  ADD COLUMN IF NOT EXISTS consented_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS consent_text_version text NULL,
  ADD COLUMN IF NOT EXISTS ip_hash text NULL CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$');
DROP FUNCTION IF EXISTS indicate_private.billing_lead_create(text, text, text);
CREATE OR REPLACE FUNCTION indicate_private.billing_lead_create(p_nama text, p_email text, p_kebutuhan text, p_consented_at timestamp with time zone, p_consent_text_version text, p_ip_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF p_nama IS NULL OR length(p_nama) NOT BETWEEN 1 AND 200 OR p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 OR p_kebutuhan IS NULL OR length(p_kebutuhan) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'lead fields invalid' USING ERRCODE = '42501';
  END IF;
  IF p_consented_at IS NULL OR p_consent_text_version IS NULL OR length(p_consent_text_version) NOT BETWEEN 1 AND 64 OR p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'lead consent invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.enterprise_leads(id, nama, email, kebutuhan, consented_at, consent_text_version, ip_hash)
  VALUES (v_id, p_nama, p_email, p_kebutuhan, p_consented_at, p_consent_text_version, p_ip_hash);
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.billing_lead_create(text, text, text, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.billing_lead_create(text, text, text, timestamptz, text, text) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (84, 'lead_consent', 'sha256:cbc059697c94ba7dbaccfb7ae03d1331193de18903a87a7bc0210d434083a060');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5b34f645a608638a10d77852284daead5369d445ff5472a978bff5db8ee6cb86', 1788782000000);

-- ----------------------------------------------------------------------
-- 20260907080000_function_only_policies
-- ----------------------------------------------------------------------
-- F85: kebijakan default-deny eksplisit untuk tabel function-only baru (v79/v80/v83).
-- Mengikuti pola billing_function_only: RLS tetap enabled+forced, tetapi linter
-- keamanan Supabase menandai tabel tanpa kebijakan apa pun. Kebijakan
-- USING (false) WITH CHECK (false) membuat penolakan eksplisit (perilaku sama:
-- akses hanya lewat fungsi SECURITY DEFINER).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE POLICY litigation_holds_function_only ON public.litigation_holds FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY org_erasure_requests_function_only ON public.org_erasure_requests FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE POLICY telegram_outbox_function_only ON public.telegram_outbox FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (85, 'function_only_policies', 'sha256:9b15cbca7b133758831bd739e09b017674976d56f5877981398ab0aae2e1e1a1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('2bab06cdc9f2a5d02bb2bd88ee4ee0c189d0e231d6ab4106dc78248e4d0ec4a6', 1788783000000);

-- ----------------------------------------------------------------------
-- 20260907090000_worm_export_proof
-- ----------------------------------------------------------------------
-- F86: bukti export WORM via fungsi (perbaikan v81).
--
-- Modul ekspor menulis bukti langsung ke retention_runs sebagai indicate_runtime,
-- tetapi tabel itu function-only (USING false). Kini pencatatan lewat fungsi
-- allowlist SECURITY DEFINER berikut.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.worm_export_proof(p_category text, p_purged_count integer, p_started_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF p_category NOT IN ('audit_worm_export') THEN
    RAISE EXCEPTION 'worm proof category not allowed' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at)
  VALUES (p_category, p_purged_count, p_started_at, now());
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.worm_export_proof(text, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.worm_export_proof(text, integer, timestamptz) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (86, 'worm_export_proof', 'sha256:a9d8295b9cfa43811268a74c2055ae86bae4e23f991afd9c2911f6f396b3892b');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e39fbc068a47ee9681de3fd4d0dc1d3ced101f7ee28a66df9dcb9d2d938b5be5', 1788784000000);

-- ----------------------------------------------------------------------
-- 20260907100000_delivery_previous_host_owned
-- ----------------------------------------------------------------------
-- F87: helper kepemilikan hostname sebelumnya yang hilang.
--
-- delivery.ts beginActivation memanggil
-- indicate_private.is_delivery_previous_host_owned(...) saat hostname site
-- berpindah, tetapi fungsi tersebut tidak pernah dibuat migrasi mana pun
-- (kelas yang sama dengan claim_delivery_activation_attempts pada v78):
-- aktivasi dengan previousHostname selalu gagal "function does not exist".
-- Semantik: true bila hostname sebelumnya masih tercatat pada site tersebut.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.is_delivery_previous_host_owned(p_organization_id uuid, p_site_id uuid, p_hostname text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sites
    WHERE organization_id = p_organization_id AND id = p_site_id AND normalized_hostname = p_hostname
  )
$function$;
REVOKE ALL ON FUNCTION indicate_private.is_delivery_previous_host_owned(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.is_delivery_previous_host_owned(uuid, uuid, text) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (87, 'delivery_previous_host_owned', 'sha256:ec262e41300964c5b35a90452df2168982cfca6ae402d2c544d9a6dde5190129');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6b0d16b60cf393663fa21911ed40832abbd0e25038ab6a6909dc96cfe72e646d', 1788785000000);

-- ----------------------------------------------------------------------
-- 20260907110000_ops_visibility
-- ----------------------------------------------------------------------
-- F88: keterlihatan operasional (retensi + outbox).
--
-- retention_runs dan telegram_outbox adalah tabel function-only tanpa baca
-- runtime, sehingga bukti sweep/export/erasure dan antrean Telegram tidak
-- terlihat di dasbor. Dua pembaca allowlist:
-- - retention_list: anggota aktif suatu org melihat baris global + org-nya.
-- - outbox_list_platform: khusus platform admin (berisi chat lintas org).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.retention_list(p_actor_id uuid, p_organization_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, category text, purged_count integer, started_at timestamp with time zone, finished_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m JOIN public.users u ON u.id = m.user_id
    WHERE m.organization_id = p_organization_id AND m.user_id = p_actor_id
      AND m.status = 'active' AND u.status = 'active'
  ) THEN
    RAISE EXCEPTION 'membership required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT r.id, r.organization_id, r.category, r.purged_count, r.started_at, r.finished_at
  FROM public.retention_runs r
  WHERE r.organization_id IS NULL OR r.organization_id = p_organization_id
  ORDER BY r.started_at DESC LIMIT 100;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.outbox_list_platform(p_actor_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, chat_id text, status text, attempts integer, next_attempt_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.organization_id, o.chat_id, o.status, o.attempts, o.next_attempt_at, o.created_at
  FROM public.telegram_outbox o WHERE o.status <> 'sent' ORDER BY o.next_attempt_at, o.id LIMIT 100;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.retention_list(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.retention_list(uuid, uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.outbox_list_platform(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.outbox_list_platform(uuid) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (88, 'ops_visibility', 'sha256:414877ce74e48efc153bed150a99085cc440216b2cf4ce000dc0ae11301ab39e');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('9f0190f034aa3fd4e9e67de2ccf416b23019cecdf252fe47d0272851d949c6ab', 1788786000000);

-- ----------------------------------------------------------------------
-- 20260907120000_invoice_list
-- ----------------------------------------------------------------------
-- F89: daftar faktur untuk panel billing.
--
-- invoices function-only; panel butuh daftar milik sendiri (order milik user
-- atau org keanggotaannya) + semua untuk platform admin.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.invoice_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, order_id uuid, org_id uuid, package_name text, amount integer, paid_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_platform boolean;
BEGIN
  v_platform := indicate_private.permission_has_platform_admin(p_actor_id);
  RETURN QUERY
  SELECT i.id, i.order_id, o.org_id, p.name, i.amount, i.paid_at, i.created_at
  FROM public.invoices i
  JOIN public.orders o ON o.id = i.order_id
  LEFT JOIN public.packages p ON p.id = o.package_id
  WHERE v_platform
    OR o.user_id = p_actor_id
    OR (o.org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = o.org_id AND m.user_id = p_actor_id AND m.status = 'active'
    ))
  ORDER BY i.paid_at DESC LIMIT 100;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list(uuid) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (89, 'invoice_list', 'sha256:344c13557d670084a5a12e96264feed4ec46be188c84735db73282a2d94c5859');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('eab0fb0ff02350f5c5b234035144f8e14fe9e5c4db61a298232f1375399becd0', 1788787000000);

-- ----------------------------------------------------------------------
-- 20260907130000_ops_fk_covering_indexes
-- ----------------------------------------------------------------------
-- F90: covering index untuk FK baru (advisor unindexed_foreign_keys).
-- org_erasure_requests.organization_id dan telegram_outbox.organization_id
-- tidak tercakup index (hanya due_idx yang kolom pertamanya status).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE INDEX IF NOT EXISTS org_erasure_requests_organization_idx ON public.org_erasure_requests USING btree (organization_id);
CREATE INDEX IF NOT EXISTS telegram_outbox_organization_idx ON public.telegram_outbox USING btree (organization_id);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (90, 'ops_fk_covering_indexes', 'sha256:beae2c320d9da542ac57d6d5ff2cf5598895acc17debeab8f07662f91d8ed6ca');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('a9e99e8725de43325befe61a4b94d21063be8baf58d75a8b6adef0a74ed7055f', 1788788000000);

-- ----------------------------------------------------------------------
-- 20260907140000_article_site_view_counts
-- ----------------------------------------------------------------------
-- F91: page views per situs (real + custom).
--
-- view_count: total real teragregat dari Redis (ditulis worker flush).
-- custom_view_count: angka dasar manual dari dasbor (ditampilkan + real).
-- Tampil = custom_view_count + view_count.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.article_sites
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  ADD COLUMN IF NOT EXISTS custom_view_count integer NOT NULL DEFAULT 0 CHECK (custom_view_count >= 0);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (91, 'article_site_view_counts', 'sha256:f8a32ade33af9cc3e49c01d64e261b1d1635a9d321946f2536e7fa83b5dfc456');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('30ccbebf959a89aeef8d7ccadc872895a90e62b4387a2d376086fc2e742f40e8', 1788789000000);

-- ----------------------------------------------------------------------
-- 20260907150000_article_tags
-- ----------------------------------------------------------------------
-- F92: tags artikel untuk arsip topik.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[];
CREATE INDEX IF NOT EXISTS articles_tags_gin_idx ON public.articles USING gin (tags);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (92, 'article_tags', 'sha256:9bceec37ddec044e6961419fffa37def005d45e6fff5f762a8c9130a8284903d');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('95e29c7703dd24b8081850223ad2e76bad347e58b1da3c52d8cfecafe4cfa2d2', 1788790000000);

-- ----------------------------------------------------------------------
-- 20260907160000_merge_view_counts
-- ----------------------------------------------------------------------
-- F93: gabung counter views menjadi satu kolom.
--
-- custom_view_count tidak pernah dipakai produksi (fitur belum rilis, nol baris
-- berisi nilai): hapus, view_count menjadi satu-satunya angka absolut.
-- Real (flush) menambah; edit manual menimpa absolut.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.article_sites DROP COLUMN IF EXISTS custom_view_count;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (93, 'merge_view_counts', 'sha256:f39d872a28b766d00cd24954bbd1926d23b95bfb8c3c3642b5726741a32c1af6');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4577d7045f8bd1a22478c3390d3ecd6453998d18ff9a4a4c3df0c517bec190de', 1788791000000);

-- ----------------------------------------------------------------------
-- 20260907170000_seed_upt_jateng_59org
-- ----------------------------------------------------------------------
-- Seed 59 UPT Kanwil Ditjenpas Jateng sebagai 59 organisasi independen
-- (masing-masing membayar; subdomain per UPT menyusul saat aktivasi).
--
-- Per org: organizations (paket pro, active) + 27 permission org via
-- org_ensure_permissions + subscriptions (pro/active 30 hari) + 1 publishers
-- terverifikasi (correctional_institution, evidence = direktori resmi) +
-- 1 baris audit customer.seed. Roles/memberships lahir belakangan lewat
-- alur role.create + invite saat admin tiap UPT onboarding.
--
-- Sumber data: https://pemasyarakatanjateng.id/satker (32 Lapas + 18 Rutan
-- + 8 Bapas + 1 LPKA; diverifikasi melawan llms-full resmi).
-- Idempoten: setiap INSERT dijaga NOT EXISTS (slug org). occurredAt = now(),
-- tidak backdate, agar ekspor WORM tetap konsisten.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
INSERT INTO public.organizations(id, name, slug, status, customer_metadata, version, created_at, updated_at)
SELECT gen_random_uuid(), v.name, v.slug, 'active', v.meta::jsonb, 1, now(), now()
FROM (VALUES
  ('LAPAS KELAS I BATU NUSAKAMBANGAN', 'lapas-kelas-i-batu-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Jl. Candi, Pulau Nusa Kambangan, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"(0282) 5255270","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-i-batu-nusakambangan"}'),
  ('LAPAS KELAS I SEMARANG', 'lapas-kelas-i-semarang', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kota Semarang","address":"Jl. Raya Semarang-Boja KM.4, Wates, Kec. Ngaliyan, Kota Semarang, Jawa Tengah 50188","phone":"(024) 76433499","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-i-semarang"}'),
  ('LAPAS KELAS II A AMBARAWA', 'lapas-kelas-ii-a-ambarawa', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kota Semarang","address":"Jl. Benteng Dalam No.1, Bugisari, Lodoyong, Kec. Ambarawa, Kabupaten Semarang, Jawa Tengah 50612","phone":"(0298) 591017","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-ambarawa"}'),
  ('LAPAS KELAS II A BESI NUSAKAMBANGAN', 'lapas-kelas-ii-a-besi-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Jl. Lapas Nusakambangan, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"(0282) 5255264","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-besi-nusakambangan"}'),
  ('LAPAS KHUSUS KELAS II A KARANGANYAR NUSAKAMBANGAN', 'lapas-khusus-kelas-ii-a-karanganyar-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Unnamed Road, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"089517900220","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-khusus-kelas-ii-a-karanganyar-nusakambangan"}'),
  ('LAPAS KELAS II A KEMBANG KUNING NUSAKAMBANGAN', 'lapas-kelas-ii-a-kembang-kuning-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Unnamed Road, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"(0282) 5255355","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-kembang-kuning-nusakambangan"}'),
  ('LAPAS KELAS II A GLADAKAN NUSAKAMBANGAN', 'lapas-kelas-ii-a-gladakan-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"(028) 25102021","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-gladakan-nusakambangan"}'),
  ('LAPAS KELAS II A KUMBANG NUSAKAMBANGAN', 'lapas-kelas-ii-a-kumbang-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Tambakreja, Kec. Cilacap Selatan, Kabupaten Cilacap, Jawa Tengah","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-kumbang-nusakambangan"}'),
  ('LAPAS KELAS II A NGASEMAN NUSAKAMBANGAN', 'lapas-kelas-ii-a-ngaseman-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Nusakambangan, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"0895-6284-09080","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-ngaseman-nusakambangan"}'),
  ('LAPAS KELAS II A KENDAL', 'lapas-kelas-ii-a-kendal', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Kendal","address":"Karanggeneng, Pegulon, Kec. Kendal, Kabupaten Kendal, Jawa Tengah 51313","phone":"(0294) 6100004","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-kendal"}'),
  ('LAPAS KELAS II A MAGELANG', 'lapas-kelas-ii-a-magelang', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kota Magelang","address":"Jl. Sutopo No.2, Cacaban, Kec. Magelang Tengah, Kota Magelang, Jawa Tengah 56121","phone":"(0293) 362080","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-magelang"}'),
  ('LAPAS NARKOTIKA KELAS II A NUSAKAMBANGAN', 'lapas-narkotika-kelas-ii-a-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"(0282) 5255259","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-narkotika-kelas-ii-a-nusakambangan"}'),
  ('LAPAS NARKOTIKA KELAS II B PURWOKERTO', 'lapas-narkotika-kelas-ii-b-purwokerto', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Banyumas","address":"Jl. Jend. Sudirman No.104, Pereng, Sokanegara, Kec. Purwokerto Tim., Kabupaten Banyumas, Jawa Tengah 53141","phone":"0895-4161-14108","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-narkotika-kelas-ii-b-purwokerto"}'),
  ('LAPAS KELAS II A PASIR PUTIH NUSAKAMBANGAN', 'lapas-kelas-ii-a-pasir-putih-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Tambakreja, Kec. Cilacap Selatan, Kabupaten Cilacap, Jawa Tengah","phone":"0882-3923-2505","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-pasir-putih-nusakambangan"}'),
  ('LAPAS KELAS II A PEKALONGAN', 'lapas-kelas-ii-a-pekalongan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kota Pekalongan","address":"Jl. Wr. Supratman No.106, Panjang Wetan, Kec. Pekalongan Utara, Kota Pekalongan, Jawa Tengah 51141","phone":"(0285) 422291","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-pekalongan"}'),
  ('LAPAS PEREMPUAN KELAS II A SEMARANG', 'lapas-perempuan-kelas-ii-a-semarang', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kota Semarang","address":"Jl. Mgr Sugiyopranoto No.59, Pendrikan Kidul, Kec. Semarang Tengah, Kota Semarang, Jawa Tengah 50131","phone":"(024) 3543060","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-perempuan-kelas-ii-a-semarang"}'),
  ('LAPAS KELAS II A PERMISAN NUSAKAMBANGAN', 'lapas-kelas-ii-a-permisan-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"(0282) 5255353","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-permisan-nusakambangan"}'),
  ('LAPAS KELAS II A PURWOKERTO', 'lapas-kelas-ii-a-purwokerto', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Banyumas","address":"Pamijen Lor, Pamijen, Kec. Sokaraja, Kabupaten Banyumas, Jawa Tengah 53181","phone":"(0281) 6512955","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-purwokerto"}'),
  ('LAPAS KELAS II A SRAGEN', 'lapas-kelas-ii-a-sragen', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Sragen","address":"Jl. Sukowati, Dusun Kebayanan Widodo 2, Sragen Wetan, Kec. Sragen, Kabupaten Sragen, Jawa Tengah 57214","phone":"0271 891230","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-sragen"}'),
  ('LAPAS KELAS II B NIRBAYA NUSAKAMBANGAN', 'lapas-kelas-ii-b-nirbaya-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"0856-4975-4129","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-nirbaya-nusakambangan"}'),
  ('LAPAS KELAS II B BATANG', 'lapas-kelas-ii-b-batang', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Batang","address":"Jalan Raya Batang KM 4.1, Rowobelang, Tembelang, Rowobelang, Kec. Batang, Kabupaten Batang, Jawa Tengah 51216","phone":"(0285) 4494300","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-batang"}'),
  ('LAPAS KELAS II B BREBES', 'lapas-kelas-ii-b-brebes', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Brebes","address":"Jl. Slamet No.1, Kleben, Brebes, Kec. Brebes, Kabupaten Brebes, Jawa Tengah 52212","phone":"0283 617090","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-brebes"}'),
  ('LAPAS KELAS II B CILACAP', 'lapas-kelas-ii-b-cilacap', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Jl. Mataram 1, Cilacap, Sidanegara, Kec. Cilacap Tengah, Kabupaten Cilacap, Jawa Tengah 53212","phone":"(0282) 534037","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-cilacap"}'),
  ('LAPAS KELAS II B KLATEN', 'lapas-kelas-ii-b-klaten', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Klaten","address":"Jl. Pemuda No.206, Pondok, Klaten, Kec. Klaten Tengah, Kabupaten Klaten, Jawa Tengah 57411","phone":"(0272) 322019","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-klaten"}'),
  ('LAPAS KELAS II B PATI', 'lapas-kelas-ii-b-pati', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Pati","address":"Jl. Akpb Agil Kusumadya No.19, Ngarus, Kec. Pati, Kabupaten Pati, Jawa Tengah 59112","phone":"(0295) 381207","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-pati"}'),
  ('LAPAS KELAS II B PURWODADI', 'lapas-kelas-ii-b-purwodadi', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Grobogan","address":"Jl. R.Suprapto No.54, Jetis Timur, Purwodadi, Kec. Purwodadi, Kabupaten Grobogan, Jawa Tengah 58111","phone":"(0292) 421188","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-purwodadi"}'),
  ('LAPAS KELAS II B SLAWI', 'lapas-kelas-ii-b-slawi', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kota Tegal","address":"Tegalandong, Kabupaten Tegal, Jawa Tengah","phone":"(0283) 6190679","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-slawi"}'),
  ('LAPAS KELAS II B TEGAL', 'lapas-kelas-ii-b-tegal', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kota Tegal","address":"Jl. Yos Sudarso No.2, Tegalsari, Kec. Tegal Bar., Kota Tegal, Jawa Tengah 52111","phone":"(0283) 351040","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-tegal"}'),
  ('LAPAS KELAS II B WONOGIRI', 'lapas-kelas-ii-b-wonogiri', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Wonogiri","address":"Donoharjo, Wuryorejo, Kec. Wonogiri, Kabupaten Wonogiri, Jawa Tengah 57614","phone":"(0273) 321010","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-wonogiri"}'),
  ('LAPAS PEMUDA KELAS II B PLANTUNGAN', 'lapas-pemuda-kelas-ii-b-plantungan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Jawa Tengah","address":"Wonokambang, Tirtomulyo, Kec. Plantungan, Kabupaten Kendal, Jawa Tengah 51362","phone":"0896-9190-1680","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-pemuda-kelas-ii-b-plantungan"}'),
  ('LAPAS TERBUKA KELAS II B KENDAL', 'lapas-terbuka-kelas-ii-b-kendal', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Kendal","address":"Sopoyono, Wonosari, Kec. Patebon, Kabupaten Kendal, Jawa Tengah 51351","phone":"(0294) 579229","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-terbuka-kelas-ii-b-kendal"}'),
  ('LAPAS TERBUKA KELAS II B NUSAKAMBANGAN', 'lapas-terbuka-kelas-ii-b-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"LAPAS","city":"Kab. Cilacap","address":"Unnamed Road, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"0856-4975-4129","detailUrl":"https://pemasyarakatanjateng.id/satker/lapas-terbuka-kelas-ii-b-nusakambangan"}'),
  ('LPKA KELAS I KUTOARJO', 'lpka-kelas-i-kutoarjo', '{"seed":"upt-jateng-59org","uptType":"LPKA","city":"Jawa Tengah","address":"Jl. Pangeran Diponegoro No.36 A, Kutoarjo, Kec. Kutoarjo, Kabupaten Purworejo, Jawa Tengah 54214","phone":"(0275) 641011","detailUrl":"https://pemasyarakatanjateng.id/satker/lpka-kelas-i-kutoarjo"}'),
  ('RUTAN KELAS I SEMARANG', 'rutan-kelas-i-semarang', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kota Semarang","address":"Jalan Dokter Cipto No.62, Kebonagung, Kec. Semarang Tim., Kota Semarang, Jawa Tengah 50123","phone":"0821-4568-096","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-i-semarang"}'),
  ('RUTAN KELAS I SURAKARTA', 'rutan-kelas-i-surakarta', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kota Surakarta","address":"Jl. Brigjen Slamet Riyadi No.18, Kp. Baru, Kec. Ps. Kliwon, Kota Surakarta, Jawa Tengah 57111","phone":"0271 642220","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-i-surakarta"}'),
  ('RUTAN KELAS II A PEKALONGAN', 'rutan-kelas-ii-a-pekalongan', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kota Pekalongan","address":"Panjang Wetan, Pekalongan, Kota Pekalongan, Jawa Tengah 51141","phone":"0822-2339-9433","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-a-pekalongan"}'),
  ('RUTAN KELAS II B BANJARNEGARA', 'rutan-kelas-ii-b-banjarnegara', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Jawa Tengah","address":"Jl. Pemuda No.81, Kutabanjarnegara, Kec. Banjarnegara, Kab. Banjarnegara, Jawa Tengah 53418","phone":"(0286) 591014","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-banjarnegara"}'),
  ('RUTAN KELAS II B BANYUMAS', 'rutan-kelas-ii-b-banyumas', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Banyumas","address":"Banyumas, Sudagaran, Kec. Banyumas, Kabupaten Banyumas, Jawa Tengah 53192","phone":"0281 796014","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-banyumas"}'),
  ('RUTAN KELAS II B BLORA', 'rutan-kelas-ii-b-blora', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Blora","address":"Jl. Abu Umar No.9, Kauman, Kunden, Kec. Blora, Kabupaten Blora, Jawa Tengah 58212","phone":"(0296) 531022","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-blora"}'),
  ('RUTAN KELAS II B BOYOLALI', 'rutan-kelas-ii-b-boyolali', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Boyolali","address":"MASAHAN, Mojosongo, Kec. Mojosongo, Kabupaten Boyolali, Jawa Tengah 57322","phone":"0823-2572-3552","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-boyolali"}'),
  ('RUTAN KELAS II B DEMAK', 'rutan-kelas-ii-b-demak', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Demak","address":"Jl. Sultan Fatah, Kauman, Bintoro, Kec. Demak, Kabupaten Demak, Jawa Tengah 59511","phone":"(0291) 685128","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-demak"}'),
  ('RUTAN KELAS II B JEPARA', 'rutan-kelas-ii-b-jepara', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Jepara","address":"Pengkol IV, Pengkol, Kec. Jepara, Kabupaten Jepara, Jawa Tengah 59415","phone":"0291591008","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-jepara"}'),
  ('RUTAN KELAS II B KEBUMEN', 'rutan-kelas-ii-b-kebumen', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Kebumen","address":"Jl. Pahlawan No.163, Keposan, Kebumen, Kec. Kebumen, Kabupaten Kebumen, Jawa Tengah 54311","phone":"(0287) 381622","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-kebumen"}'),
  ('RUTAN KELAS II B KUDUS', 'rutan-kelas-ii-b-kudus', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Kudus","address":"Jl. Sunan Kudus No.70, Kudus, Demaan, Kec. Kota Kudus, Kabupaten Kudus, Jawa Tengah 59313","phone":"(0291) 437581","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-kudus"}'),
  ('RUTAN KELAS II B PEMALANG', 'rutan-kelas-ii-b-pemalang', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Pemalang","address":"Jl. Muchtar No.3, Kebondalem, Kec. Pemalang, Kabupaten Pemalang, Jawa Tengah 52312","phone":"(0284) 321036","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-pemalang"}'),
  ('RUTAN KELAS II B PURBALINGGA', 'rutan-kelas-ii-b-purbalingga', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Purbalingga","address":"Jl. Letjen Suprapto No.6, Purbalingga, Purbalingga Lor, Kec. Purbalingga, Kabupaten Purbalingga, Jawa Tengah 53311","phone":"(0281) 891026","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-purbalingga"}'),
  ('RUTAN KELAS II B PURWOREJO', 'rutan-kelas-ii-b-purworejo', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Purworejo","address":"Jl. Mayjen Sutoyo No.61, Rw. IV, Sindurjan, Kec. Purworejo, Kabupaten Purworejo, Jawa Tengah 54113","phone":"(0275) 2973466","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-purworejo"}'),
  ('RUTAN KELAS II B REMBANG', 'rutan-kelas-ii-b-rembang', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Rembang","address":"Pandean, Kec. Rembang, Kabupaten Rembang, Jawa Tengah 59211","phone":"(0295) 691023","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-rembang"}'),
  ('RUTAN KELAS II B SALATIGA', 'rutan-kelas-ii-b-salatiga', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kota Salatiga","address":"Jl. Yos Sudarso No.4, Salatiga, Kec. Sidorejo, Kota Salatiga, Jawa Tengah 50711","phone":"(0298) 328296","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-salatiga"}'),
  ('RUTAN KELAS II B TEMANGGUNG', 'rutan-kelas-ii-b-temanggung', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Temanggung","address":"Jl. Brigjen. Katamso No.1, Suronatan, Temanggung II, Kec. Temanggung, Kabupaten Temanggung, Jawa Tengah 56213","phone":"(0293) 491128","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-temanggung"}'),
  ('RUTAN KELAS II B WONOSOBO', 'rutan-kelas-ii-b-wonosobo', '{"seed":"upt-jateng-59org","uptType":"RUTAN","city":"Kab. Wonosobo","address":"Jl. Pramuka No.1, Sumberan Barat, Wonosobo Bar., Kec. Wonosobo, Kabupaten Wonosobo, Jawa Tengah 56311","phone":"(0286) 321030","detailUrl":"https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-wonosobo"}'),
  ('BAPAS KELAS I SEMARANG', 'bapas-kelas-i-semarang', '{"seed":"upt-jateng-59org","uptType":"BAPAS","city":"Kota Semarang","address":"Jl. Siliwangi No.508, Kembangarum, Kec. Semarang Barat, Kota Semarang, Jawa Tengah 50148","phone":"0888-4750-888","detailUrl":"https://pemasyarakatanjateng.id/satker/bapas-kelas-i-semarang"}'),
  ('BAPAS KELAS II KLATEN', 'bapas-kelas-ii-klaten', '{"seed":"upt-jateng-59org","uptType":"BAPAS","city":"Kota Tegal","address":"Jl. Andalas, Tegalputihan, Semangkak, Kec. Klaten Tengah, Kabupaten Klaten, Jawa Tengah 57413","phone":"0812-2852-8669","detailUrl":"https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-klaten"}'),
  ('BAPAS KELAS I SURAKARTA', 'bapas-kelas-i-surakarta', '{"seed":"upt-jateng-59org","uptType":"BAPAS","city":"Kota Surakarta","address":"Jl. R. M. Said No.259, Manahan, Kec. Banjarsari, Kota Surakarta, Jawa Tengah 57139","phone":"0858-6799-8553","detailUrl":"https://pemasyarakatanjateng.id/satker/bapas-kelas-i-surakarta"}'),
  ('BAPAS KELAS II NUSAKAMBANGAN', 'bapas-kelas-ii-nusakambangan', '{"seed":"upt-jateng-59org","uptType":"BAPAS","city":"Kab. Cilacap","address":"Nusakambangan, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263","phone":"0895-3293-95245","detailUrl":"https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-nusakambangan"}'),
  ('BAPAS KELAS II PATI', 'bapas-kelas-ii-pati', '{"seed":"upt-jateng-59org","uptType":"BAPAS","city":"Kab. Pati","address":"Jl. P. Sudirman, Gebyaran, Sukoharjo, Kec. Margorejo, Kabupaten Pati, Jawa Tengah 59163","phone":"0295-381800","detailUrl":"https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-pati"}'),
  ('BAPAS KELAS II MAGELANG', 'bapas-kelas-ii-magelang', '{"seed":"upt-jateng-59org","uptType":"BAPAS","city":"Kota Magelang","address":"Jl. Jend. Gatot Soebroto No.18, Pakelsari, Banyurojo, Kec. Mertoyudan, Kabupaten Magelang, Jawa Tengah 56172","phone":"(0293) 362207","detailUrl":"https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-magelang"}'),
  ('BAPAS KELAS II PEKALONGAN', 'bapas-kelas-ii-pekalongan', '{"seed":"upt-jateng-59org","uptType":"BAPAS","city":"Kota Pekalongan","address":"Jl. Darma bakti No.133, Kebulen, Medono, Kec. Pekalongan Bar., Kota Pekalongan, Jawa Tengah 51112","phone":"(0285) 421949","detailUrl":"https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-pekalongan"}'),
  ('BAPAS KELAS II PURWOKERTO', 'bapas-kelas-ii-purwokerto', '{"seed":"upt-jateng-59org","uptType":"BAPAS","city":"Kab. Banyumas","address":"Jl. Pasukan Pelajar Imam No.7, Pamijen Lor, Pamijen, Sokaraja, Kabupaten Banyumas, Jawa Tengah 53181","phone":"(0281) 636608","detailUrl":"https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-purwokerto"}')
) AS v(name, slug, meta)
WHERE NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.slug = v.slug);
SELECT indicate_private.org_ensure_permissions(id) FROM public.organizations WHERE customer_metadata->>'seed' = 'upt-jateng-59org';
INSERT INTO public.subscriptions(organization_id, plan, status, period_starts_at, period_ends_at, version, created_at, updated_at)
SELECT o.id, 'pro', 'active', now(), now() + interval '30 days', 1, now(), now()
FROM public.organizations o
WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id);
INSERT INTO public.publishers(organization_id, id, name, type, verification_status, attribution_label, contacts, evidence_reference, submitted_by, submitted_at, verified_by, verified_at, rejection_reason, status, version, created_at, updated_at)
SELECT o.id, gen_random_uuid(), v.name, 'correctional_institution', 'verified', v.name,
  jsonb_build_object('address', v.address, 'phone', nullif(v.phone, ''), 'city', v.city, 'detailUrl', v.evidence),
  v.evidence, NULL, NULL, NULL, now(), NULL, 'active', 1, now(), now()
FROM public.organizations o
JOIN (VALUES
  ('lapas-kelas-i-batu-nusakambangan', 'LAPAS KELAS I BATU NUSAKAMBANGAN', 'Jl. Candi, Pulau Nusa Kambangan, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '(0282) 5255270', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-i-batu-nusakambangan'),
  ('lapas-kelas-i-semarang', 'LAPAS KELAS I SEMARANG', 'Jl. Raya Semarang-Boja KM.4, Wates, Kec. Ngaliyan, Kota Semarang, Jawa Tengah 50188', '(024) 76433499', 'Kota Semarang', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-i-semarang'),
  ('lapas-kelas-ii-a-ambarawa', 'LAPAS KELAS II A AMBARAWA', 'Jl. Benteng Dalam No.1, Bugisari, Lodoyong, Kec. Ambarawa, Kabupaten Semarang, Jawa Tengah 50612', '(0298) 591017', 'Kota Semarang', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-ambarawa'),
  ('lapas-kelas-ii-a-besi-nusakambangan', 'LAPAS KELAS II A BESI NUSAKAMBANGAN', 'Jl. Lapas Nusakambangan, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '(0282) 5255264', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-besi-nusakambangan'),
  ('lapas-khusus-kelas-ii-a-karanganyar-nusakambangan', 'LAPAS KHUSUS KELAS II A KARANGANYAR NUSAKAMBANGAN', 'Unnamed Road, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '089517900220', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-khusus-kelas-ii-a-karanganyar-nusakambangan'),
  ('lapas-kelas-ii-a-kembang-kuning-nusakambangan', 'LAPAS KELAS II A KEMBANG KUNING NUSAKAMBANGAN', 'Unnamed Road, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '(0282) 5255355', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-kembang-kuning-nusakambangan'),
  ('lapas-kelas-ii-a-gladakan-nusakambangan', 'LAPAS KELAS II A GLADAKAN NUSAKAMBANGAN', 'Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '(028) 25102021', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-gladakan-nusakambangan'),
  ('lapas-kelas-ii-a-kumbang-nusakambangan', 'LAPAS KELAS II A KUMBANG NUSAKAMBANGAN', 'Tambakreja, Kec. Cilacap Selatan, Kabupaten Cilacap, Jawa Tengah', '', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-kumbang-nusakambangan'),
  ('lapas-kelas-ii-a-ngaseman-nusakambangan', 'LAPAS KELAS II A NGASEMAN NUSAKAMBANGAN', 'Nusakambangan, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '0895-6284-09080', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-ngaseman-nusakambangan'),
  ('lapas-kelas-ii-a-kendal', 'LAPAS KELAS II A KENDAL', 'Karanggeneng, Pegulon, Kec. Kendal, Kabupaten Kendal, Jawa Tengah 51313', '(0294) 6100004', 'Kab. Kendal', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-kendal'),
  ('lapas-kelas-ii-a-magelang', 'LAPAS KELAS II A MAGELANG', 'Jl. Sutopo No.2, Cacaban, Kec. Magelang Tengah, Kota Magelang, Jawa Tengah 56121', '(0293) 362080', 'Kota Magelang', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-magelang'),
  ('lapas-narkotika-kelas-ii-a-nusakambangan', 'LAPAS NARKOTIKA KELAS II A NUSAKAMBANGAN', 'Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '(0282) 5255259', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-narkotika-kelas-ii-a-nusakambangan'),
  ('lapas-narkotika-kelas-ii-b-purwokerto', 'LAPAS NARKOTIKA KELAS II B PURWOKERTO', 'Jl. Jend. Sudirman No.104, Pereng, Sokanegara, Kec. Purwokerto Tim., Kabupaten Banyumas, Jawa Tengah 53141', '0895-4161-14108', 'Kab. Banyumas', 'https://pemasyarakatanjateng.id/satker/lapas-narkotika-kelas-ii-b-purwokerto'),
  ('lapas-kelas-ii-a-pasir-putih-nusakambangan', 'LAPAS KELAS II A PASIR PUTIH NUSAKAMBANGAN', 'Tambakreja, Kec. Cilacap Selatan, Kabupaten Cilacap, Jawa Tengah', '0882-3923-2505', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-pasir-putih-nusakambangan'),
  ('lapas-kelas-ii-a-pekalongan', 'LAPAS KELAS II A PEKALONGAN', 'Jl. Wr. Supratman No.106, Panjang Wetan, Kec. Pekalongan Utara, Kota Pekalongan, Jawa Tengah 51141', '(0285) 422291', 'Kota Pekalongan', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-pekalongan'),
  ('lapas-perempuan-kelas-ii-a-semarang', 'LAPAS PEREMPUAN KELAS II A SEMARANG', 'Jl. Mgr Sugiyopranoto No.59, Pendrikan Kidul, Kec. Semarang Tengah, Kota Semarang, Jawa Tengah 50131', '(024) 3543060', 'Kota Semarang', 'https://pemasyarakatanjateng.id/satker/lapas-perempuan-kelas-ii-a-semarang'),
  ('lapas-kelas-ii-a-permisan-nusakambangan', 'LAPAS KELAS II A PERMISAN NUSAKAMBANGAN', 'Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '(0282) 5255353', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-permisan-nusakambangan'),
  ('lapas-kelas-ii-a-purwokerto', 'LAPAS KELAS II A PURWOKERTO', 'Pamijen Lor, Pamijen, Kec. Sokaraja, Kabupaten Banyumas, Jawa Tengah 53181', '(0281) 6512955', 'Kab. Banyumas', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-purwokerto'),
  ('lapas-kelas-ii-a-sragen', 'LAPAS KELAS II A SRAGEN', 'Jl. Sukowati, Dusun Kebayanan Widodo 2, Sragen Wetan, Kec. Sragen, Kabupaten Sragen, Jawa Tengah 57214', '0271 891230', 'Kab. Sragen', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-a-sragen'),
  ('lapas-kelas-ii-b-nirbaya-nusakambangan', 'LAPAS KELAS II B NIRBAYA NUSAKAMBANGAN', 'Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '0856-4975-4129', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-nirbaya-nusakambangan'),
  ('lapas-kelas-ii-b-batang', 'LAPAS KELAS II B BATANG', 'Jalan Raya Batang KM 4.1, Rowobelang, Tembelang, Rowobelang, Kec. Batang, Kabupaten Batang, Jawa Tengah 51216', '(0285) 4494300', 'Kab. Batang', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-batang'),
  ('lapas-kelas-ii-b-brebes', 'LAPAS KELAS II B BREBES', 'Jl. Slamet No.1, Kleben, Brebes, Kec. Brebes, Kabupaten Brebes, Jawa Tengah 52212', '0283 617090', 'Kab. Brebes', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-brebes'),
  ('lapas-kelas-ii-b-cilacap', 'LAPAS KELAS II B CILACAP', 'Jl. Mataram 1, Cilacap, Sidanegara, Kec. Cilacap Tengah, Kabupaten Cilacap, Jawa Tengah 53212', '(0282) 534037', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-cilacap'),
  ('lapas-kelas-ii-b-klaten', 'LAPAS KELAS II B KLATEN', 'Jl. Pemuda No.206, Pondok, Klaten, Kec. Klaten Tengah, Kabupaten Klaten, Jawa Tengah 57411', '(0272) 322019', 'Kab. Klaten', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-klaten'),
  ('lapas-kelas-ii-b-pati', 'LAPAS KELAS II B PATI', 'Jl. Akpb Agil Kusumadya No.19, Ngarus, Kec. Pati, Kabupaten Pati, Jawa Tengah 59112', '(0295) 381207', 'Kab. Pati', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-pati'),
  ('lapas-kelas-ii-b-purwodadi', 'LAPAS KELAS II B PURWODADI', 'Jl. R.Suprapto No.54, Jetis Timur, Purwodadi, Kec. Purwodadi, Kabupaten Grobogan, Jawa Tengah 58111', '(0292) 421188', 'Kab. Grobogan', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-purwodadi'),
  ('lapas-kelas-ii-b-slawi', 'LAPAS KELAS II B SLAWI', 'Tegalandong, Kabupaten Tegal, Jawa Tengah', '(0283) 6190679', 'Kota Tegal', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-slawi'),
  ('lapas-kelas-ii-b-tegal', 'LAPAS KELAS II B TEGAL', 'Jl. Yos Sudarso No.2, Tegalsari, Kec. Tegal Bar., Kota Tegal, Jawa Tengah 52111', '(0283) 351040', 'Kota Tegal', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-tegal'),
  ('lapas-kelas-ii-b-wonogiri', 'LAPAS KELAS II B WONOGIRI', 'Donoharjo, Wuryorejo, Kec. Wonogiri, Kabupaten Wonogiri, Jawa Tengah 57614', '(0273) 321010', 'Kab. Wonogiri', 'https://pemasyarakatanjateng.id/satker/lapas-kelas-ii-b-wonogiri'),
  ('lapas-pemuda-kelas-ii-b-plantungan', 'LAPAS PEMUDA KELAS II B PLANTUNGAN', 'Wonokambang, Tirtomulyo, Kec. Plantungan, Kabupaten Kendal, Jawa Tengah 51362', '0896-9190-1680', 'Jawa Tengah', 'https://pemasyarakatanjateng.id/satker/lapas-pemuda-kelas-ii-b-plantungan'),
  ('lapas-terbuka-kelas-ii-b-kendal', 'LAPAS TERBUKA KELAS II B KENDAL', 'Sopoyono, Wonosari, Kec. Patebon, Kabupaten Kendal, Jawa Tengah 51351', '(0294) 579229', 'Kab. Kendal', 'https://pemasyarakatanjateng.id/satker/lapas-terbuka-kelas-ii-b-kendal'),
  ('lapas-terbuka-kelas-ii-b-nusakambangan', 'LAPAS TERBUKA KELAS II B NUSAKAMBANGAN', 'Unnamed Road, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '0856-4975-4129', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/lapas-terbuka-kelas-ii-b-nusakambangan'),
  ('lpka-kelas-i-kutoarjo', 'LPKA KELAS I KUTOARJO', 'Jl. Pangeran Diponegoro No.36 A, Kutoarjo, Kec. Kutoarjo, Kabupaten Purworejo, Jawa Tengah 54214', '(0275) 641011', 'Jawa Tengah', 'https://pemasyarakatanjateng.id/satker/lpka-kelas-i-kutoarjo'),
  ('rutan-kelas-i-semarang', 'RUTAN KELAS I SEMARANG', 'Jalan Dokter Cipto No.62, Kebonagung, Kec. Semarang Tim., Kota Semarang, Jawa Tengah 50123', '0821-4568-096', 'Kota Semarang', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-i-semarang'),
  ('rutan-kelas-i-surakarta', 'RUTAN KELAS I SURAKARTA', 'Jl. Brigjen Slamet Riyadi No.18, Kp. Baru, Kec. Ps. Kliwon, Kota Surakarta, Jawa Tengah 57111', '0271 642220', 'Kota Surakarta', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-i-surakarta'),
  ('rutan-kelas-ii-a-pekalongan', 'RUTAN KELAS II A PEKALONGAN', 'Panjang Wetan, Pekalongan, Kota Pekalongan, Jawa Tengah 51141', '0822-2339-9433', 'Kota Pekalongan', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-a-pekalongan'),
  ('rutan-kelas-ii-b-banjarnegara', 'RUTAN KELAS II B BANJARNEGARA', 'Jl. Pemuda No.81, Kutabanjarnegara, Kec. Banjarnegara, Kab. Banjarnegara, Jawa Tengah 53418', '(0286) 591014', 'Jawa Tengah', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-banjarnegara'),
  ('rutan-kelas-ii-b-banyumas', 'RUTAN KELAS II B BANYUMAS', 'Banyumas, Sudagaran, Kec. Banyumas, Kabupaten Banyumas, Jawa Tengah 53192', '0281 796014', 'Kab. Banyumas', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-banyumas'),
  ('rutan-kelas-ii-b-blora', 'RUTAN KELAS II B BLORA', 'Jl. Abu Umar No.9, Kauman, Kunden, Kec. Blora, Kabupaten Blora, Jawa Tengah 58212', '(0296) 531022', 'Kab. Blora', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-blora'),
  ('rutan-kelas-ii-b-boyolali', 'RUTAN KELAS II B BOYOLALI', 'MASAHAN, Mojosongo, Kec. Mojosongo, Kabupaten Boyolali, Jawa Tengah 57322', '0823-2572-3552', 'Kab. Boyolali', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-boyolali'),
  ('rutan-kelas-ii-b-demak', 'RUTAN KELAS II B DEMAK', 'Jl. Sultan Fatah, Kauman, Bintoro, Kec. Demak, Kabupaten Demak, Jawa Tengah 59511', '(0291) 685128', 'Kab. Demak', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-demak'),
  ('rutan-kelas-ii-b-jepara', 'RUTAN KELAS II B JEPARA', 'Pengkol IV, Pengkol, Kec. Jepara, Kabupaten Jepara, Jawa Tengah 59415', '0291591008', 'Kab. Jepara', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-jepara'),
  ('rutan-kelas-ii-b-kebumen', 'RUTAN KELAS II B KEBUMEN', 'Jl. Pahlawan No.163, Keposan, Kebumen, Kec. Kebumen, Kabupaten Kebumen, Jawa Tengah 54311', '(0287) 381622', 'Kab. Kebumen', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-kebumen'),
  ('rutan-kelas-ii-b-kudus', 'RUTAN KELAS II B KUDUS', 'Jl. Sunan Kudus No.70, Kudus, Demaan, Kec. Kota Kudus, Kabupaten Kudus, Jawa Tengah 59313', '(0291) 437581', 'Kab. Kudus', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-kudus'),
  ('rutan-kelas-ii-b-pemalang', 'RUTAN KELAS II B PEMALANG', 'Jl. Muchtar No.3, Kebondalem, Kec. Pemalang, Kabupaten Pemalang, Jawa Tengah 52312', '(0284) 321036', 'Kab. Pemalang', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-pemalang'),
  ('rutan-kelas-ii-b-purbalingga', 'RUTAN KELAS II B PURBALINGGA', 'Jl. Letjen Suprapto No.6, Purbalingga, Purbalingga Lor, Kec. Purbalingga, Kabupaten Purbalingga, Jawa Tengah 53311', '(0281) 891026', 'Kab. Purbalingga', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-purbalingga'),
  ('rutan-kelas-ii-b-purworejo', 'RUTAN KELAS II B PURWOREJO', 'Jl. Mayjen Sutoyo No.61, Rw. IV, Sindurjan, Kec. Purworejo, Kabupaten Purworejo, Jawa Tengah 54113', '(0275) 2973466', 'Kab. Purworejo', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-purworejo'),
  ('rutan-kelas-ii-b-rembang', 'RUTAN KELAS II B REMBANG', 'Pandean, Kec. Rembang, Kabupaten Rembang, Jawa Tengah 59211', '(0295) 691023', 'Kab. Rembang', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-rembang'),
  ('rutan-kelas-ii-b-salatiga', 'RUTAN KELAS II B SALATIGA', 'Jl. Yos Sudarso No.4, Salatiga, Kec. Sidorejo, Kota Salatiga, Jawa Tengah 50711', '(0298) 328296', 'Kota Salatiga', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-salatiga'),
  ('rutan-kelas-ii-b-temanggung', 'RUTAN KELAS II B TEMANGGUNG', 'Jl. Brigjen. Katamso No.1, Suronatan, Temanggung II, Kec. Temanggung, Kabupaten Temanggung, Jawa Tengah 56213', '(0293) 491128', 'Kab. Temanggung', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-temanggung'),
  ('rutan-kelas-ii-b-wonosobo', 'RUTAN KELAS II B WONOSOBO', 'Jl. Pramuka No.1, Sumberan Barat, Wonosobo Bar., Kec. Wonosobo, Kabupaten Wonosobo, Jawa Tengah 56311', '(0286) 321030', 'Kab. Wonosobo', 'https://pemasyarakatanjateng.id/satker/rutan-kelas-ii-b-wonosobo'),
  ('bapas-kelas-i-semarang', 'BAPAS KELAS I SEMARANG', 'Jl. Siliwangi No.508, Kembangarum, Kec. Semarang Barat, Kota Semarang, Jawa Tengah 50148', '0888-4750-888', 'Kota Semarang', 'https://pemasyarakatanjateng.id/satker/bapas-kelas-i-semarang'),
  ('bapas-kelas-ii-klaten', 'BAPAS KELAS II KLATEN', 'Jl. Andalas, Tegalputihan, Semangkak, Kec. Klaten Tengah, Kabupaten Klaten, Jawa Tengah 57413', '0812-2852-8669', 'Kota Tegal', 'https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-klaten'),
  ('bapas-kelas-i-surakarta', 'BAPAS KELAS I SURAKARTA', 'Jl. R. M. Said No.259, Manahan, Kec. Banjarsari, Kota Surakarta, Jawa Tengah 57139', '0858-6799-8553', 'Kota Surakarta', 'https://pemasyarakatanjateng.id/satker/bapas-kelas-i-surakarta'),
  ('bapas-kelas-ii-nusakambangan', 'BAPAS KELAS II NUSAKAMBANGAN', 'Nusakambangan, Tambakreja, Kec. Cilacap Sel., Kabupaten Cilacap, Jawa Tengah 53263', '0895-3293-95245', 'Kab. Cilacap', 'https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-nusakambangan'),
  ('bapas-kelas-ii-pati', 'BAPAS KELAS II PATI', 'Jl. P. Sudirman, Gebyaran, Sukoharjo, Kec. Margorejo, Kabupaten Pati, Jawa Tengah 59163', '0295-381800', 'Kab. Pati', 'https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-pati'),
  ('bapas-kelas-ii-magelang', 'BAPAS KELAS II MAGELANG', 'Jl. Jend. Gatot Soebroto No.18, Pakelsari, Banyurojo, Kec. Mertoyudan, Kabupaten Magelang, Jawa Tengah 56172', '(0293) 362207', 'Kota Magelang', 'https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-magelang'),
  ('bapas-kelas-ii-pekalongan', 'BAPAS KELAS II PEKALONGAN', 'Jl. Darma bakti No.133, Kebulen, Medono, Kec. Pekalongan Bar., Kota Pekalongan, Jawa Tengah 51112', '(0285) 421949', 'Kota Pekalongan', 'https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-pekalongan'),
  ('bapas-kelas-ii-purwokerto', 'BAPAS KELAS II PURWOKERTO', 'Jl. Pasukan Pelajar Imam No.7, Pamijen Lor, Pamijen, Sokaraja, Kabupaten Banyumas, Jawa Tengah 53181', '(0281) 636608', 'Kab. Banyumas', 'https://pemasyarakatanjateng.id/satker/bapas-kelas-ii-purwokerto')
) AS v(slug, name, address, phone, city, evidence)
ON o.slug = v.slug
WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND NOT EXISTS (SELECT 1 FROM public.publishers p WHERE p.organization_id = o.id AND p.name = v.name);
INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
SELECT o.id, gen_random_uuid(), 'system', 'seed:upt-jateng-59org', 'worker', 'customer.seed', 'organization', o.id::text, 'succeeded',
  ARRAY['name','slug','status','subscription','publisher'],
  jsonb_build_object('name', o.name, 'slug', o.slug, 'status', 'active', 'subscription', 'pro/active', 'publisher', 'correctional_institution/verified'),
  'seed:upt-jateng-59org', now()
FROM public.organizations o
WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND NOT EXISTS (SELECT 1 FROM public.audit_logs a WHERE a.organization_id = o.id AND a.action = 'customer.seed' AND a.request_id = 'seed:upt-jateng-59org');
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (94, 'seed_upt_jateng_59org', 'sha256:53272ba01c0567c03fd42c0aab4dee64a7d2a78a97e3f3f888e9aca9ebcdcd17');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('36006ad8ca4eabce4a3b90831f5bb1d7db8ab32b478070ae2539f46847358580', 1788792000000);

-- ----------------------------------------------------------------------
-- 20260907180000_fix_upt_city_ambarawa_klaten
-- ----------------------------------------------------------------------
-- Koreksi kota dua UPT yang janggal di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- Ambarawa berada di Kabupaten Semarang (bukan Kota Semarang);
-- Bapas Klaten beralamat di Kabupaten Klaten (bukan Kota Tegal).
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Semarang"'), updated_at = now()
WHERE slug = 'lapas-kelas-ii-a-ambarawa'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Kota Semarang';
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Semarang"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'lapas-kelas-ii-a-ambarawa'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Kota Semarang';
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Klaten"'), updated_at = now()
WHERE slug = 'bapas-kelas-ii-klaten'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Kota Tegal';
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Klaten"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'bapas-kelas-ii-klaten'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Kota Tegal';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (95, 'fix_upt_city_ambarawa_klaten', 'sha256:8c3f2f088d2a32b50be99cfddb9765be28dfd650db1fbc417e00cf3f55f89b62');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ace527a8a731e1b55e643694bb09d1ab27bda4f78f5c2aefb3e63a538546c961', 1788793000000);

-- ----------------------------------------------------------------------
-- 20260907190000_publisher_humas_attribution
-- ----------------------------------------------------------------------
-- Atribusi display gaya pers: prefix "Humas " + nama Title Case
-- ("Humas Lapas Kelas I Semarang"). Kolom `name` tetap nama resmi kapital.
-- Akronim dijaga (LPKA tetap kapital). Idempoten: hanya baris yang berbeda.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.publishers p
SET attribution_label = v.attribution, updated_at = now()
FROM public.organizations o
JOIN (VALUES
  ('lapas-kelas-i-batu-nusakambangan', 'Humas Lapas Kelas I Batu Nusakambangan'),
  ('lapas-kelas-i-semarang', 'Humas Lapas Kelas I Semarang'),
  ('lapas-kelas-ii-a-ambarawa', 'Humas Lapas Kelas II A Ambarawa'),
  ('lapas-kelas-ii-a-besi-nusakambangan', 'Humas Lapas Kelas II A Besi Nusakambangan'),
  ('lapas-khusus-kelas-ii-a-karanganyar-nusakambangan', 'Humas Lapas Khusus Kelas II A Karanganyar Nusakambangan'),
  ('lapas-kelas-ii-a-kembang-kuning-nusakambangan', 'Humas Lapas Kelas II A Kembang Kuning Nusakambangan'),
  ('lapas-kelas-ii-a-gladakan-nusakambangan', 'Humas Lapas Kelas II A Gladakan Nusakambangan'),
  ('lapas-kelas-ii-a-kumbang-nusakambangan', 'Humas Lapas Kelas II A Kumbang Nusakambangan'),
  ('lapas-kelas-ii-a-ngaseman-nusakambangan', 'Humas Lapas Kelas II A Ngaseman Nusakambangan'),
  ('lapas-kelas-ii-a-kendal', 'Humas Lapas Kelas II A Kendal'),
  ('lapas-kelas-ii-a-magelang', 'Humas Lapas Kelas II A Magelang'),
  ('lapas-narkotika-kelas-ii-a-nusakambangan', 'Humas Lapas Narkotika Kelas II A Nusakambangan'),
  ('lapas-narkotika-kelas-ii-b-purwokerto', 'Humas Lapas Narkotika Kelas II B Purwokerto'),
  ('lapas-kelas-ii-a-pasir-putih-nusakambangan', 'Humas Lapas Kelas II A Pasir Putih Nusakambangan'),
  ('lapas-kelas-ii-a-pekalongan', 'Humas Lapas Kelas II A Pekalongan'),
  ('lapas-perempuan-kelas-ii-a-semarang', 'Humas Lapas Perempuan Kelas II A Semarang'),
  ('lapas-kelas-ii-a-permisan-nusakambangan', 'Humas Lapas Kelas II A Permisan Nusakambangan'),
  ('lapas-kelas-ii-a-purwokerto', 'Humas Lapas Kelas II A Purwokerto'),
  ('lapas-kelas-ii-a-sragen', 'Humas Lapas Kelas II A Sragen'),
  ('lapas-kelas-ii-b-nirbaya-nusakambangan', 'Humas Lapas Kelas II B Nirbaya Nusakambangan'),
  ('lapas-kelas-ii-b-batang', 'Humas Lapas Kelas II B Batang'),
  ('lapas-kelas-ii-b-brebes', 'Humas Lapas Kelas II B Brebes'),
  ('lapas-kelas-ii-b-cilacap', 'Humas Lapas Kelas II B Cilacap'),
  ('lapas-kelas-ii-b-klaten', 'Humas Lapas Kelas II B Klaten'),
  ('lapas-kelas-ii-b-pati', 'Humas Lapas Kelas II B Pati'),
  ('lapas-kelas-ii-b-purwodadi', 'Humas Lapas Kelas II B Purwodadi'),
  ('lapas-kelas-ii-b-slawi', 'Humas Lapas Kelas II B Slawi'),
  ('lapas-kelas-ii-b-tegal', 'Humas Lapas Kelas II B Tegal'),
  ('lapas-kelas-ii-b-wonogiri', 'Humas Lapas Kelas II B Wonogiri'),
  ('lapas-pemuda-kelas-ii-b-plantungan', 'Humas Lapas Pemuda Kelas II B Plantungan'),
  ('lapas-terbuka-kelas-ii-b-kendal', 'Humas Lapas Terbuka Kelas II B Kendal'),
  ('lapas-terbuka-kelas-ii-b-nusakambangan', 'Humas Lapas Terbuka Kelas II B Nusakambangan'),
  ('lpka-kelas-i-kutoarjo', 'Humas LPKA Kelas I Kutoarjo'),
  ('rutan-kelas-i-semarang', 'Humas Rutan Kelas I Semarang'),
  ('rutan-kelas-i-surakarta', 'Humas Rutan Kelas I Surakarta'),
  ('rutan-kelas-ii-a-pekalongan', 'Humas Rutan Kelas II A Pekalongan'),
  ('rutan-kelas-ii-b-banjarnegara', 'Humas Rutan Kelas II B Banjarnegara'),
  ('rutan-kelas-ii-b-banyumas', 'Humas Rutan Kelas II B Banyumas'),
  ('rutan-kelas-ii-b-blora', 'Humas Rutan Kelas II B Blora'),
  ('rutan-kelas-ii-b-boyolali', 'Humas Rutan Kelas II B Boyolali'),
  ('rutan-kelas-ii-b-demak', 'Humas Rutan Kelas II B Demak'),
  ('rutan-kelas-ii-b-jepara', 'Humas Rutan Kelas II B Jepara'),
  ('rutan-kelas-ii-b-kebumen', 'Humas Rutan Kelas II B Kebumen'),
  ('rutan-kelas-ii-b-kudus', 'Humas Rutan Kelas II B Kudus'),
  ('rutan-kelas-ii-b-pemalang', 'Humas Rutan Kelas II B Pemalang'),
  ('rutan-kelas-ii-b-purbalingga', 'Humas Rutan Kelas II B Purbalingga'),
  ('rutan-kelas-ii-b-purworejo', 'Humas Rutan Kelas II B Purworejo'),
  ('rutan-kelas-ii-b-rembang', 'Humas Rutan Kelas II B Rembang'),
  ('rutan-kelas-ii-b-salatiga', 'Humas Rutan Kelas II B Salatiga'),
  ('rutan-kelas-ii-b-temanggung', 'Humas Rutan Kelas II B Temanggung'),
  ('rutan-kelas-ii-b-wonosobo', 'Humas Rutan Kelas II B Wonosobo'),
  ('bapas-kelas-i-semarang', 'Humas Bapas Kelas I Semarang'),
  ('bapas-kelas-ii-klaten', 'Humas Bapas Kelas II Klaten'),
  ('bapas-kelas-i-surakarta', 'Humas Bapas Kelas I Surakarta'),
  ('bapas-kelas-ii-nusakambangan', 'Humas Bapas Kelas II Nusakambangan'),
  ('bapas-kelas-ii-pati', 'Humas Bapas Kelas II Pati'),
  ('bapas-kelas-ii-magelang', 'Humas Bapas Kelas II Magelang'),
  ('bapas-kelas-ii-pekalongan', 'Humas Bapas Kelas II Pekalongan'),
  ('bapas-kelas-ii-purwokerto', 'Humas Bapas Kelas II Purwokerto')
) AS v(slug, attribution)
ON o.slug = v.slug
WHERE o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.attribution_label IS DISTINCT FROM v.attribution;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (96, 'publisher_humas_attribution', 'sha256:ecd976b352f3a12154fabf007232f3848dd5b6e788cba2a9be371cf32701399f');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5c957edf0165666206229605ae4fc49059cf1b0cbca85d42044d22564b9273bd', 1788794000000);

-- ----------------------------------------------------------------------
-- 20260907200000_retire_packages_manual_activation
-- ----------------------------------------------------------------------
-- Pensiun paket: aktivasi manual tanpa tier, harga, order, atau periode.
--
-- Model baru: subscription hanya status (active/suspended/cancelled) tanpa
-- plan dan tanpa rentang waktu; org aktif berjalan terus. Pembelian lewat
-- kontak owner; owner mengaktifkan via UI superadmin. Invite member bukan
-- bagian billing dan dipertahankan (tanpa cek kuota).
--
-- Tanpa migrasi ini, sweep malam hari akan men-suspend 59 org pro/active
-- tepat saat period 30 hari berakhir. Urutan penting: fungsi dulu (agar
-- tidak ada referensi ke kolom/tipe yang di-drop), lalu tabel, kolom, tipe.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
SELECT cron.unschedule('indicate-subscription-sweep');
DROP FUNCTION IF EXISTS indicate_private.subscription_sweep_expired();
DROP FUNCTION IF EXISTS indicate_private.billing_order_create(uuid, text, uuid, uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS indicate_private.billing_order_create(uuid, text, uuid, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS indicate_private.billing_order_submit_proof(uuid, text, uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS indicate_private.billing_order_decide(uuid, text, uuid, boolean, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS indicate_private.billing_order_list_mine(uuid);
DROP FUNCTION IF EXISTS indicate_private.billing_order_list_pending(uuid);
DROP FUNCTION IF EXISTS indicate_private.billing_order_list_active(uuid);
DROP FUNCTION IF EXISTS indicate_private.billing_order_refund(uuid, text, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS indicate_private.billing_lead_create(text, text, text, timestamp with time zone, text, text);
DROP FUNCTION IF EXISTS indicate_private.billing_lead_list(uuid);
DROP FUNCTION IF EXISTS indicate_private.invoice_list(uuid);
CREATE OR REPLACE FUNCTION indicate_private.invite_redeem(p_actor_id uuid, p_request_id text, p_token_hash text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_inv public.org_invitations%ROWTYPE; v_email text;
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = p_actor_id AND status = 'active';
  IF v_email IS NULL THEN RAISE EXCEPTION 'active user required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_inv FROM public.org_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF v_inv.id IS NULL OR v_inv.accepted_at IS NOT NULL OR v_inv.expires_at <= p_now THEN
    RAISE EXCEPTION 'invitation invalid' USING ERRCODE = '42501';
  END IF;
  IF lower(v_email) <> lower(v_inv.email) THEN
    RAISE EXCEPTION 'invitation invalid' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.memberships(organization_id, user_id, role_id, status, version, created_at, updated_at)
  VALUES (v_inv.org_id, p_actor_id, v_inv.role_id, 'active', 1, p_now, p_now)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', version = public.memberships.version + 1, updated_at = EXCLUDED.updated_at;
  UPDATE public.org_invitations SET accepted_at = p_now, updated_at = p_now WHERE id = v_inv.id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_inv.org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invite.redeem', 'membership', p_actor_id::text, 'succeeded', ARRAY['roleId','status'], jsonb_build_object('roleId', v_inv.role_id), p_request_id, p_now);
  RETURN v_inv.org_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.subscription_access_state(p_organization_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT CASE
    WHEN indicate_private.is_platform_organization(p_organization_id) THEN 'platform'
    WHEN s.organization_id IS NULL THEN 'none'
    WHEN s.status = 'cancelled' THEN 'cancelled'
    WHEN s.status = 'suspended' THEN 'suspended'
    ELSE 'active'
  END
  FROM (SELECT p_organization_id AS organization_id) AS input
  LEFT JOIN public.subscriptions AS s ON s.organization_id = input.organization_id
$function$;
DROP FUNCTION IF EXISTS indicate_private.subscription_update(uuid, text, uuid, integer, text, subscription_status, timestamp with time zone, timestamp with time zone, timestamp with time zone);
CREATE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_status subscription_status, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, status, version, created_at, updated_at)
    VALUES (p_organization_id, p_status, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET status = p_status, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', p_status), p_request_id, p_now);
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz) TO indicate_runtime;
DROP FUNCTION IF EXISTS indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, jsonb, timestamp with time zone);
CREATE FUNCTION indicate_private.customer_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_name text, p_slug text, p_metadata jsonb, p_status subscription_status, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organizations(id, name, slug, status, customer_metadata, version, created_at, updated_at)
  VALUES (p_organization_id, p_name, p_slug, 'active', p_metadata, 1, p_now, p_now);
  PERFORM indicate_private.org_ensure_permissions(p_organization_id);
  INSERT INTO public.subscriptions(organization_id, status, version, created_at, updated_at)
  VALUES (p_organization_id, p_status, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'customer.create', 'organization', p_organization_id::text, 'succeeded', ARRAY['name','slug','status'], jsonb_build_object('name', p_name, 'slug', p_slug, 'status', 'active'), p_request_id, p_now);
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, subscription_status, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_create(uuid, text, uuid, text, text, jsonb, subscription_status, timestamptz) TO indicate_runtime;
DROP FUNCTION IF EXISTS indicate_private.customer_list(uuid);
CREATE FUNCTION indicate_private.customer_list(p_actor_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, status record_status, customer_metadata jsonb, version integer, created_at timestamp with time zone, updated_at timestamp with time zone, subscription_status subscription_status, subscription_version integer, subscription_created_at timestamp with time zone, subscription_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.name, o.slug, o.status, o.customer_metadata, o.version, o.created_at, o.updated_at,
    s.status, s.version, s.created_at, s.updated_at
  FROM public.organizations o LEFT JOIN public.subscriptions s ON s.organization_id = o.id
  ORDER BY o.name, o.id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.customer_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.customer_list(uuid) TO indicate_runtime;
DROP TABLE IF EXISTS public.invoices;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.enterprise_leads;
DROP TABLE IF EXISTS public.packages;
DROP TABLE IF EXISTS public.plan_quotas;
DROP TABLE IF EXISTS public.service_tiers;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS plan;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS period_starts_at;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS period_ends_at;
DROP TYPE IF EXISTS public.subscription_plan;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (97, 'retire_packages_manual_activation', 'sha256:d18af1ba11932a7a0661dbb7d3c55c4d0482cae2751bb7c61bfdccbf07aaa1b8');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4bdbf07d8ce3aad8d53e480db92a1eafe43ed6d0c02d60b200a4987945b35cfa', 1788795000000);

-- ----------------------------------------------------------------------
-- 20260907210000_faq_manual_activation_copy
-- ----------------------------------------------------------------------
-- Selaraskan 7 FAQ pembeli era paket dengan model aktivasi manual
-- (salin kata-per-kata dari FAQ_ITEMS baru agar fallback DB dan kode sama).
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.faqs SET question = 'Bagaimana cara mulai berlangganan?', answer = 'Hubungi kami lewat WhatsApp atau surel, ceritakan kebutuhan Anda, sepakati biayanya, lalu lakukan pembayaran manual. Setelah terkonfirmasi, organisasi Anda kami aktifkan paling lambat 1x24 jam dan berjalan terus.', updated_at = now() WHERE id = '63f24875-3436-4a7f-b730-4441c0106a1c' AND question = 'Bagaimana cara mulai berlangganan?';
UPDATE public.faqs SET question = 'Apakah langganan bisa kedaluwarsa?', answer = 'Tidak ada masa aktif yang kedaluwarsa dan tidak ada masa tenggang: selama status organisasi Anda aktif, seluruh fungsi berjalan penuh. Penonaktifan hanya terjadi atas permintaan Anda atau pelanggaran ketentuan.', updated_at = now() WHERE id = '2a0f30ac-20aa-4971-9502-944c35c1c705' AND question = 'Apa yang terjadi kalau masa aktif habis?';
UPDATE public.faqs SET question = 'Apakah ada tingkatan paket?', answer = 'Tidak ada. Semua pelanggan mendapat fungsi yang sama; yang membedakan hanya kebutuhan Anda yang kami diskusikan di awal. Satu-satunya hal yang disesuaikan adalah biaya kesepakatan.', updated_at = now() WHERE id = '64c110a9-da4b-4e9f-9be8-1190096ad96a' AND question = 'Bisakah naik atau turun paket di tengah jalan?';
UPDATE public.faqs SET question = 'Berapa biayanya?', answer = 'Hubungi kami lewat WhatsApp, ceritakan kebutuhan dan jumlah websitenya. Kami memberi angka pasti di depan sebelum Anda membayar apa pun.', updated_at = now() WHERE id = '761e83a9-b50d-4766-81c9-efd5652642cd' AND question = 'Bagaimana paket Enterprise bekerja?';
UPDATE public.faqs SET answer = 'Bisa. Ceritakan sistem lama Anda saat menghubungi kami; bantuan pindahan kami sesuaikan dengan kebutuhan.', updated_at = now() WHERE id = '1de04400-5846-4d71-a6e4-b66668c3fc76' AND question = 'Saya sudah punya website berjalan. Bisa pindah?';
UPDATE public.faqs SET answer = 'Tidak ada trial otomatis. Sebagai gantinya Anda bisa melihat cara kerja dasbor lewat sesi peninjauan bersama sebelum memutuskan.', updated_at = now() WHERE id = 'acd28953-8f62-42a8-9e11-9916dd86b793' AND question = 'Apakah ada masa percobaan gratis?';
UPDATE public.faqs SET answer = 'Semua pelanggan didampingi manusia lewat kanal yang jelas — bukan bot. Prioritas penanganan mengikuti dampak: situs tidak bisa diakses ditangani lebih dulu.', updated_at = now() WHERE id = 'd849d3fe-c818-469d-bc54-10aa1b8dd235' AND question = 'Bagaimana kalau butuh bantuan?';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (98, 'faq_manual_activation_copy', 'sha256:31fd221ca1b477dadfd9ce99fe1e4d5e0f2db355f08ed7a923b0b6069d88347e');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('67e8c98fa070f03722c716a0978ae69f39cefec4a1722fbba8e18b5de9bd9943', 1788796000000);

-- ----------------------------------------------------------------------
-- 20260907220000_rename_invite_deny_policy
-- ----------------------------------------------------------------------
-- Samarkan nama policy terakhir era billing: org_invitations memakai
-- deny-all generik (USING/WITH CHECK false, perilaku identik), sama seperti
-- tabel function-only lain (retention/telegram/outbox). Tanpa ini satu nama
-- `billing_function_only` tersisa di katalog.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DROP POLICY IF EXISTS billing_function_only ON public.org_invitations;
CREATE POLICY org_invitations_function_only ON public.org_invitations FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (99, 'rename_invite_deny_policy', 'sha256:7e690674684da5bcdbdd5bcab84a2c25f4f15ec3449779c71850976b195a3640');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('2c748b29a1c8316ffb63fb9dc326d01cdde4287bd9e0460ba59fb23a9ff987fc', 1788797000000);

-- ----------------------------------------------------------------------
-- 20260907230000_drop_billing_order_status
-- ----------------------------------------------------------------------
-- Hapus enum billing_order_status yang yatim (tabel orders sudah pensiun di v97).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DROP TYPE IF EXISTS public.billing_order_status;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (100, 'drop_billing_order_status', 'sha256:cdfc844c44da1913995da472008fcc9ae513e8f3da05fb8a22f40a90ec6e17f1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('2979e4de0b51864744cff7bc55a9cfd93f3d8bea745ab7c776f32637e3ef18a2', 1788798000000);

-- ----------------------------------------------------------------------
-- 20260907240000_manual_invoices
-- ----------------------------------------------------------------------
-- Invoice manual era aktivasi manual: dicatat superadmin setelah pembayaran
-- terkonfirmasi (tanpa order). Nomor profesional berurutan per bulan
-- (INV/YYYY/MM/NNNN via sequence; aman konkuren). Status hanya paid/voided;
-- org membaca invoice miliknya sendiri, tulis hanya platform.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TYPE "public"."invoice_status" AS ENUM('paid', 'voided');
CREATE SEQUENCE public.invoice_number_seq;
CREATE TABLE "public"."invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE restrict,
  "number" text NOT NULL,
  "amount_idr" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'IDR',
  "status" "public"."invoice_status" NOT NULL DEFAULT 'paid',
  "paid_at" timestamptz NOT NULL,
  "billing_note" text,
  "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "voided_at" timestamptz,
  "void_reason" text,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "invoices_number_unique" UNIQUE ("number"),
  CONSTRAINT "invoices_amount_nonnegative" CHECK ("amount_idr" >= 0),
  CONSTRAINT "invoices_version_positive" CHECK ("version" > 0)
);
CREATE INDEX "invoices_org_paid_idx" ON "public"."invoices" USING btree ("organization_id", "paid_at" DESC);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY invoices_function_only ON public.invoices FOR ALL TO indicate_runtime USING (false) WITH CHECK (false);
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_number := 'INV/' || to_char(p_now, 'YYYY/MM/') || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at), p_request_id, p_now);
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_create(uuid, text, uuid, integer, timestamptz, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_create(uuid, text, uuid, integer, timestamptz, text, timestamptz) TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.invoice_void(p_actor_id uuid, p_request_id text, p_invoice_id uuid, p_expected_version integer, p_reason text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(p_reason) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'reason required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.invoices SET status = 'voided', voided_at = p_now, void_reason = p_reason, version = version + 1, updated_at = p_now
  WHERE id = p_invoice_id AND version = p_expected_version AND status = 'paid';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.void', 'invoice', p_invoice_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'voided'), p_request_id, p_now
  FROM public.invoices WHERE id = p_invoice_id;
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_void(uuid, text, uuid, integer, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_void(uuid, text, uuid, integer, text, timestamptz) TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.invoice_list_for_org(p_actor_id uuid, p_organization_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, number text, amount_idr integer, currency text, status invoice_status, paid_at timestamp with time zone, billing_note text, voided_at timestamp with time zone, void_reason text, version integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE memberships.organization_id = invoice_list_for_org.p_organization_id AND memberships.user_id = p_actor_id AND memberships.status = 'active') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.organization_id, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.billing_note, i.voided_at, i.void_reason, i.version, i.created_at
  FROM public.invoices i WHERE i.organization_id = p_organization_id ORDER BY i.paid_at DESC, i.created_at DESC;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (101, 'manual_invoices', 'sha256:14ed1f59fba43eaadc3770b356d99abb15508a5618210852d995ae347f3af020');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('7077d44dfd73241b6a47777d62d805d7ad55995a4e8e780ec4a7f1f1a3020edf', 1788799000000);

-- ----------------------------------------------------------------------
-- 20260907250000_invoice_number_enterprise
-- ----------------------------------------------------------------------
-- Penomoran enterprise: IND-{ORG5}-{YYMM}-{SEQ4}-{RAND4}.
-- ORG5 deterministik dari slug (telusur balik tanpa tabel), SEQ urutan audit
-- global, RAND4 anti-enumerasi (alfabet tanpa 0/O/1/I/L). Contoh:
-- IND-0AD4A-2609-0047-Q2M9.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_now, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at), p_request_id, p_now);
  RETURN v_id;
END
$function$;
DROP FUNCTION IF EXISTS indicate_private.invoice_list_for_org(uuid, uuid);
CREATE FUNCTION indicate_private.invoice_list_for_org(p_actor_id uuid, p_organization_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, organization_name text, number text, amount_idr integer, currency text, status invoice_status, paid_at timestamp with time zone, billing_note text, voided_at timestamp with time zone, void_reason text, version integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE memberships.organization_id = invoice_list_for_org.p_organization_id AND memberships.user_id = p_actor_id AND memberships.status = 'active') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.organization_id, o.name, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.billing_note, i.voided_at, i.void_reason, i.version, i.created_at
  FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.organization_id = p_organization_id ORDER BY i.paid_at DESC, i.created_at DESC;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (102, 'invoice_number_enterprise', 'sha256:df3aab8e5fed54b3920fd92a89c39331b51e0d210d584778394b4a9ba6fe5848');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('c6f332b7bd6c818cdc0bc11ce62c2c37e13293d4a4ac476ee37b2f68b9ca77bb', 1788800000000);

-- ----------------------------------------------------------------------
-- 20260907260000_invite_visibility
-- ----------------------------------------------------------------------
-- Keterlihatan undangan + outbox tingkat tenant.
--
-- org_invitations dan telegram_outbox adalah tabel function-only tanpa baca
-- runtime tingkat tenant, sehingga undangan pending dan antrean Telegram tidak
-- terlihat admin org di dasbor. Tiga pembaca allowlist mengikuti preseden
-- ops_visibility (SECURITY DEFINER + SET search_path + cek izin internal):
-- - invite_list: anggota dengan membership.manage melihat undangan org-nya.
-- - invite_revoke: platform admin ATAU membership.manage membatalkan undangan
--   pending (dihapus; audit dipertahankan).
-- - outbox_list: anggota aktif suatu org melihat antrean belum-terkirim org-nya.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.invite_list(p_actor_id uuid, p_org_id uuid)
 RETURNS TABLE(id uuid, email text, role_id uuid, role_name text, expires_at timestamp with time zone, accepted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT indicate_private.permission_has_tenant(p_actor_id, p_org_id, 'membership.manage') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.email, i.role_id, r.name, i.expires_at, i.accepted_at, i.created_at
  FROM public.org_invitations i LEFT JOIN public.roles r ON r.organization_id = i.org_id AND r.id = i.role_id
  WHERE i.org_id = p_org_id
  ORDER BY i.created_at DESC LIMIT 100;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.invite_revoke(p_actor_id uuid, p_request_id text, p_invite_id uuid, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_inv public.org_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.org_invitations WHERE id = p_invite_id FOR UPDATE;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invitation required' USING ERRCODE = '42501';
  END IF;
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT indicate_private.permission_has_tenant(p_actor_id, v_inv.org_id, 'membership.manage') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation already accepted' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.org_invitations WHERE id = v_inv.id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_inv.org_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invite.revoke', 'invitation', v_inv.id::text, 'succeeded', ARRAY['email'], jsonb_build_object('email', v_inv.email), p_request_id, p_now);
  RETURN true;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.outbox_list(p_actor_id uuid, p_organization_id uuid)
 RETURNS TABLE(id uuid, chat_id text, status text, attempts integer, next_attempt_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m JOIN public.users u ON u.id = m.user_id
    WHERE m.organization_id = p_organization_id AND m.user_id = p_actor_id
      AND m.status = 'active' AND u.status = 'active'
  ) THEN
    RAISE EXCEPTION 'membership required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT o.id, o.chat_id, o.status, o.attempts, o.next_attempt_at, o.created_at
  FROM public.telegram_outbox o WHERE o.organization_id = p_organization_id AND o.status <> 'sent'
  ORDER BY o.next_attempt_at, o.id LIMIT 100;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invite_list(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invite_list(uuid, uuid) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.invite_revoke(uuid, text, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invite_revoke(uuid, text, uuid, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.outbox_list(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.outbox_list(uuid, uuid) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (103, 'invite_visibility', 'sha256:4a28307e987a696d366c49060d6b971459c8a9bcc165550038e8589f07cdd716');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('dd823700429f94990a4ccd3e543c735602cfbb043d9c6e7d18fc38cdeb1d0a19', 1788900000000);

-- ----------------------------------------------------------------------
-- 20260907270000_fix_site_settings_guard_return
-- ----------------------------------------------------------------------
-- Perbaiki guard site_settings: BEFORE UPDATE yang me-return OLD membuat
-- SEMUA update diam-diam dibuang (Postgres memakai baris yang di-return).
-- Guard ini hanya boleh menolak (RAISE) saat invalidasi settings site aktif;
-- jalur lolos harus me-return NEW agar update benar-benar tersimpan.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.guard_site_settings_against_active_site()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, indicate_private
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sites AS s
    WHERE s.organization_id = OLD.organization_id
      AND s.id = OLD.site_id
      AND s.status = 'active'
      AND s.activation_state = 'active'
  ) AND (
    OLD.locale IS NULL OR OLD.seo_default_title IS NULL OR OLD.seo_default_description IS NULL
    OR OLD.seo_robots_directive IS NULL OR OLD.seo_open_graph_site_name IS NULL OR OLD.seo_schema_version IS NULL
    OR OLD.default_media_id IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot invalidate site settings while the site is active' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (104, 'fix_site_settings_guard_return', 'sha256:1f798db5acb1e6a468e3bacadd78a5cefa236b05fe2f8d6ce9fbc2597a2484a6');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('87b58751c14844cfaf6617ed617fe08864a86287fc12e9b0e5e89f306b8b35fe', 1788900000000);

-- ----------------------------------------------------------------------
-- 20260907280000_discover_hosts_add_versions
-- ----------------------------------------------------------------------
-- discover_release_active_hosts tidak mengembalikan routing_version /
-- content_version yang dibutuhkan DrizzleDeliveryRepository
-- (findActiveSitesByExactHostname memetakan row.routing_version dan
-- row.content_version; tanpa keduanya konteks berisi string kosong dan semua
-- query network gagal parse integer). Tambahkan dua kolom versi; kolom lama
-- dipertahankan agar kompatibel.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DROP FUNCTION IF EXISTS indicate_private.discover_release_active_hosts(text[]);
CREATE FUNCTION indicate_private.discover_release_active_hosts(p_hostnames text[])
 RETURNS TABLE(hostname text, organization_id uuid, domain_id uuid, site_id uuid, region_id uuid, region_external_key text, region_slug text, coherent boolean, routing_version integer, content_version integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH requested(hostname) AS (
    SELECT DISTINCT normalized.hostname
    FROM unnest(
      CASE
        WHEN p_hostnames IS NOT NULL AND cardinality(p_hostnames) BETWEEN 1 AND 100
          AND array_position(p_hostnames, NULL) IS NULL
        THEN p_hostnames
        ELSE ARRAY[]::text[]
      END
    ) AS supplied(hostname)
    CROSS JOIN LATERAL (
      SELECT lower(trim(trailing '.' FROM supplied.hostname)) AS hostname
    ) normalized
    WHERE normalized.hostname = supplied.hostname
      AND octet_length(normalized.hostname) BETWEEN 1 AND 253
  )
  SELECT s.normalized_hostname, s.organization_id, s.domain_id, s.id, s.region_id,
         r.external_key, r.slug, true, s.routing_version, s.content_version
  FROM requested requested_host
  JOIN public.sites s ON s.normalized_hostname = requested_host.hostname
  JOIN public.organizations o ON o.id = s.organization_id
  JOIN public.domains d ON d.organization_id = s.organization_id AND d.id = s.domain_id
  LEFT JOIN public.regions r ON r.organization_id = s.organization_id AND r.id = s.region_id
  WHERE o.status = 'active' AND d.status = 'active' AND s.status = 'active' AND s.activation_state = 'active'
    AND (
      (s.region_id IS NULL AND s.normalized_hostname = d.normalized_hostname)
      OR (s.region_id IS NOT NULL AND r.status = 'active' AND s.normalized_hostname = r.slug || '.' || d.normalized_hostname)
    )
  ORDER BY s.normalized_hostname, s.organization_id, s.id
$function$;
REVOKE ALL ON FUNCTION indicate_private.discover_release_active_hosts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.discover_release_active_hosts(text[]) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (105, 'discover_hosts_add_versions', 'sha256:27ef80fdb997568a9fd81c958db76259384c1cace6d5e7970c1e2b08ac010927');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('afe5d5ae1390c3f115910c25e981dd622cb9f7e55a013fc6a34265bf4075a0b1', 1788900000000);

-- ----------------------------------------------------------------------
-- 20260907290000_organizations_kind
-- ----------------------------------------------------------------------
-- Penanda peran organisasi: operator portal vs pelanggan.
-- Satu tabel organizations menampung dua peran (mis. Fakta01 sebagai operator,
-- 59 UPT sebagai pelanggan); tanpa penanda, keduanya tak terbedakan di query.
-- Pecah tabel ditolak: puluhan FK komposit (organization_id, id) bergantung
-- pada satu registri tenant. Kolom kind + check + index parsial sudah cukup.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'customer';
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_kind_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_kind_check CHECK (kind IN ('operator', 'customer'));
CREATE INDEX IF NOT EXISTS organizations_kind_idx ON public.organizations USING btree (kind);
UPDATE public.organizations SET kind = 'operator' WHERE slug IN ('fakta01', 'indicate-platform');
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (106, 'organizations_kind', 'sha256:d04d655981dfddc3b21e9453ea7ee9fd7c810053ac924013aee09ecedd23f602');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('1cf29d796e80440c29c0e54bb777865a9926b574f591504d87571061ef3aa3a4', 1788900000000);

-- ----------------------------------------------------------------------
-- 20260914020000_template_preset_clean_blue
-- ----------------------------------------------------------------------
INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('clean-blue', 'Clean Blue Editorial', 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.', 'news')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = now();
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (107, 'template_preset_clean_blue', 'sha256:73e40efa094ed2089c84460be27ffd955b8f0430f4ff7a3c31ed26de9d821149');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('537f1dbd9d7d4bf251888ba1e4da1103c6affb86865b13d98e576027493a5c32', 1789470865962);

-- ----------------------------------------------------------------------
-- 20260914030000_articles_cover_image_url
-- ----------------------------------------------------------------------
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cover_image_url text;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (108, 'articles_cover_image_url', 'sha256:00dcad3c254637e41f1a0482311232cdfaa857ba039be2dae8f8afa91d1fcff6');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4b4be4b5400c1473969d7c060bbf88be15dfd33d211bbc02eb9b4f38dbf923b6', 1789470866962);

-- ----------------------------------------------------------------------
-- 20260914040000_single_template_clean_blue
-- ----------------------------------------------------------------------
-- Single-template consolidation: seluruh domain memakai Clean Blue Editorial.
-- 1) Pastikan baris clean-blue ada, 2) sinkronkan site_settings.colors ke
-- {"templateId":"clean-blue"} (buang presetId/warna warisan), 3) hapus
-- template lama, 4) drop tabel color_presets beserta policy/grants-nya.

INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('clean-blue', 'Clean Blue Editorial', 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.', 'news')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = now();
UPDATE public.site_settings SET colors = ((colors - 'presetId' - 'primary' - 'accent' - 'headerBg') || '{"templateId": "clean-blue"}'::jsonb), updated_at = now();
DELETE FROM public.template_presets WHERE id <> 'clean-blue';
DROP TABLE IF EXISTS public.color_presets;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (109, 'single_template_clean_blue', 'sha256:e5b588799cf4a27f19c5cfcd7731e775eaef4fc423989e26e548c8cb75f5ced5');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('16ce003f1b2624fa78dff1463b31ac701895ec02fe4c1735011b63f5374e5c0a', 1789470867962);

-- ----------------------------------------------------------------------
-- 20260915000000_seo_metadata_hardening
-- ----------------------------------------------------------------------
-- SEO metadata hardening: validasi anti thin/duplicate + backfill diferensiasi per tenant.
--
-- 1) authors: kolom nullable bio/avatar_url/website_url (diisi dari data yang tersedia saja, tanpa mengarang).
-- 2) article_sites: CHECK panjang custom_title (10-160) dan custom_description (50-500).
-- 3) publishers.contacts.logoUrl: backfill fallback instansi bila belum disematkan.
-- 4) article_sites: backfill custom_* yang masih NULL dari data nyata tenant
--    (judul kanonik + nama situs; deskripsi kutipan body + konteks situs/kota).
--    Sudut lokal Wonosobo memakai kota dari contacts publisher bila tersedia.
-- 5) site_settings: backfill seo defaults yang masih NULL dari name/description.
-- Idempoten: semua DDL dijaga IF NOT EXISTS / DROP IF EXISTS; backfill hanya
-- menyentuh baris NULL dan menghormati batas CHECK.

ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS website_url text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authors_bio_length') THEN
    ALTER TABLE public.authors ADD CONSTRAINT authors_bio_length CHECK (bio IS NULL OR (char_length(bio) BETWEEN 1 AND 2000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authors_avatar_shape') THEN
    ALTER TABLE public.authors ADD CONSTRAINT authors_avatar_shape CHECK (avatar_url IS NULL OR (avatar_url LIKE '/%' OR avatar_url LIKE 'https://%'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_sites_custom_title_shape') THEN
    ALTER TABLE public.article_sites ADD CONSTRAINT article_sites_custom_title_shape CHECK (custom_title IS NULL OR (char_length(custom_title) BETWEEN 10 AND 160));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'article_sites_custom_description_shape') THEN
    ALTER TABLE public.article_sites ADD CONSTRAINT article_sites_custom_description_shape CHECK (custom_description IS NULL OR (char_length(custom_description) BETWEEN 50 AND 500));
  END IF;
END $$;
UPDATE public.publishers
SET contacts = contacts || '{"logoUrl": "/brand/logo-kemenimipas.png"}'::jsonb, updated_at = now()
WHERE (contacts ->> 'logoUrl') IS NULL OR btrim(contacts ->> 'logoUrl') = '';
UPDATE public.site_settings
SET seo_default_title = name, updated_at = now()
WHERE seo_default_title IS NULL;
UPDATE public.site_settings
SET seo_default_description = description, updated_at = now()
WHERE seo_default_description IS NULL;
UPDATE public.site_settings
SET seo_open_graph_site_name = name, updated_at = now()
WHERE seo_open_graph_site_name IS NULL;
UPDATE public.article_sites AS ras
SET custom_title = left(a.title || ' | ' || s.name, 160), updated_at = now()
FROM public.articles AS a
JOIN public.site_settings AS s
  ON s.organization_id = a.organization_id
WHERE ras.organization_id = a.organization_id
  AND ras.article_id = a.id
  AND s.site_id = ras.site_id
  AND ras.custom_title IS NULL
  AND char_length(a.title || ' | ' || s.name) BETWEEN 10 AND 160;
UPDATE public.article_sites AS ras
SET custom_description = left(
  regexp_replace(a.body, '\s+', ' ', 'g')
  || ' — ' || s.name
  || COALESCE(' (' || NULLIF(btrim(p.contacts ->> 'city'), '') || ')', ''),
  500
), updated_at = now()
FROM public.articles AS a
JOIN public.site_settings AS s
  ON s.organization_id = a.organization_id
LEFT JOIN public.publishers AS p
  ON p.organization_id = a.organization_id AND p.id = a.publisher_id
WHERE ras.organization_id = a.organization_id
  AND ras.article_id = a.id
  AND s.site_id = ras.site_id
  AND ras.custom_description IS NULL
  AND char_length(
    regexp_replace(a.body, '\s+', ' ', 'g')
    || ' — ' || s.name
    || COALESCE(' (' || NULLIF(btrim(p.contacts ->> 'city'), '') || ')', '')
  ) BETWEEN 50 AND 500;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (110, 'seo_metadata_hardening', 'sha256:d833c30c72734f1520eeb5acf0c3f1ba00680d7f60bf0a50270ec58df11f2c94');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('33702d7fb317a932c060423fffeaeeaf3a68155eb4c51e147e6783c3d1d6cb01', 1789470868962);

-- ----------------------------------------------------------------------
-- 20260915010000_invoices_created_by_covering_index
-- ----------------------------------------------------------------------
-- Covering index untuk FK invoices.created_by -> users.id (temuan unindexed_foreign_keys).
-- Mempercepat join ke users serta SET NULL saat user dihapus.
CREATE INDEX IF NOT EXISTS invoices_created_by_idx ON public.invoices USING btree (created_by);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (111, 'invoices_created_by_covering_index', 'sha256:49660d2c16c090179637f6d66154f6716b27d5414377e0fd40801d4a76e259b0');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('995168799f377bff817043b7757a7161741d92fea327253c57fd6aa11d05c0f1', 1789470869962);

-- ----------------------------------------------------------------------
-- 20260915020000_media_policy_allow_ico
-- ----------------------------------------------------------------------
-- Izin ICO untuk favicon: tambah image/x-icon ke media_policy (idempoten).
-- Revisi + intent invalidasi dicatat agar snapshot runtime tersegarkan.
WITH env AS (
  SELECT COALESCE(NULLIF(current_setting('app.environment', TRUE), ''), 'production')::public.runtime_config_environment AS environment
),
upd AS (
  UPDATE public.media_policy
  SET allowed_mime_types = (
    SELECT array_agg(DISTINCT v ORDER BY v)
    FROM unnest(allowed_mime_types || ARRAY['image/x-icon']) AS v
  ),
  version = version + 1, updated_at = now()
  WHERE singleton_key = 'singleton'
    AND NOT (allowed_mime_types @> ARRAY['image/x-icon'])
  RETURNING version
),
rev AS (
  INSERT INTO public.runtime_config_revisions (environment, committed_at, mutation_kind)
  SELECT (SELECT environment FROM env), now(), 'media_policy'::public.runtime_config_mutation_kind
  FROM upd
  RETURNING version
)
INSERT INTO public.runtime_config_invalidation_intents (id, runtime_revision, environment, partition_kind, status, attempts, next_attempt_at)
SELECT gen_random_uuid(), rev.version, (SELECT environment FROM env), 'policy'::public.invalidation_partition_kind, 'pending', 0, now()
FROM rev;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (112, 'media_policy_allow_ico', 'sha256:a4897962bbcd7ec7e4c66c0bcc4f06a02c8a26e53bf3f72f29055f8e091b81b7');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('38ecc2cee63b8ffb3034d85e1b67506941d9a9418fbdc06048556838bceb55ed', 1789470870962);

-- ----------------------------------------------------------------------
-- 20260916000000_region_locked_memberships
-- ----------------------------------------------------------------------
-- Kunci region per membership dan API key: user terkunci hanya menyentuh
-- regionnya (+ portal apex milik bersama); NULL berarti semua region.
-- RLS diperketat per tabel konten; taksonomi org dan audit tetap org-level
-- (batas tercatat). Backfill NULL = perilaku lama, jadi rilis ini no-op
-- sampai region diisi.
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS region_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_region_fk') THEN
    ALTER TABLE public.memberships ADD CONSTRAINT memberships_region_fk FOREIGN KEY (organization_id, region_id) REFERENCES public.regions (organization_id, id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS memberships_organization_region_idx ON public.memberships USING btree (organization_id, region_id, status);
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS region_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_region_fk') THEN
    ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_region_fk FOREIGN KEY (organization_id, region_id) REFERENCES public.regions (organization_id, id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS api_keys_organization_region_idx ON public.api_keys USING btree (organization_id, region_id);
CREATE OR REPLACE FUNCTION indicate_private.set_region_context(requested_region_id uuid)
RETURNS void
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $$
  SELECT set_config('app.region_id', COALESCE(requested_region_id::text, ''), true)
$$;
GRANT EXECUTE ON FUNCTION indicate_private.set_region_context(uuid) TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.current_region_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $$
  SELECT NULLIF(current_setting('app.region_id', true), '')::uuid
$$;
GRANT EXECUTE ON FUNCTION indicate_private.current_region_id() TO indicate_runtime;
DROP FUNCTION IF EXISTS indicate_private.resolve_api_key_lookup(text);
CREATE OR REPLACE FUNCTION indicate_private.resolve_api_key_lookup(p_lookup_id text)
 RETURNS TABLE(organization_id uuid, id uuid, lookup_id text, name text, salt text, verification_hash text, scopes text[], status api_key_status, predecessor_id uuid, expires_at timestamp with time zone, last_used_at timestamp with time zone, version integer, region_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT k.organization_id, k.id, k.lookup_id, k.name, k.salt,
         k.verification_hash, k.scopes, k.status, k.predecessor_id,
         k.expires_at, k.last_used_at, k.version, k.region_id, k.created_at, k.updated_at
  FROM public.api_keys k WHERE k.lookup_id = p_lookup_id LIMIT 1
$function$;
DROP FUNCTION IF EXISTS indicate_private.resolve_telegram_identity(text, text);
CREATE OR REPLACE FUNCTION indicate_private.resolve_telegram_identity(p_user_id text, p_chat_id text)
 RETURNS TABLE(mapping_id uuid, organization_id uuid, user_id uuid, role_id uuid, telegram_user_id text, telegram_chat_id text, region_id uuid, permissions text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  WITH eligible AS (
    SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id, membership.region_id
    FROM public.telegram_identity_mappings m
    JOIN public.memberships membership
      ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
     AND membership.role_id = m.role_id AND membership.status = 'active'
    JOIN public.roles r
      ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
    WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  ), single_mapping AS (
    SELECT * FROM eligible WHERE (SELECT count(*) FROM eligible) = 1
  )
  SELECT m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, m.region_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM single_mapping m
  LEFT JOIN public.role_permissions rp ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
  GROUP BY m.id, m.organization_id, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id, m.region_id
$function$;
DROP POLICY IF EXISTS tenant_isolation_select ON public.articles;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.articles;
DROP POLICY IF EXISTS tenant_isolation_update ON public.articles;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.articles;
CREATE POLICY tenant_isolation_select ON public.articles FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_insert ON public.articles FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_update ON public.articles FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id = (SELECT indicate_private.current_region_id()))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_delete ON public.articles FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id = (SELECT indicate_private.current_region_id())));
DROP POLICY IF EXISTS tenant_isolation_select ON public.sites;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.sites;
DROP POLICY IF EXISTS tenant_isolation_update ON public.sites;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.sites;
CREATE POLICY tenant_isolation_select ON public.sites FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id IS NULL OR region_id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_insert ON public.sites FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id IS NULL OR region_id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_update ON public.sites FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id IS NULL OR region_id = (SELECT indicate_private.current_region_id()))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id IS NULL OR region_id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_delete ON public.sites FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR region_id IS NULL OR region_id = (SELECT indicate_private.current_region_id())));
DROP POLICY IF EXISTS tenant_isolation_select ON public.regions;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.regions;
DROP POLICY IF EXISTS tenant_isolation_update ON public.regions;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.regions;
CREATE POLICY tenant_isolation_select ON public.regions FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_insert ON public.regions FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_update ON public.regions FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR id = (SELECT indicate_private.current_region_id()))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR id = (SELECT indicate_private.current_region_id())));
CREATE POLICY tenant_isolation_delete ON public.regions FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR id = (SELECT indicate_private.current_region_id())));
DROP POLICY IF EXISTS tenant_isolation_select ON public.article_sites;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.article_sites;
DROP POLICY IF EXISTS tenant_isolation_update ON public.article_sites;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.article_sites;
CREATE POLICY tenant_isolation_select ON public.article_sites FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = article_sites.organization_id AND a.id = article_sites.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = article_sites.organization_id AND s.id = article_sites.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_insert ON public.article_sites FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = article_sites.organization_id AND a.id = article_sites.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = article_sites.organization_id AND s.id = article_sites.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_update ON public.article_sites FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = article_sites.organization_id AND a.id = article_sites.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = article_sites.organization_id AND s.id = article_sites.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id()))))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = article_sites.organization_id AND a.id = article_sites.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = article_sites.organization_id AND s.id = article_sites.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_delete ON public.article_sites FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = article_sites.organization_id AND a.id = article_sites.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = article_sites.organization_id AND s.id = article_sites.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.media;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.media;
DROP POLICY IF EXISTS tenant_isolation_update ON public.media;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.media;
CREATE POLICY tenant_isolation_select ON public.media FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media.organization_id AND a.id = media.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media.organization_id AND s.id = media.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_insert ON public.media FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media.organization_id AND a.id = media.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media.organization_id AND s.id = media.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_update ON public.media FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media.organization_id AND a.id = media.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media.organization_id AND s.id = media.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id()))))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media.organization_id AND a.id = media.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media.organization_id AND s.id = media.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_delete ON public.media FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media.organization_id AND a.id = media.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media.organization_id AND s.id = media.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.media_key_reservations;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.media_key_reservations;
DROP POLICY IF EXISTS tenant_isolation_update ON public.media_key_reservations;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.media_key_reservations;
CREATE POLICY tenant_isolation_select ON public.media_key_reservations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media_key_reservations.organization_id AND a.id = media_key_reservations.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media_key_reservations.organization_id AND s.id = media_key_reservations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_insert ON public.media_key_reservations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media_key_reservations.organization_id AND a.id = media_key_reservations.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media_key_reservations.organization_id AND s.id = media_key_reservations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_update ON public.media_key_reservations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media_key_reservations.organization_id AND a.id = media_key_reservations.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media_key_reservations.organization_id AND s.id = media_key_reservations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id()))))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media_key_reservations.organization_id AND a.id = media_key_reservations.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media_key_reservations.organization_id AND s.id = media_key_reservations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_delete ON public.media_key_reservations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR organization_asset OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = media_key_reservations.organization_id AND a.id = media_key_reservations.article_id AND a.region_id = (SELECT indicate_private.current_region_id())) OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = media_key_reservations.organization_id AND s.id = media_key_reservations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.publishing_jobs;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.publishing_jobs;
DROP POLICY IF EXISTS tenant_isolation_update ON public.publishing_jobs;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.publishing_jobs;
CREATE POLICY tenant_isolation_select ON public.publishing_jobs FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = publishing_jobs.organization_id AND a.id = publishing_jobs.article_id AND a.region_id = (SELECT indicate_private.current_region_id()))));
CREATE POLICY tenant_isolation_insert ON public.publishing_jobs FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = publishing_jobs.organization_id AND a.id = publishing_jobs.article_id AND a.region_id = (SELECT indicate_private.current_region_id()))));
CREATE POLICY tenant_isolation_update ON public.publishing_jobs FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = publishing_jobs.organization_id AND a.id = publishing_jobs.article_id AND a.region_id = (SELECT indicate_private.current_region_id())))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = publishing_jobs.organization_id AND a.id = publishing_jobs.article_id AND a.region_id = (SELECT indicate_private.current_region_id()))));
CREATE POLICY tenant_isolation_delete ON public.publishing_jobs FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.articles a WHERE a.organization_id = publishing_jobs.organization_id AND a.id = publishing_jobs.article_id AND a.region_id = (SELECT indicate_private.current_region_id()))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.publishing_job_targets;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.publishing_job_targets;
DROP POLICY IF EXISTS tenant_isolation_update ON public.publishing_job_targets;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.publishing_job_targets;
CREATE POLICY tenant_isolation_select ON public.publishing_job_targets FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.publishing_jobs j JOIN public.articles a ON a.organization_id = j.organization_id AND a.id = j.article_id WHERE j.organization_id = publishing_job_targets.organization_id AND j.id = publishing_job_targets.job_id AND a.region_id = (SELECT indicate_private.current_region_id()))));
CREATE POLICY tenant_isolation_insert ON public.publishing_job_targets FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.publishing_jobs j JOIN public.articles a ON a.organization_id = j.organization_id AND a.id = j.article_id WHERE j.organization_id = publishing_job_targets.organization_id AND j.id = publishing_job_targets.job_id AND a.region_id = (SELECT indicate_private.current_region_id()))));
CREATE POLICY tenant_isolation_update ON public.publishing_job_targets FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.publishing_jobs j JOIN public.articles a ON a.organization_id = j.organization_id AND a.id = j.article_id WHERE j.organization_id = publishing_job_targets.organization_id AND j.id = publishing_job_targets.job_id AND a.region_id = (SELECT indicate_private.current_region_id())))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.publishing_jobs j JOIN public.articles a ON a.organization_id = j.organization_id AND a.id = j.article_id WHERE j.organization_id = publishing_job_targets.organization_id AND j.id = publishing_job_targets.job_id AND a.region_id = (SELECT indicate_private.current_region_id()))));
CREATE POLICY tenant_isolation_delete ON public.publishing_job_targets FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.publishing_jobs j JOIN public.articles a ON a.organization_id = j.organization_id AND a.id = j.article_id WHERE j.organization_id = publishing_job_targets.organization_id AND j.id = publishing_job_targets.job_id AND a.region_id = (SELECT indicate_private.current_region_id()))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.official_affiliations;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.official_affiliations;
DROP POLICY IF EXISTS tenant_isolation_update ON public.official_affiliations;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.official_affiliations;
CREATE POLICY tenant_isolation_select ON public.official_affiliations FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = official_affiliations.organization_id AND s.id = official_affiliations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_insert ON public.official_affiliations FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = official_affiliations.organization_id AND s.id = official_affiliations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_update ON public.official_affiliations FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = official_affiliations.organization_id AND s.id = official_affiliations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id()))))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = official_affiliations.organization_id AND s.id = official_affiliations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_delete ON public.official_affiliations FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = official_affiliations.organization_id AND s.id = official_affiliations.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.site_settings;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.site_settings;
DROP POLICY IF EXISTS tenant_isolation_update ON public.site_settings;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.site_settings;
CREATE POLICY tenant_isolation_select ON public.site_settings FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = site_settings.organization_id AND s.id = site_settings.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_insert ON public.site_settings FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = site_settings.organization_id AND s.id = site_settings.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_update ON public.site_settings FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = site_settings.organization_id AND s.id = site_settings.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id()))))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = site_settings.organization_id AND s.id = site_settings.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_delete ON public.site_settings FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = site_settings.organization_id AND s.id = site_settings.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.invalidation_tasks;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.invalidation_tasks;
DROP POLICY IF EXISTS tenant_isolation_update ON public.invalidation_tasks;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.invalidation_tasks;
CREATE POLICY tenant_isolation_select ON public.invalidation_tasks FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = invalidation_tasks.organization_id AND s.id = invalidation_tasks.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_insert ON public.invalidation_tasks FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = invalidation_tasks.organization_id AND s.id = invalidation_tasks.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_update ON public.invalidation_tasks FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = invalidation_tasks.organization_id AND s.id = invalidation_tasks.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id()))))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = invalidation_tasks.organization_id AND s.id = invalidation_tasks.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_delete ON public.invalidation_tasks FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = invalidation_tasks.organization_id AND s.id = invalidation_tasks.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.domain_activation_attempts;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.domain_activation_attempts;
DROP POLICY IF EXISTS tenant_isolation_update ON public.domain_activation_attempts;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.domain_activation_attempts;
CREATE POLICY tenant_isolation_select ON public.domain_activation_attempts FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = domain_activation_attempts.organization_id AND s.id = domain_activation_attempts.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_insert ON public.domain_activation_attempts FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = domain_activation_attempts.organization_id AND s.id = domain_activation_attempts.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_update ON public.domain_activation_attempts FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = domain_activation_attempts.organization_id AND s.id = domain_activation_attempts.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id()))))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = domain_activation_attempts.organization_id AND s.id = domain_activation_attempts.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_delete ON public.domain_activation_attempts FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = domain_activation_attempts.organization_id AND s.id = domain_activation_attempts.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
DROP POLICY IF EXISTS tenant_isolation_select ON public.cache_bypasses;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.cache_bypasses;
DROP POLICY IF EXISTS tenant_isolation_update ON public.cache_bypasses;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.cache_bypasses;
CREATE POLICY tenant_isolation_select ON public.cache_bypasses FOR SELECT TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = cache_bypasses.organization_id AND s.id = cache_bypasses.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_insert ON public.cache_bypasses FOR INSERT TO indicate_runtime WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = cache_bypasses.organization_id AND s.id = cache_bypasses.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_update ON public.cache_bypasses FOR UPDATE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = cache_bypasses.organization_id AND s.id = cache_bypasses.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id()))))) WITH CHECK (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = cache_bypasses.organization_id AND s.id = cache_bypasses.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
CREATE POLICY tenant_isolation_delete ON public.cache_bypasses FOR DELETE TO indicate_runtime USING (organization_id = (SELECT indicate_private.current_organization_id()) AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = cache_bypasses.organization_id AND s.id = cache_bypasses.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))));
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (113, 'region_locked_memberships', 'region-locked-memberships-v1');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('398087aef20abd0eead610110e9026b41f73bf35eedc3fba3c7c917ea9a35337', 1789500000000);

-- ----------------------------------------------------------------------
-- 20260916010000_article_root_urls
-- ----------------------------------------------------------------------
-- Artikel tenant pindah ke slug root: tulis ulang published_url tersimpan
-- dari /articles/<slug> menjadi /<slug>. Idempoten: hanya baris yang masih
-- berawalan pola lama; URL baru (hasil redirect 308 proxy) tidak tersentuh.
UPDATE public.article_sites
SET published_url = regexp_replace(published_url, '/articles/', '/'), updated_at = now()
WHERE published_url LIKE '%/articles/%';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (114, 'article_root_urls', 'sha256:6d4cca5d246408de829601ba01845d3c4ce801c4b05b8a7d4e22d37a817eeb4e');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('675a780cf8f2e72d8b42731ca6d3cfc5f02e70dfc1455ef8d95ea2be321eab85', 1789502290201);

-- ----------------------------------------------------------------------
-- 20260916020000_invalidation_drop_articles_path
-- ----------------------------------------------------------------------
-- Antrean invalidasi lama masih membawa path /articles (indeks yang sudah dihapus):
-- buang entri itu dari task pending agar purge/revalidate hanya menyentuh route aktif.
-- Idempoten: hanya baris yang masih mengandung pola lama.
UPDATE public.invalidation_tasks
SET paths = array_remove(paths, '/articles'),
    urls = (SELECT coalesce(array_agg(u ORDER BY u), '{}') FROM unnest(urls) AS u WHERE u NOT LIKE '%/articles'),
    updated_at = now()
WHERE status = 'pending'
  AND (paths @> ARRAY['/articles'] OR EXISTS (SELECT 1 FROM unnest(urls) AS u WHERE u LIKE '%/articles'));
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (115, 'invalidation_drop_articles_path', 'sha256:7e229d07a4e666b249b02ff9c4ec3ba66a3a09a15ab1f9971a633d8079d92062');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e7dae07ed4c4e6be7fa011eb3c43843831c34e49b47d8e1c75b6065bf94d52ec', 1789529104771);

-- ----------------------------------------------------------------------
-- 20260916030000_invalidation_root_article_paths
-- ----------------------------------------------------------------------
-- Detail lama /articles/<slug> di antrean pending ditulis ulang ke /<slug>:
-- purge/revalidate tetap mengenai halaman asli, bukan URL mati.
-- Idempoten: hanya baris yang masih mengandung pola lama.
UPDATE public.invalidation_tasks
SET paths = (SELECT coalesce(array_agg(regexp_replace(p, '/articles/', '/') ORDER BY p), '{}') FROM unnest(paths) AS p),
    urls = (SELECT coalesce(array_agg(regexp_replace(u, '/articles/', '/') ORDER BY u), '{}') FROM unnest(urls) AS u),
    updated_at = now()
WHERE status = 'pending'
  AND (EXISTS (SELECT 1 FROM unnest(paths) AS p WHERE p LIKE '%/articles/%') OR EXISTS (SELECT 1 FROM unnest(urls) AS u WHERE u LIKE '%/articles/%'));
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (116, 'invalidation_root_article_paths', 'sha256:e64fb971b0be9ea2a600b6d856baa77118b0edd02374ff0bc85cf2034e82574d');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('7b9fe0fe8ab205d93354ba2aa661f08ec02b0ae55a7af6a31c46e2f8619f3822', 1789529191150);

-- ----------------------------------------------------------------------
-- 20260916040000_content_attribution_cleanup
-- ----------------------------------------------------------------------
-- Profesionalisasi atribusi konten contoh: nama figur publik dan media
-- pajangan diganti identitas netral; kutipan dan FAQ tidak berubah.
-- Idempoten: hanya baris seed yang masih bernama lama.
UPDATE public.testimonials
SET author = 'Bambang Setiawan', role = 'Pemimpin Redaksi', media = 'Grup Media Mitra', updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000007001' AND author = 'Bambang Suryono';
UPDATE public.testimonials
SET author = 'Dian Puspita', role = 'Kepala Infrastruktur Digital', media = 'Jaringan Pers Daerah', updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000007002' AND author = 'Dian Sastrowardoyo';
UPDATE public.media_showcase
SET name = 'Warta Buana', updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000007022' AND name = 'Meridian News';
UPDATE public.media_showcase
SET name = 'Cendekia Post', updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000007027' AND name = 'Arcadia News';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (117, 'content_attribution_cleanup', 'sha256:bb43add4ffa8c5dd9be068b57293399423a4c32689e77291ae52f7c48b0ec089');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('088513474cb393af2e1cb9cf52dabfac713ccc75a9cdddc0325ee3cee0bc7071', 1789539165999);

-- ----------------------------------------------------------------------
-- 20260916050000_site_settings_tagline
-- ----------------------------------------------------------------------
-- Tagline khusus per site: slogan pendek buatan redaksi, bukan potongan deskripsi.
-- Expand (nullable); baca fallback ke deskripsi bila NULL; backfill data terpisah.
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS "tagline" text;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (118, 'site_settings_tagline', 'sha256:6af1a02e9b5dfbbab5f2ccd6802fc4133a055e3e868918094b8b7b9639708c52');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('04c7fb6d276f31f32cfc0c615117ffa7db72e9e879addf6cad36471bc8b3fea3', 1789553499234);

-- ----------------------------------------------------------------------
-- 20260916060000_site_settings_tagline_repair
-- ----------------------------------------------------------------------
-- Perbaikan darurat: NULL-kan seo_default_title regional membuat guard active-site
-- menolak update berikutnya; kembalikan judul eksplisit + isi tagline, lalu
-- aktifkan kembali guard dalam transaksi yang sama (tanpa jendela).
ALTER TABLE public.site_settings DISABLE TRIGGER site_settings_active_site_guard;
UPDATE public.site_settings SET seo_default_title = 'Fakta01 Wonosobo — Fakta Wonosobo Teruji.', tagline = 'Fakta Wonosobo Teruji.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = 'aaf4a9be-d09d-463e-a459-80627e7749e8' AND (seo_default_title IS NULL OR tagline IS NULL);
UPDATE public.site_settings SET seo_default_title = 'Jurnalism Wonosobo — Bisnis Wonosobo Presisi.', tagline = 'Bisnis Wonosobo Presisi.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = 'b8fccbc5-d5a2-4411-a9d8-a8bc1c31df91' AND (seo_default_title IS NULL OR tagline IS NULL);
UPDATE public.site_settings SET seo_default_title = 'Kabar360 Wonosobo — Kabar Wonosobo Detik per Detik.', tagline = 'Kabar Wonosobo Detik per Detik.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = '99f2568e-2e16-4b53-a7ac-6816b9372a34' AND (seo_default_title IS NULL OR tagline IS NULL);
UPDATE public.site_settings SET seo_default_title = 'Liputan99 Wonosobo — Cepat ke Lapangan Wonosobo.', tagline = 'Cepat ke Lapangan Wonosobo.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = '0410409d-42ad-4f08-8538-9c262192d3ac' AND (seo_default_title IS NULL OR tagline IS NULL);
UPDATE public.site_settings SET seo_default_title = 'Nusantara24 Wonosobo — Suara Ekonomi Wonosobo.', tagline = 'Suara Ekonomi Wonosobo.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = '4c09d824-ca1d-4499-9ac7-8febbb9ae393' AND (seo_default_title IS NULL OR tagline IS NULL);
UPDATE public.site_settings SET seo_default_title = 'PantauNusantara Wonosobo — Radar Wonosobo.', tagline = 'Radar Wonosobo.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = 'ae0de66c-f218-4643-ae42-630fb8c5aea5' AND (seo_default_title IS NULL OR tagline IS NULL);
UPDATE public.site_settings SET seo_default_title = 'SuaraFakta24 Wonosobo — Suara Warga Wonosobo.', tagline = 'Suara Warga Wonosobo.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = '0707ed19-06ef-4d4b-92f0-a1c01cc36868' AND (seo_default_title IS NULL OR tagline IS NULL);
UPDATE public.site_settings SET seo_default_title = 'WartaKini7 Wonosobo — Budaya Wonosobo Hari Ini.', tagline = 'Budaya Wonosobo Hari Ini.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = '37f66e1a-4fec-4b6c-adeb-95421b6ab16a' AND (seo_default_title IS NULL OR tagline IS NULL);
UPDATE public.site_settings SET seo_default_title = 'WawasanNusa Wonosobo — Gagasan Jernih Wonosobo.', tagline = 'Gagasan Jernih Wonosobo.', updated_at = now() WHERE organization_id = '7e27727d-b59f-4d24-998e-1bee6eeb3fa0' AND site_id = '52899b6f-b552-41c2-a4dc-ee7c49c18f8e' AND (seo_default_title IS NULL OR tagline IS NULL);
ALTER TABLE public.site_settings ENABLE TRIGGER site_settings_active_site_guard;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (119, 'site_settings_tagline_repair', 'sha256:9d00e8b8b5c3da82d282cc57531ea02ec17f732a2518d48c9659a7f5de00846c');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('a0840de2778d006f5eba47dd24271ab51011e108a51d62cf9a98dcb4373b907c', 1789553647269);

-- ----------------------------------------------------------------------
-- 20260917000000_fix_upt_city_lpka_kutoarjo
-- ----------------------------------------------------------------------
-- Koreksi kota LPKA Kutoarjo yang generik di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- LPKA Kutoarjo beralamat di Kabupaten Purworejo (bukan "Jawa Tengah").
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Purworejo"'), updated_at = now()
WHERE slug = 'lpka-kelas-i-kutoarjo'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Jawa Tengah';
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Purworejo"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'lpka-kelas-i-kutoarjo'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Jawa Tengah';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (120, 'fix_upt_city_lpka_kutoarjo', 'sha256:3360800ed0b015ca9e58af0f60d91207dcf91856acfbdbc8de16a9d2165c3402');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('249d27aa8ae8005cc345ce5d5012bb3330fb8d9cadf721317227bc9c6a98ae4d', 1789621023666);

-- ----------------------------------------------------------------------
-- 20260917010000_fix_upt_city_plantungan_banjarnegara
-- ----------------------------------------------------------------------
-- Koreksi kota dua UPT yang generik di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- Lapas Pemuda Plantungan beralamat di Kabupaten Kendal;
-- Rutan Banjarnegara beralamat di Kabupaten Banjarnegara.
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Kendal"'), updated_at = now()
WHERE slug = 'lapas-pemuda-kelas-ii-b-plantungan'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Jawa Tengah';
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Kendal"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'lapas-pemuda-kelas-ii-b-plantungan'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Jawa Tengah';
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Banjarnegara"'), updated_at = now()
WHERE slug = 'rutan-kelas-ii-b-banjarnegara'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Jawa Tengah';
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Banjarnegara"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'rutan-kelas-ii-b-banjarnegara'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Jawa Tengah';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (121, 'fix_upt_city_plantungan_banjarnegara', 'sha256:49ed7408668f315049085976fc1544f7a76f2174694a0456e1cb59bae198a364');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('b66db0d238034df9130030716f41e0792365a304ae3196e006c11b4c7b495208', 1789621118158);

-- ----------------------------------------------------------------------
-- 20260917020000_fix_upt_city_bapas_magelang
-- ----------------------------------------------------------------------
-- Koreksi kota Bapas Magelang yang janggal di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- Bapas Magelang beralamat di Kabupaten Magelang, Kec. Mertoyudan
-- (bukan Kota Magelang).
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Magelang"'), updated_at = now()
WHERE slug = 'bapas-kelas-ii-magelang'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Kota Magelang';
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Magelang"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'bapas-kelas-ii-magelang'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Kota Magelang';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (122, 'fix_upt_city_bapas_magelang', 'sha256:4d446d44c6de7e3a6c96c6a6d1a31bf2e6d158da3ff3e0af8c5b58d2db698a6d');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('a052e94a5c51ab785a3ca16e9f043d1ef9621e0be3e7503d4fb6037616e6fce9', 1789621185254);

-- ----------------------------------------------------------------------
-- 20260917030000_fix_upt_city_slawi
-- ----------------------------------------------------------------------
-- Koreksi kota Lapas Slawi yang janggal di direktori resmi
-- (dibiarkan verbatim saat seed agar setia pada sumber):
-- Lapas Slawi beralamat di Tegalandong, Kabupaten Tegal (bukan Kota Tegal).
-- Idempoten: UPDATE bersyarat nilai lama.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
UPDATE public.organizations
SET customer_metadata = jsonb_set(customer_metadata, '{city}', '"Kab. Tegal"'), updated_at = now()
WHERE slug = 'lapas-kelas-ii-b-slawi'
  AND customer_metadata->>'seed' = 'upt-jateng-59org'
  AND customer_metadata->>'city' = 'Kota Tegal';
UPDATE public.publishers p
SET contacts = jsonb_set(p.contacts, '{city}', '"Kab. Tegal"'), updated_at = now()
FROM public.organizations o
WHERE o.slug = 'lapas-kelas-ii-b-slawi'
  AND o.customer_metadata->>'seed' = 'upt-jateng-59org'
  AND p.organization_id = o.id
  AND p.contacts->>'city' = 'Kota Tegal';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (123, 'fix_upt_city_slawi', 'sha256:368630527513803ac6f978f9affac3f6af0a6bfe6207cc84a1c94b7560a1fdc8');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('b7051605faabec496d888d89b6db53cfa29ba04bcfaaa1326a1dfcd1eed11bae', 1789621262751);

-- ----------------------------------------------------------------------
-- 20260918000000_faq_canonical_13
-- ----------------------------------------------------------------------
-- FAQ kanonis 13 butir: satu sumber kebenaran untuk jawaban publik.
--
-- Menggantikan pasangan 57 (billing_buyer_faqs, era paket: order, 30 hari,
-- tenggang 7 hari, Starter Rp149rb) + 98 (faq_manual_activation_copy,
-- UPDATE ... WHERE id acak sehingga no-op pada database baru) dengan
-- DELETE + INSERT idempoten ber-UUID tetap. Isi = redaksi aktivasi manual
-- (tanpa paket, tanpa masa tenggang) + butir ke-13 pelaporan konten
-- (/report, tinjau 1x24 jam) yang sinkron dengan Terms §14.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DELETE FROM public.faqs;
INSERT INTO public.faqs (id, question, answer, sort_order, active) VALUES
  ('dfd974ec-3490-4345-9201-cc46f5e78302', 'Apakah saya membutuhkan server terpisah untuk setiap portal berita?', 'Tidak. Seluruh portal Anda berjalan di atas 1 infrastruktur terpusat yang sama. Pemisahan data dan tampilan dilakukan otomatis berdasarkan nama domain, jadi nambah portal tidak nambah urusan server.', 1, true),
  ('b1f479b0-a5db-4ba7-a335-62dff874b389', 'Bagaimana cara wartawan menerbitkan berita dari luar kantor?', 'Cukup buka dasbor dari HP atau kirim via chat Telegram yang sudah didaftarkan. Tidak perlu laptop, tidak perlu datang ke kantor.', 2, true),
  ('64258005-e08f-4d51-af15-82703f9832f4', 'Apakah satu artikel bisa tayang di lebih dari satu situs sekaligus?', 'Ya. Tulis satu kali, pilih situs-situs tujuannya, lalu terbitkan. Status tiap penayangan terpantau satu per satu.', 3, true),
  ('63f24875-3436-4a7f-b730-4441c0106a1c', 'Bagaimana cara mulai berlangganan?', 'Hubungi kami lewat WhatsApp atau surel, ceritakan kebutuhan Anda, sepakati biayanya, lalu lakukan pembayaran manual. Setelah terkonfirmasi, organisasi Anda kami aktifkan paling lambat 1x24 jam dan berjalan terus.', 4, true),
  ('2a0f30ac-20aa-4971-9502-944c35c1c705', 'Apakah langganan bisa kedaluwarsa?', 'Tidak ada masa aktif yang kedaluwarsa dan tidak ada masa tenggang: selama status organisasi Anda aktif, seluruh fungsi berjalan penuh. Penonaktifan hanya terjadi atas permintaan Anda atau pelanggaran ketentuan.', 5, true),
  ('dc114ddc-b39c-4691-920c-4f9448aff113', 'Apakah nama domain tetap milik saya?', 'Ya, 100%. Domain dibeli dan dipegang atas nama Anda. Berhenti kapan pun, domain dan seluruh konten dibawa pergi.', 6, true),
  ('64c110a9-da4b-4e9f-9be8-1190096ad96a', 'Apakah ada tingkatan paket?', 'Tidak ada. Semua pelanggan mendapat fungsi yang sama; yang membedakan hanya kebutuhan Anda yang kami diskusikan di awal. Satu-satunya hal yang disesuaikan adalah biaya kesepakatan.', 7, true),
  ('761e83a9-b50d-4766-81c9-efd5652642cd', 'Berapa biayanya?', 'Hubungi kami lewat WhatsApp, ceritakan kebutuhan dan jumlah websitenya. Kami memberi angka pasti di depan sebelum Anda membayar apa pun.', 8, true),
  ('b1d4b620-5724-40d5-8b29-ee1654d23f47', 'Apakah data redaksi saya tercampur dengan pelanggan lain?', 'Data setiap organisasi dipisahkan secara berlapis sampai tingkat basis data dan dirancang agar tidak dapat diakses lintas tenant. Detail penegakannya dijelaskan pada Kebijakan Privasi.', 9, true),
  ('1de04400-5846-4d71-a6e4-b66668c3fc76', 'Saya sudah punya website berjalan. Bisa pindah?', 'Bisa. Ceritakan sistem lama Anda saat menghubungi kami; bantuan pindahan kami sesuaikan dengan kebutuhan.', 10, true),
  ('acd28953-8f62-42a8-9e11-9916dd86b793', 'Apakah ada masa percobaan gratis?', 'Tidak ada trial otomatis. Sebagai gantinya Anda bisa melihat cara kerja dasbor lewat sesi peninjauan bersama sebelum memutuskan.', 11, true),
  ('d849d3fe-c818-469d-bc54-10aa1b8dd235', 'Bagaimana kalau butuh bantuan?', 'Semua pelanggan didampingi manusia lewat kanal yang jelas — bukan bot. Prioritas penanganan mengikuti dampak: situs tidak bisa diakses ditangani lebih dulu.', 12, true),
  ('7e9f1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b', 'Bagaimana cara melaporkan konten yang melanggar?', 'Buka halaman Laporkan Konten (/report) pada portal yang bersangkutan, pilih kategorinya, dan uraikan bagian yang melanggar. Laporan kredibel ditinjau paling lambat 1x24 jam; materi yang disengketakan dapat dibatasi tayangnya selama pemeriksaan.', 13, true);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (124, 'faq_canonical_13', 'sha256:45b7a6df70bf29dabe7ce021357fe4bcce6a60351c74035d46f3d9a1b216cab8');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('557d615cfa121741dfa1db667332fa088caf55b7521e7aafcd236ff5ee29a0a7', 1789699812796);

-- ----------------------------------------------------------------------
-- 20260918010000_faq_category
-- ----------------------------------------------------------------------
-- Topik FAQ untuk pengelompokan pusat bantuan.
--
-- Expand (nullable); baca fallback ke 'Umum' bila NULL; backfill 13 baris
-- kanonis sesuai topiknya (Platform, Penerbitan, Langganan & Biaya,
-- Keamanan Data, Migrasi, Bantuan). Checksum di bawah adalah sha256 heks
-- dari isi berkas ini sebelum baris INSERT ledger.
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS "category" text;
UPDATE public.faqs SET category = 'Platform' WHERE id = 'dfd974ec-3490-4345-9201-cc46f5e78302';
UPDATE public.faqs SET category = 'Penerbitan' WHERE id IN ('b1f479b0-a5db-4ba7-a335-62dff874b389', '64258005-e08f-4d51-af15-82703f9832f4');
UPDATE public.faqs SET category = 'Langganan & Biaya' WHERE id IN ('63f24875-3436-4a7f-b730-4441c0106a1c', '2a0f30ac-20aa-4971-9502-944c35c1c705', 'dc114ddc-b39c-4691-920c-4f9448aff113', '64c110a9-da4b-4e9f-9be8-1190096ad96a', '761e83a9-b50d-4766-81c9-efd5652642cd', 'acd28953-8f62-42a8-9e11-9916dd86b793');
UPDATE public.faqs SET category = 'Keamanan Data' WHERE id = 'b1d4b620-5724-40d5-8b29-ee1654d23f47';
UPDATE public.faqs SET category = 'Migrasi' WHERE id = '1de04400-5846-4d71-a6e4-b66668c3fc76';
UPDATE public.faqs SET category = 'Bantuan' WHERE id IN ('d849d3fe-c818-469d-bc54-10aa1b8dd235', '7e9f1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b');
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (125, 'faq_category', 'sha256:2b23e29c0fd17a13e0940e7156632f27c6a992c8e9deddb97598bc125b3c7a65');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f22a45aa12055e1739064e9a160a7b4cf223fd75f42baba2c9c3233ef67b3b2d', 1789734433960);

-- ----------------------------------------------------------------------
-- 20260918020000_publisher_attribution_short
-- ----------------------------------------------------------------------
-- Label atribusi pendek gaya pers: buang kelas ("Kelas II B") dari semua
-- attribution_label ("Humas Rutan Kelas II B Wonosobo" -> "Humas Rutan Wonosobo").
-- Kolom `name` tetap nama resmi kapital; label "Redaksi ..." tanpa kelas tak tersentuh.
-- Kelas tanpa sub-huruf ("Kelas I Semarang", "Kelas II Klaten") ikut terpangkas;
-- lookahead (?=\s) mencegah huruf awal kota termakan ("I S..." dan "II K..."
-- bukan sub-kelas "II B").
-- Pernyataan kedua membangun ulang label yang sempat terpangkas berlebih oleh
-- revisi regex sebelumnya (huruf awal kota hilang, mis. "LPKAutoarjo",
-- "Bapaslaten") langsung dari `name` resmi yang tak tersentuh.
-- Idempoten: hanya baris yang berubah. Checksum di bawah adalah sha256 heks
-- dari isi berkas ini sebelum baris INSERT.
UPDATE public.publishers
SET attribution_label = regexp_replace(attribution_label, '\sKelas\s+[IVX]+(\s+[A-Z](?=\s))?', '', 'g'),
    updated_at = now()
WHERE attribution_label IS DISTINCT FROM regexp_replace(attribution_label, '\sKelas\s+[IVX]+(\s+[A-Z](?=\s))?', '', 'g');
UPDATE public.publishers
SET attribution_label =
  'Humas '
  || replace(initcap(split_part(name, ' KELAS', 1)), 'Lpka', 'LPKA')
  || ' '
  || replace(initcap(regexp_replace(name, '^.* KELAS (I|II) ', '')), 'Lpka', 'LPKA'),
    updated_at = now()
WHERE name ~ ' KELAS (I|II) '
  AND name !~ ' KELAS (I|II) [A-Z] '
  AND attribution_label NOT LIKE '% Kelas%'
  AND attribution_label IS DISTINCT FROM
    'Humas '
    || replace(initcap(split_part(name, ' KELAS', 1)), 'Lpka', 'LPKA')
    || ' '
    || replace(initcap(regexp_replace(name, '^.* KELAS (I|II) ', '')), 'Lpka', 'LPKA');
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (126, 'publisher_attribution_short', 'sha256:dc991100643411a0d1ae3d1cab6f6d9c0a646214e9c00c3622303b2cea64d523');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('cbba982f7b67214a257c4460e577633aaa6fb479c5cb684319821353d68b88e0', 1789735675398);

-- ----------------------------------------------------------------------
-- 20260918030000_publisher_attribution_helper
-- ----------------------------------------------------------------------
-- Sumber tunggal aturan label atribusi pendek untuk seed batch berikutnya
-- ("RUTAN KELAS II B WONOSOBO" -> "Humas Rutan Wonosobo").
-- Form dashboard memakai padanan TypeScript-nya
-- (modules/dashboard/components/editorial/publisher-attribution.ts); ubah
-- keduanya bila aturan berubah. Idempoten (CREATE OR REPLACE).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.short_attribution_label(official_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
RETURN 'Humas ' || replace(initcap(regexp_replace(official_name, '\sKELAS\s+[IVX]+(\s+[A-Z](?=\s))?', '', 'g')), 'Lpka', 'LPKA');
GRANT EXECUTE ON FUNCTION indicate_private.short_attribution_label(text) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (127, 'publisher_attribution_helper', 'sha256:62054eee4e7b9c58ecb424c6eeb5162d64a48f5487c9b6597ab378ea02dc290c');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e3870e0b944265cdfa7e4f489b070eb593708cf7c14183c1d6b81bf332690ab6', 1789736068044);

-- ----------------------------------------------------------------------
-- 20260918040000_function_search_path
-- ----------------------------------------------------------------------
-- Kunci search_path helper label atribusi (temuan advisor
-- function_search_path_mutable): mengikuti konvensi repo
-- (pg_catalog, public, indicate_private).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER FUNCTION indicate_private.short_attribution_label(text) SET search_path = pg_catalog, public, indicate_private;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (128, 'function_search_path', 'sha256:2d61210529f201fbcafb264b2a34654f215505b7884a0cb839d62202eb562844');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('92b89a3979a4955f8d6b711abdaa3b6abc42f5afe380628fa09ae5225807ff07', 1789736363176);

-- ----------------------------------------------------------------------
-- 20260918050000_telegram_publish_pick_site
-- ----------------------------------------------------------------------
-- Tambah langkah publish_pick_site untuk alur Telegram tanpa ketik ID (tombol portal).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'publish_pick_site';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (129, 'telegram_publish_pick_site', 'sha256:b3c9dcbb60ef2f4a32180d2ada330294ff70a570fea01342020e6b2e41898fbd');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('b7ad2fb3ca7aeeffff1dfafd0c1944465f8bdaa9ef127c6072319249c96d3802', 1789743743127);

-- ----------------------------------------------------------------------
-- 20260919010000_invoice_payment_method
-- ----------------------------------------------------------------------
-- Metode pembayaran invoice: teks tampilan ("Transfer bank") + CHECK panjang.
-- Kolom NOT NULL berdefault agar bacaan lama tetap valid selama rollout;
-- invoice_create menerima p_payment_method opsional (default sama).
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.invoices ADD COLUMN payment_method text NOT NULL DEFAULT 'Transfer bank';
ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_method_bounded CHECK (length(payment_method) BETWEEN 1 AND 40);
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone, p_payment_method text DEFAULT 'Transfer bank')
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text; v_method text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_method := COALESCE(NULLIF(p_payment_method, ''), 'Transfer bank');
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_now, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), v_method, p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt','paymentMethod'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at, 'paymentMethod', v_method), p_request_id, p_now);
  RETURN v_id;
END
$function$;
DROP FUNCTION IF EXISTS indicate_private.invoice_list_for_org(uuid, uuid);
CREATE FUNCTION indicate_private.invoice_list_for_org(p_actor_id uuid, p_organization_id uuid)
  RETURNS TABLE(id uuid, organization_id uuid, organization_name text, number text, amount_idr integer, currency text, status invoice_status, paid_at timestamp with time zone, billing_note text, payment_method text, voided_at timestamp with time zone, void_reason text, version integer, created_at timestamp with time zone)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE memberships.organization_id = invoice_list_for_org.p_organization_id AND memberships.user_id = p_actor_id AND memberships.status = 'active') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.organization_id, o.name, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.billing_note, i.payment_method, i.voided_at, i.void_reason, i.version, i.created_at
  FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.organization_id = p_organization_id ORDER BY i.paid_at DESC, i.created_at DESC;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (130, 'invoice_payment_method', 'sha256:c6760485915fe0cd5645aa40afa37a8db3b9fbb3c244d58329965176c779840a');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e89b52f05853e285fbb9a1d6b883f91928994edff92713905e05301766e09831', 1789759012791);

-- ----------------------------------------------------------------------
-- 20260919020000_telegram_suggest_step
-- ----------------------------------------------------------------------
-- Langkah suggest_sites untuk alur saran varian Telegram (tombol 💡 + /suggest).
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'suggest_sites';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (131, 'telegram_suggest_step', 'sha256:3ecf7b5f24876b5bd5b2524f8ae9fbf7b7036759be6ef9a4539d2c757868ae53');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f7c94c8795a2d6d3c3f54917194b67f6562ba53631c9a98077ea0c475fdd5da9', 1789761092778);

-- ----------------------------------------------------------------------
-- 20260919030000_template_presets_nine
-- ----------------------------------------------------------------------
INSERT INTO public.template_presets (id, name, description, category) VALUES
  ('clean-blue', 'Clean Blue Editorial', 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.', 'news'),
  ('black-lime', 'Black Lime Pulse', 'Dark pekat aksen lime: hero split, ticker pil, kartu 4 kolom, panel paling dibaca.', 'news'),
  ('dark-navy', 'Dark Navy Modern', 'Navy gelap modern: hero overlay, list horizontal, panel paling dibaca dan newsletter.', 'news'),
  ('glassy-blue', 'Glassy Blue', 'Kaca biru terang: hero kartu kaca, pil kategori, kartu 3 kolom dan perspektif.', 'news'),
  ('green-minimal', 'Green Minimal', 'Hijau minimal natural: hero split, list editorial, newsletter daun.', 'news'),
  ('orange-modern', 'Orange Modern', 'Oranye modern: hero split kanan, kartu 4 kolom, panel perspektif senja.', 'news'),
  ('purple-editorial', 'Purple Digital Editorial', 'Ungu digital: hero kartu bulat, pil pastel, quote gradien dan newsletter.', 'editorial'),
  ('red-editorial', 'Red Editorial', 'Merah editorial serif: hero split klasik, daftar bernomor, panel marun.', 'editorial'),
  ('soft-blue', 'Soft Blue Cards', 'Kartu biru lembut: hero kartu putih, kartu horizontal 2 kolom, newsletter pos.', 'news'),
  ('warm-editorial', 'Warm Editorial', 'Terakota hangat serif: hero split krem, kartu 3 kolom, quote senja.', 'editorial')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, updated_at = now();
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (132, 'template_presets_nine', 'sha256:0d9d950fcfb63f2c576bcd0a081e3001b7e71fb63aa2c70e599e103ecea12116');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('690b951bc2e4ed749ca8961203a2dd0c5157a2e7b73cacee1d31f31fbf188ab3', 1789762092778);

-- ----------------------------------------------------------------------
-- 20260919040000_telegram_identity_options
-- ----------------------------------------------------------------------
-- Opsi identitas Telegram per akun (pemilih organisasi) + langkah site_pick.
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'site_pick';
CREATE OR REPLACE FUNCTION indicate_private.list_telegram_identities(p_user_id text, p_chat_id text)
 RETURNS TABLE(mapping_id uuid, organization_id uuid, organization_name text, user_id uuid, role_id uuid, telegram_user_id text, telegram_chat_id text, region_id uuid, permissions text[])
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
  SELECT m.id, m.organization_id, o.name, m.user_id, m.role_id, m.telegram_user_id,
         m.telegram_chat_id, membership.region_id, coalesce(array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[])
  FROM public.telegram_identity_mappings m
  JOIN public.memberships membership
    ON membership.organization_id = m.organization_id AND membership.user_id = m.user_id
   AND membership.role_id = m.role_id AND membership.status = 'active'
  JOIN public.roles r
    ON r.organization_id = membership.organization_id AND r.id = membership.role_id AND r.active
  JOIN public.organizations o ON o.id = m.organization_id
  LEFT JOIN public.role_permissions rp ON rp.organization_id = m.organization_id AND rp.role_id = m.role_id
  LEFT JOIN public.permissions p ON p.id = rp.permission_id
  WHERE m.telegram_user_id = p_user_id AND m.telegram_chat_id = p_chat_id AND m.status = 'active'
  GROUP BY m.id, m.organization_id, o.name, m.user_id, m.role_id, m.telegram_user_id, m.telegram_chat_id, membership.region_id
$function$;
REVOKE ALL ON FUNCTION indicate_private.list_telegram_identities(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.list_telegram_identities(text, text) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (133, 'telegram_identity_options', 'sha256:39fd5403801ce886b3f469c08bdd960fccc4bfcb1b19e41253625e1d6ae66a14');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('e8192d2701af3ac5c1814f86becf9139bc51d77fb34f29460ba30c0133a8ba7f', 1789850400000);

-- ----------------------------------------------------------------------
-- 20260919050000_telegram_article_edit_step
-- ----------------------------------------------------------------------
-- Langkah article_edit dan article_edit_confirm untuk ubah artikel via tombol Telegram.
-- Idempoten. Checksum di bawah adalah sha256 heks dari isi berkas ini
-- sebelum baris INSERT.
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'article_edit';
ALTER TYPE "public"."telegram_conversation_step" ADD VALUE IF NOT EXISTS 'article_edit_confirm';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (134, 'telegram_article_edit_step', 'sha256:21697c7a60a4a1575b88b493ae1f5d998001f0e415eca77901a49ff0138ff0d7');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('68757b6a83cc1029faa7bc376a6cac2ffe200e1a33bf24744459c054d3c18c5e', 1789850500000);

-- ----------------------------------------------------------------------
-- 20260919060000_retention_terminal_sweep
-- ----------------------------------------------------------------------
-- Perluasan sweep retensi: baris terminal operasional yang menumpuk.
--
-- retention_sweep dinyatakan ulang dengan tiga kategori baru, semuanya
-- terminal dan aman dihapus: invalidation_tasks completed/failed >90 hari,
-- telegram_outbox sent/dead >30 hari, dan publication_transition_receipts
-- >90 hari kecuali baris terbaru per job. Guard litigation hold dihormati
-- seperti kategori lama; audit_logs tidak pernah disentuh DELETE.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE OR REPLACE FUNCTION indicate_private.retention_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_total integer := 0; v_count integer; v_started timestamptz := now();
BEGIN
  DELETE FROM public.org_invitations WHERE ((accepted_at IS NOT NULL AND accepted_at < now() - interval '90 days') OR (accepted_at IS NULL AND expires_at < now() - interval '90 days')) AND NOT indicate_private.is_org_held(org_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('org_invitations', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.webhook_replay_claims WHERE expires_at < now() AND (organization_id IS NULL OR NOT indicate_private.is_org_held(organization_id));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('webhook_replay_claims', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.object_cleanup_tasks WHERE status = 'completed' AND updated_at < now() - interval '90 days' AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('object_cleanup_tasks', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.telegram_conversations WHERE expires_at < now() AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('telegram_conversations', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.invalidation_tasks WHERE status IN ('completed', 'failed') AND updated_at < now() - interval '90 days' AND NOT indicate_private.is_org_held(organization_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('invalidation_tasks', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.telegram_outbox WHERE status IN ('sent', 'dead') AND updated_at < now() - interval '30 days' AND (organization_id IS NULL OR NOT indicate_private.is_org_held(organization_id));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('telegram_outbox', v_count, v_started, now());
  v_total := v_total + v_count;
  DELETE FROM public.publication_transition_receipts r
  WHERE r.created_at < now() - interval '90 days'
    AND NOT indicate_private.is_org_held(r.organization_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.publication_transition_receipts latest
      WHERE latest.organization_id = r.organization_id
        AND latest.job_id = r.job_id
        AND (latest.created_at, latest.id) > (r.created_at, r.id)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.retention_runs(category, purged_count, started_at, finished_at) VALUES ('publication_transition_receipts', v_count, v_started, now());
  v_total := v_total + v_count;
  RETURN v_total;
END
$function$;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (135, 'retention_terminal_sweep', 'sha256:4262ce1fa93ccd67231e53c5714a4a6b5cd6655d12056791963a5a22230ca02a');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('88aa6858763e01f1b9987bb1d1cd741483962aa03813c5ce15e5f19717db331d', 1789850600000);

-- ----------------------------------------------------------------------
-- 20260920030000_subscription_update_entry_point
-- ----------------------------------------------------------------------
-- Catat titik masuk pemanggil pada audit subscription_update.
--
-- Kolom entry_point selama ini diisi hardcoded 'dashboard', sehingga tulis
-- langganan dari Telegram Mini App tersalahatribusi di audit_logs. Parameter
-- baru p_entry_point (default 'dashboard') meneruskan entry_point aktor;
-- pemanggil lama enam argumen tetap valid tanpa perubahan.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
DROP FUNCTION IF EXISTS indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz);
CREATE FUNCTION indicate_private.subscription_update(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_expected_version integer, p_status subscription_status, p_now timestamp with time zone, p_entry_point text DEFAULT 'dashboard')
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL THEN
    INSERT INTO public.subscriptions(organization_id, status, version, created_at, updated_at)
    VALUES (p_organization_id, p_status, 1, p_now, p_now)
    ON CONFLICT (organization_id) DO NOTHING;
    IF NOT FOUND THEN RETURN false; END IF;
  ELSE
    UPDATE public.subscriptions SET status = p_status, version = version + 1, updated_at = p_now
    WHERE organization_id = p_organization_id AND version = p_expected_version;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, p_entry_point, 'subscription.update', 'subscription', p_organization_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', p_status), p_request_id, p_now);
  RETURN true;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.subscription_update(uuid, text, uuid, integer, subscription_status, timestamptz, text) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (136, 'subscription_update_entry_point', 'sha256:5afd115d9c049e8d8248ce63afad86ec78b70d9c20fc796cd5e356e89e44094d');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ce315b60f682d837381b5a08910ed05484d5c7811487629f0078d8c972bcdfd6', 1789850700000);

-- ----------------------------------------------------------------------
-- 20260920040000_invoice_paid_month_single_price
-- ----------------------------------------------------------------------
-- Faktur ikut bulan bayar, harga tunggal Rp550.000, dan terbitkan ulang.
--
-- Nomor IND-{ORG5}-{YYMM}-{SEQ4}-{RAND4} memakai YYMM dari p_paid_at (bulan
-- dana diterima) bukan p_now (saat admin mencatat), agar arsip bulanan rapi
-- walau faktur dibuat belakangan. invoice_create menolak nominal selain
-- 550000; CHECK NOT VALID menjaga baris baru tanpa menolak arsip lama.
-- invoice_reissue membuat pengganti paid dari faktur void (salin
-- organisasi/nominal/paid_at/catatan/metode, nomor baru, audit reissue).
-- Kedua overload invoice_create (7-arg lama, 8-arg metode) diperbarui.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
ALTER TABLE public.invoices ADD CONSTRAINT invoices_amount_single CHECK (amount_idr = 550000) NOT VALID;
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <> 550000 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_paid_at, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), 'Transfer bank', p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt','paymentMethod'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at, 'paymentMethod', 'Transfer bank'), p_request_id, p_now);
  RETURN v_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone, p_payment_method text DEFAULT 'Transfer bank')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text; v_method text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <> 550000 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_method := COALESCE(NULLIF(p_payment_method, ''), 'Transfer bank');
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_paid_at, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), v_method, p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt','paymentMethod'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at, 'paymentMethod', v_method), p_request_id, p_now);
  RETURN v_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.invoice_reissue(p_actor_id uuid, p_request_id text, p_invoice_id uuid, p_expected_version integer, p_reason text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_src public.invoices%ROWTYPE; v_id uuid := gen_random_uuid(); v_slug text; v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_src FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_src.id IS NULL OR v_src.status <> 'voided' OR v_src.version <> p_expected_version THEN
    RETURN NULL;
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = v_src.organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(v_src.paid_at, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, v_src.organization_id, v_number, v_src.amount_idr, 'paid', v_src.paid_at, v_src.billing_note, v_src.payment_method, p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_src.organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.reissue', 'invoice', v_id::text, 'succeeded', ARRAY['number','replaces'], jsonb_build_object('number', v_number, 'replaces', p_invoice_id, 'reason', p_reason), p_request_id, p_now);
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_reissue(uuid, text, uuid, integer, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_reissue(uuid, text, uuid, integer, text, timestamptz) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (137, 'invoice_paid_month_single_price', 'sha256:2195e850eb0180bf790c738c90eafaf27bd6ea156bd58d47ee297c371f888d0a');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('8039b3d3b9dadc3faae32b2b4c9ee5b7d70336eed108f13212a09a328a77423d', 1789850800000);

-- ----------------------------------------------------------------------
-- 20260920050000_site_settings_template_fk
-- ----------------------------------------------------------------------
-- Kunci templateId site_settings ke katalog template_presets.
--
-- Kolom generated `template_id` menurunkan `colors->>'templateId'` lalu
-- mengikatnya sebagai FK ke `template_presets(id)`: id tak dikenal ditolak
-- saat tulis, bukan lagi jatuh diam-diam ke satu template. NULL tetap lolos
-- FK; baris tanpa template gagal keras saat render (`normalizeTemplateId`
-- melempar) alih-alih tampil sebagai template yang salah. Baris existing
-- sudah sinkron (dua puluh site memakai sepuluh id terdaftar).
ALTER TABLE public.site_settings ADD COLUMN template_id text GENERATED ALWAYS AS ((colors ->> 'templateId')) STORED;
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_template_id_fk FOREIGN KEY (template_id) REFERENCES public.template_presets(id);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (138, 'site_settings_template_fk', 'sha256:5b2b4e03b95947db149393017f60c5630d008a9aacebe474fcf309c888b281b0');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f3cdcf931e6bcfa7e384d7133e9793c5941b61bb4e393ab6fc647de414c7501c', 1789850900000);

-- ----------------------------------------------------------------------
-- 20260920060000_site_settings_template_fk_idx
-- ----------------------------------------------------------------------
-- Covering index untuk FK site_settings.template_id.
--
-- Menutup temuan advisor `unindexed_foreign_keys` dari migrasi
-- `site_settings_template_fk`: hapus/ubah baris `template_presets` tidak
-- lagi memindai penuh `site_settings`.
CREATE INDEX site_settings_template_id_idx ON public.site_settings USING btree (template_id);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (139, 'site_settings_template_fk_idx', 'sha256:5ce19ae165d62eaa17b8afa2f7959e623d583a8e36db498026e3ac09509a3b8c');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('4222bd4f7d9c0293328682acf0d52f19a2d881c60c57073aad86af718a90d53e', 1789851000000);

-- ----------------------------------------------------------------------
-- 20260920070000_invoice_unpaid
-- ----------------------------------------------------------------------
-- Tagihan sebelum bayar: status unpaid + jatuh tempo + fungsi terbitkan/bayar.
--
-- invoice_status bertambah 'unpaid'; paid_at menjadi nullable (tagihan belum
-- punya tanggal lunas) dan due_at mencatat jatuh tempo. invoice_issue membuat
-- tagihan unpaid dengan nomor YYMM dari p_now (bulan terbit, bukan bulan
-- bayar); invoice_pay melunasi tagihan unpaid dengan version check + audit.
-- invoice_create (paid langsung) tidak berubah.
-- CATATAN APLIKASI: ALTER TYPE ... ADD VALUE tidak boleh di dalam blok
-- transaksi; terapkan berkas ini pernyataan-per-pernyataan (psql -f tanpa
-- -1, atau editor SQL Supabase), sesuai urutan journal.
ALTER TYPE public.invoice_status ADD VALUE 'unpaid';
ALTER TABLE public.invoices ALTER COLUMN paid_at DROP NOT NULL;
ALTER TABLE public.invoices ADD COLUMN due_at timestamp with time zone;
CREATE OR REPLACE FUNCTION indicate_private.invoice_issue(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_due_at timestamp with time zone, p_note text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <> 550000 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_due_at IS NULL OR p_due_at <= p_now THEN
    RAISE EXCEPTION 'due_at invalid' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_now, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, due_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'unpaid', NULL, p_due_at, nullif(p_note, ''), 'Transfer bank', p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.issue', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','dueAt'], jsonb_build_object('number', v_number, 'amount', p_amount, 'dueAt', p_due_at), p_request_id, p_now);
  RETURN v_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.invoice_pay(p_actor_id uuid, p_request_id text, p_invoice_id uuid, p_expected_version integer, p_paid_at timestamp with time zone, p_payment_method text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_row public.invoices%ROWTYPE; v_method text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_row.id IS NULL OR v_row.status <> 'unpaid' OR v_row.version <> p_expected_version THEN
    RETURN NULL;
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_method := COALESCE(NULLIF(p_payment_method, ''), 'Transfer bank');
  UPDATE public.invoices
  SET status = 'paid', paid_at = p_paid_at, payment_method = v_method, version = v_row.version + 1, updated_at = p_now
  WHERE id = p_invoice_id;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (v_row.organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.pay', 'invoice', p_invoice_id::text, 'succeeded', ARRAY['status','paidAt','paymentMethod'], jsonb_build_object('status', 'paid', 'paidAt', p_paid_at, 'paymentMethod', v_method), p_request_id, p_now);
  RETURN p_invoice_id;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_issue(uuid, text, uuid, integer, timestamptz, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_issue(uuid, text, uuid, integer, timestamptz, text, timestamptz) TO indicate_runtime;
REVOKE ALL ON FUNCTION indicate_private.invoice_pay(uuid, text, uuid, integer, timestamptz, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_pay(uuid, text, uuid, integer, timestamptz, text, timestamptz) TO indicate_runtime;
CREATE OR REPLACE FUNCTION indicate_private.invoice_void(p_actor_id uuid, p_request_id text, p_invoice_id uuid, p_expected_version integer, p_reason text, p_now timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(p_reason) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'reason required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.invoices SET status = 'voided', voided_at = p_now, void_reason = p_reason, version = version + 1, updated_at = p_now
  WHERE id = p_invoice_id AND version = p_expected_version AND status IN ('paid', 'unpaid');
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  SELECT organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.void', 'invoice', p_invoice_id::text, 'succeeded', ARRAY['status'], jsonb_build_object('status', 'voided'), p_request_id, p_now
  FROM public.invoices WHERE id = p_invoice_id;
  RETURN true;
END
$function$;
DROP FUNCTION IF EXISTS indicate_private.invoice_list_for_org(uuid, uuid);CREATE FUNCTION indicate_private.invoice_list_for_org(p_actor_id uuid, p_organization_id uuid)
  RETURNS TABLE(id uuid, organization_id uuid, organization_name text, number text, amount_idr integer, currency text, status invoice_status, paid_at timestamp with time zone, due_at timestamp with time zone, billing_note text, payment_method text, voided_at timestamp with time zone, void_reason text, version integer, created_at timestamp with time zone)
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id)
     AND NOT EXISTS (SELECT 1 FROM public.memberships WHERE memberships.organization_id = invoice_list_for_org.p_organization_id AND memberships.user_id = p_actor_id AND memberships.status = 'active') THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT i.id, i.organization_id, o.name, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.due_at, i.billing_note, i.payment_method, i.voided_at, i.void_reason, i.version, i.created_at
  FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.organization_id = p_organization_id ORDER BY i.paid_at DESC NULLS FIRST, i.created_at DESC;
END
$function$;
REVOKE ALL ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicate_private.invoice_list_for_org(uuid, uuid) TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (140, 'invoice_unpaid', 'sha256:207d0829a94ee9486889ef196ad9db9c5ae7d5fa075a242acea50c3260cc35f7');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('5b92a475182327b1dbfc02f84f62be080c91a6d8ae9de9f4d5b8c834664efebc', 1789835708210);

-- ----------------------------------------------------------------------
-- 20260920080000_article_tags_canonical
-- ----------------------------------------------------------------------
-- Kanonik tag artikel ke kebab-case: cermin aturan tulis aplikasi
-- (lowercase, buang non `[a-z0-9 _-]', spasi/underscore jadi `-`, kolap strip,
-- maks 60 char, buang kosong, dedupe dengan urutan kemunculan pertama).
-- Idempoten: hanya baris yang hasil normalisasinya berbeda yang ditulis.
WITH normalized AS (
  SELECT
    a.organization_id,
    a.id,
    COALESCE((
      SELECT array_agg(norm.tag ORDER BY norm.first_ord)
      FROM (
        SELECT canon.tag, min(u.ord) AS first_ord
        FROM unnest(a.tags) WITH ORDINALITY AS u(elem, ord)
        CROSS JOIN LATERAL (
          SELECT rtrim(left(trim(both '-' from regexp_replace(regexp_replace(regexp_replace(lower(trim(u.elem)), '[^a-z0-9\s_-]', '', 'g'), '[\s_]+', '-', 'g'), '-+', '-', 'g')), 60), '-') AS tag
        ) AS canon
        WHERE u.elem ~ '[a-zA-Z0-9]' AND canon.tag <> ''
        GROUP BY canon.tag
      ) AS norm
    ), ARRAY[]::text[]) AS tags
  FROM public.articles AS a
)
UPDATE public.articles AS target
SET tags = normalized.tags
FROM normalized
WHERE target.organization_id = normalized.organization_id
  AND target.id = normalized.id
  AND target.tags IS DISTINCT FROM normalized.tags;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (141, 'article_tags_canonical', 'sha256:caff95bc251c87b804fbce84eba79e2d4c5d3360faa86d4abbe55fb9b4a6ee1f');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f15e59155ae924936f42fccd5a2f6293ebc7914a9ead56e39245a89f15ba9de2', 1789841835396);

-- ----------------------------------------------------------------------
-- 20260920090000_dashboard_metric_indexes
-- ----------------------------------------------------------------------
-- Indeks komposit untuk hitungan metrik dashboard (dashboardCounts) dan agregasi analitik.
--
-- Menutup pemindaian berurutan pada filter (organization_id, state/status):
-- publishing_jobs.state, article_sites.state, sites.status. Tanpa perubahan perilaku;
-- hanya mempercepat count(*) dan GROUP BY per organisasi.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE INDEX IF NOT EXISTS publishing_jobs_organization_state_idx ON public.publishing_jobs USING btree (organization_id, state);
CREATE INDEX IF NOT EXISTS article_sites_organization_state_idx ON public.article_sites USING btree (organization_id, state);
CREATE INDEX IF NOT EXISTS sites_organization_status_idx ON public.sites USING btree (organization_id, status);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (142, 'dashboard_metric_indexes', 'sha256:9d0b7442a791cfd15ce4b0152231c4fdfd3284b58ae47369839c3daca4835b3d');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('03d1c9876901f91d99345df94b9e4444d48b5256b0210c53c88f2c5e47aa9b26', 1789914174720);

-- ----------------------------------------------------------------------
-- 20260920100000_publisher_logo_single_host
-- ----------------------------------------------------------------------
-- Normalisasi logo publisher lintas-host ke path relatif satu-host.
--
-- Separuh baris menyimpan fallback sebagai URL absolut control-plane
-- (https://indicate.web.id/brand/...) sehingga <img> dan logo JSON-LD
-- penerbit menunjuk lintas host; kembalikan ke path relatif agar
-- di-re-anchor ke hostname tenant yang meminta.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

UPDATE public.publishers SET contacts = contacts || jsonb_build_object('logoUrl', '/' || split_part(contacts ->> 'logoUrl', 'indicate.web.id/', 2)), updated_at = now() WHERE (contacts ->> 'logoUrl') LIKE 'https://indicate.web.id/brand/%' OR (contacts ->> 'logoUrl') LIKE 'https://indicate.web.id/assets/%';
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (143, 'publisher_logo_single_host', 'sha256:5c4a1186143f4b1ac8da08448ca4e3486ce03e41b9e2b2ba596e79c8ed614227');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('b0776d14e863da4b48fe56209d6c8f2413f2943dfd43b9264c4dc299612cb730', 1789915000000);

-- ----------------------------------------------------------------------
-- 20260920110000_article_site_view_days
-- ----------------------------------------------------------------------
-- Agregat harian tayangan per penyaluran untuk grafik dasbor.
--
-- view_count di article_sites tetap total lifetime; tabel ini menampung delta
-- harian yang ditulis view-flush (satu baris per organisasi/relasi/hari) agar
-- analitik tidak lagi mengelompokkan SUM lifetime berdasar state_occurred_at.
-- Baris historis tidak di-backfill: grafik terisi mulai hari migrasi applied.
-- RLS + grant mengikuti pola cache_bypasses (isolasi tenant + cakupan region
-- lewat sites agar aktor region-scoped tidak melebar ke satu organisasi).
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.

CREATE TABLE IF NOT EXISTS public.article_site_view_days (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  article_site_id uuid NOT NULL,
  site_id uuid NOT NULL,
  day date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  CONSTRAINT article_site_view_days_pk PRIMARY KEY (organization_id, article_site_id, day),
  CONSTRAINT article_site_view_days_views_nonnegative CHECK (views >= 0)
);
CREATE INDEX IF NOT EXISTS article_site_view_days_organization_day_idx
  ON public.article_site_view_days USING btree (organization_id, day DESC);
ALTER TABLE public.article_site_view_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_site_view_days FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.article_site_view_days;
CREATE POLICY tenant_isolation ON public.article_site_view_days
  USING (organization_id = indicate_private.current_organization_id() AND ((SELECT indicate_private.current_region_id()) IS NULL OR EXISTS (SELECT 1 FROM public.sites s WHERE s.organization_id = article_site_view_days.organization_id AND s.id = article_site_view_days.site_id AND (s.region_id IS NULL OR s.region_id = (SELECT indicate_private.current_region_id())))))
  WITH CHECK (organization_id = indicate_private.current_organization_id());
GRANT SELECT, INSERT, UPDATE ON public.article_site_view_days TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (144, 'article_site_view_days', 'sha256:dbf21bed2a4fa48758f06ed4b70d38f98d5e903603d1b7763918dd5ed796ce87');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6843dc4a2cbdf88860cad4a8a5d23dd1bdbb689fca16ccaaa54d34f16e7dd9af', 1789946840185);

-- ----------------------------------------------------------------------
-- 20260921120000_rls_internal_config
-- ----------------------------------------------------------------------
-- Pin internal configuration tables to the runtime role with default-deny for
-- every other role. These tables hold deployment-wide policy (rate limits,
-- media/publication/webhook/cache policy, release manifests), not tenant rows,
-- so a tenant USING predicate does not apply. A literal USING (false) policy
-- is intentionally NOT used: the dashboard admin reads these tables directly
-- as indicate_runtime (see Drizzle runtime-config admin), so denying the
-- runtime role would break boot and admin reads. Instead FORCE ROW LEVEL
-- SECURITY plus a sole-accessor policy means indicate_runtime keeps working
-- while any other role — present or granted in the future — is denied by
-- default (no policy row matches), and PUBLIC holds no privileges at all.
ALTER TABLE public.rate_limit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.rate_limit_policies FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.rate_limit_policies FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_policies TO indicate_runtime;
ALTER TABLE public.shared_deployment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_deployment_config FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.shared_deployment_config FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.shared_deployment_config FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_deployment_config TO indicate_runtime;
ALTER TABLE public.media_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_policy FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.media_policy FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.media_policy FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_policy TO indicate_runtime;
ALTER TABLE public.publication_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_policy FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.publication_policy FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.publication_policy FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_policy TO indicate_runtime;
ALTER TABLE public.webhook_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_policy FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.webhook_policy FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.webhook_policy FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_policy TO indicate_runtime;
ALTER TABLE public.cache_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_policy FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.cache_policy FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.cache_policy FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cache_policy TO indicate_runtime;
ALTER TABLE public.runtime_config_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.runtime_config_revisions FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.runtime_config_revisions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_revisions TO indicate_runtime;
ALTER TABLE public.runtime_config_release_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_release_manifests FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.runtime_config_release_manifests FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.runtime_config_release_manifests FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_release_manifests TO indicate_runtime;
ALTER TABLE public.runtime_config_release_domain_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_release_domain_zones FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.runtime_config_release_domain_zones FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.runtime_config_release_domain_zones FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_release_domain_zones TO indicate_runtime;
ALTER TABLE public.runtime_config_backfill_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_backfill_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.runtime_config_backfill_runs FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.runtime_config_backfill_runs FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_backfill_runs TO indicate_runtime;
ALTER TABLE public.runtime_config_parity_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_config_parity_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY runtime_accessor ON public.runtime_config_parity_evidence FOR ALL TO indicate_runtime USING (true) WITH CHECK (true);
REVOKE ALL ON public.runtime_config_parity_evidence FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runtime_config_parity_evidence TO indicate_runtime;

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('c786ef81105ea8b3789d15426ca55bb712dc5bb51c30c3f908c08f8cba8c8363', 1789977020594);

-- ----------------------------------------------------------------------
-- 20260921130000_invoice_amount_manual
-- ----------------------------------------------------------------------
-- Nominal faktur manual: harga tunggal menjadi bawaan, bukan kunci.
--
-- invoice_create (kedua overload) dan invoice_issue sebelumnya menolak nominal
-- selain 550000; kini menerima bilangan bulat positif (>= 1) sehingga admin
-- dapat mencatat nominal manual dengan bawaan harga tunggal dari aplikasi.
-- CHECK invoices_amount_single diganti invoices_amount_positive; arsip lama
-- (semuanya 550000) tetap lolos check baru. invoice_reissue menyalin nominal
-- dari faktur asal sehingga tidak berubah.
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_amount_single;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_amount_positive CHECK (amount_idr > 0) NOT VALID;
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 1 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_paid_at, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), 'Transfer bank', p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt','paymentMethod'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at, 'paymentMethod', 'Transfer bank'), p_request_id, p_now);
  RETURN v_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.invoice_create(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_paid_at timestamp with time zone, p_note text, p_now timestamp with time zone, p_payment_method text DEFAULT 'Transfer bank')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text; v_method text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 1 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'paid_at required' USING ERRCODE = '42501';
  END IF;
  v_method := COALESCE(NULLIF(p_payment_method, ''), 'Transfer bank');
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_paid_at, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'paid', p_paid_at, nullif(p_note, ''), v_method, p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.create', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','paidAt','paymentMethod'], jsonb_build_object('number', v_number, 'amount', p_amount, 'paidAt', p_paid_at, 'paymentMethod', v_method), p_request_id, p_now);
  RETURN v_id;
END
$function$;
CREATE OR REPLACE FUNCTION indicate_private.invoice_issue(p_actor_id uuid, p_request_id text, p_organization_id uuid, p_amount integer, p_due_at timestamp with time zone, p_note text, p_now timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'indicate_private'
AS $function$
DECLARE v_id uuid := gen_random_uuid(); v_slug text; v_number text;
BEGIN
  IF NOT indicate_private.permission_has_platform_admin(p_actor_id) THEN
    RAISE EXCEPTION 'platform permission required' USING ERRCODE = '42501';
  END IF;
  SELECT slug INTO v_slug FROM public.organizations WHERE id = p_organization_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'organization required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount < 1 THEN
    RAISE EXCEPTION 'amount invalid' USING ERRCODE = '42501';
  END IF;
  IF p_due_at IS NULL OR p_due_at <= p_now THEN
    RAISE EXCEPTION 'due_at invalid' USING ERRCODE = '42501';
  END IF;
  v_number := 'IND-'
    || upper(substr(md5(v_slug), 1, 5))
    || '-' || to_char(p_now, 'YYMM-')
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
    || '-' || (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::integer, 1), '' ORDER BY s) FROM generate_series(1, 4) AS s);
  INSERT INTO public.invoices(id, organization_id, number, amount_idr, status, paid_at, due_at, billing_note, payment_method, created_by, version, created_at, updated_at)
  VALUES (v_id, p_organization_id, v_number, p_amount, 'unpaid', NULL, p_due_at, nullif(p_note, ''), 'Transfer bank', p_actor_id, 1, p_now, p_now);
  INSERT INTO public.audit_logs(organization_id, id, actor_type, actor_id, entry_point, action, target_type, target_id, outcome, changed_fields, after, request_id, occurred_at)
  VALUES (p_organization_id, gen_random_uuid(), 'user', p_actor_id::text, 'dashboard', 'invoice.issue', 'invoice', v_id::text, 'succeeded', ARRAY['number','amount','dueAt'], jsonb_build_object('number', v_number, 'amount', p_amount, 'dueAt', p_due_at), p_request_id, p_now);
  RETURN v_id;
END
$function$;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (145, 'invoice_amount_manual', 'sha256:c2890287772320e4d87771f54a84c23967426f445dcc56ecd282e313d60bfb00');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('a85233831af991411fc5c88b8b9b142b0be783b51a991dec501ec36ccb369920', 1790037182087);

-- ----------------------------------------------------------------------
-- 20260921140000_article_editorial_fields
-- ----------------------------------------------------------------------
-- Editorial P0/P1: dek, excerpt, canonical override, scheduled_at, status in_review/scheduled, article_revisions.
--
-- Kolom baru semuanya nullable sehingga backfill tidak diperlukan; arsip lama
-- memakai fallback runtime (dek/excerpt dari body, kanonis dari hostname+slug).
-- article_status bertambah 'in_review' dan 'scheduled' untuk alur review dan
-- jadwal terbit (penegakan jadwal oleh scheduler penerbitan, bukan migrasi ini).
-- article_revisions menyimpan snapshot isi per penyimpanan untuk diff/rollback;
-- ditulis jalur commit dasbor saat create dan saat konten berubah.
-- RLS + grant mengikuti pola article_site_view_days.
-- CATATAN APLIKASI: ALTER TYPE ... ADD VALUE tidak boleh di dalam blok
-- transaksi; terapkan berkas ini pernyataan-per-pernyataan (psql -f tanpa
-- -1, atau editor SQL Supabase), sesuai urutan journal.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TYPE public.article_status ADD VALUE 'in_review';
ALTER TYPE public.article_status ADD VALUE 'scheduled';
ALTER TABLE public.articles ADD COLUMN dek text;
ALTER TABLE public.articles ADD COLUMN excerpt text;
ALTER TABLE public.articles ADD COLUMN canonical_url text;
ALTER TABLE public.articles ADD COLUMN scheduled_at timestamp with time zone;
CREATE TABLE IF NOT EXISTS public.article_revisions (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  revision_number integer NOT NULL,
  title text NOT NULL,
  dek text,
  body text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT article_revisions_pk PRIMARY KEY (organization_id, id),
  CONSTRAINT article_revisions_id_unique UNIQUE (id),
  CONSTRAINT article_revisions_organization_article_number_unique UNIQUE (organization_id, article_id, revision_number),
  CONSTRAINT article_revisions_number_positive CHECK (revision_number > 0)
);
CREATE INDEX IF NOT EXISTS article_revisions_organization_article_idx
  ON public.article_revisions USING btree (organization_id, article_id, revision_number);
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_revisions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.article_revisions;
CREATE POLICY tenant_isolation ON public.article_revisions
  USING (organization_id = indicate_private.current_organization_id())
  WITH CHECK (organization_id = indicate_private.current_organization_id());
GRANT SELECT, INSERT ON public.article_revisions TO indicate_runtime;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (146, 'article_editorial_fields', 'sha256:b515681c5509093c1e6dace69cea95a3451810ecc81860138063407fa3070246');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('2881cbcdf206cbc5cf5fc9b11f3c29c2265f64b52a61c77221f4a72773bf96db', 1790039524606);

-- ----------------------------------------------------------------------
-- 20260922000000_article_body_json
-- ----------------------------------------------------------------------
-- TipTap structured content (expand phase): nullable body_json beside legacy body.
--
-- articles.body_json stores the TipTap document JSON; article_revisions.body_json
-- snapshots it per content save. Both columns stay nullable so no backfill is
-- required: existing plain-text articles keep body_json NULL and render through
-- the legacy markup path (ArticleBodyView), while new saves dual-write the
-- legacy body column (plain-text derivation) for search, excerpts, and RSS.
-- Dropping or backfilling body is a later contract release, not this migration.
-- RLS and grants follow the parent tables (no new policy needed for columns).
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.articles ADD COLUMN body_json jsonb;
ALTER TABLE public.article_revisions ADD COLUMN body_json jsonb;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (147, 'article_body_json', 'sha256:5488332ef5dc84138cc1f76b70e9dc10ac6f4fab007ca5230f72fb252fca0ffb');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('dbdd8783a227df74128cebbd173b6b02617d9a844e97c3ea9f917aa9a0d9bedb', 1790041899931);

-- ----------------------------------------------------------------------
-- 20260922010000_publisher_verification_evidence
-- ----------------------------------------------------------------------
-- Verification invariant at the database level: a verified publisher must cite evidence.
--
-- Mirrors the application rule in TenantBusinessService.publisherDecision, which
-- rejects submit/approve without an evidence reference. Declared NOT VALID so
-- this migration applies cleanly while legacy rows are remediated; run
-- VALIDATE CONSTRAINT after archiving unverified-evidence rows, then drop the
-- NOT VALID marker in a follow-up migration. New and updated rows are checked
-- immediately regardless of the marker.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.publishers ADD CONSTRAINT publishers_verified_requires_evidence CHECK (verification_status <> 'verified' OR evidence_reference IS NOT NULL) NOT VALID;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (148, 'publisher_verification_evidence', 'sha256:115d5c0eea5602a078db3c4e913f1b9b14d91f798b21103e280a5d07a94808e7');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('6ba561a9b520f7eb0253bcabd346b9471e449c376e590d06a486f1f733012fa5', 1790051392222);

-- ----------------------------------------------------------------------
-- 20260922020000_publisher_verification_evidence_rework
-- ----------------------------------------------------------------------
-- Drop the unscoped verification check: it evaluates rewritten legacy rows and
-- blocks unrelated mutations until remediation finishes. Replaced by a
-- status-scoped variant in a later migration once brand-publisher rows are
-- archived. Forward-only; re-adding a check never replays old violations.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.publishers DROP CONSTRAINT IF EXISTS publishers_verified_requires_evidence;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (149, 'publisher_verification_evidence_rework', 'sha256:c00672c0691a5a11e5ed66fbafea4399bd65a1223ef9c798ab1f631a6d82c7d3');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('f183751ed58091e15142f9cba63e1b0759231fbc764f321040c5eaf309191367', 1790053515810);

-- ----------------------------------------------------------------------
-- 20260922030000_publisher_verification_evidence_scoped
-- ----------------------------------------------------------------------
-- Verification invariant scoped to usable publishers: active + verified rows must cite evidence.
--
-- Archived rows are inert (hidden from creation, blocked for new articles, excluded
-- from public delivery joins) and keep their history untouched, so they are
-- exempt. Apply only after brand-publisher remediation; the check validates
-- existing rows on creation.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.publishers ADD CONSTRAINT publishers_verified_requires_evidence CHECK (status <> 'active' OR verification_status <> 'verified' OR evidence_reference IS NOT NULL);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (150, 'publisher_verification_evidence_scoped', 'sha256:a0e5414ffb0981f69339fb3d34ed015d18a7d41096e2a955649a4a53cf72b623');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('ddec465909aaebe73d4df6749b0c87b84430bb99bbd6cc66853512fb9e203a32', 1790053561883);

-- ----------------------------------------------------------------------
-- 20260922040000_retention_runs_organization
-- ----------------------------------------------------------------------
-- Retention evidence per organization for org-erasure proof.
--
-- `erasure_sweep()` inserts `retention_runs.organization_id`, but the table
-- has no such column (live proof 2026-09-22: id, category, purged_count,
-- started_at, finished_at), so the org-erasure evidence insert fails.
-- Expand phase: add a nullable column plus FK; existing rows keep NULL
-- (historic sweeps are global, not per-org), so no backfill is required.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
ALTER TABLE public.retention_runs ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (151, 'retention_runs_organization', 'sha256:a153ec7a1778444b010ca498714ac37a7f4142db829be0463312fbd97fcbf33e');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('c8d73727677b0e4223b4c1603a78c18fe23e042c35fdb85afffbc873ec109009', 1790084212471);

-- ----------------------------------------------------------------------
-- 20260922050000_retention_runs_organization_idx
-- ----------------------------------------------------------------------
-- Cover the retention evidence organization FK for per-org lookups.
--
-- The performance advisor flags `retention_runs_organization_id_fkey`
-- (migration 151) without a covering index. The table is tiny and
-- function-only, but per-org evidence reads should not seq-scan.
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE INDEX retention_runs_organization_idx ON public.retention_runs (organization_id);
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (152, 'retention_runs_organization_idx', 'sha256:a4ee25332ee95056b5eb4d7f118e6aebbe09eac1ec86781ddccc1d8b2dde0ba3');

INSERT INTO drizzle."__drizzle_migrations" ("hash", "created_at") VALUES ('8300ea22baecd3476641c50ec17c1196cd5267050f6ddb5e82b8bde889f448d0', 1790084212472);
COMMIT;

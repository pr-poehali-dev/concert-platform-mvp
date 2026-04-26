ALTER TABLE t_p17532248_concert_platform_mvp.venues
  ADD COLUMN IF NOT EXISTS yandex_org_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text DEFAULT '',
  ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS imported_from text DEFAULT '',
  ADD COLUMN IF NOT EXISTS claim_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid DEFAULT NULL;

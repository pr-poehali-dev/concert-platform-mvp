ALTER TABLE t_p17532248_concert_platform_mvp.venues
  ADD COLUMN IF NOT EXISTS schema_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS schema_name TEXT NOT NULL DEFAULT '';

CREATE TABLE t_p17532248_concert_platform_mvp.venue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venue_photos_venue_id ON t_p17532248_concert_platform_mvp.venue_photos(venue_id);
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.project_groups (
  id          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  title       text        NOT NULL DEFAULT '',
  description text        NOT NULL DEFAULT '',
  color       text        NOT NULL DEFAULT 'neon-purple',
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE t_p17532248_concert_platform_mvp.projects
  ADD COLUMN IF NOT EXISTS group_id uuid NULL;

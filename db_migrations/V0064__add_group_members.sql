CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.group_members (
  id          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  invited_by  uuid        NOT NULL,
  role        text        NOT NULL DEFAULT 'partner',
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id  ON t_p17532248_concert_platform_mvp.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON t_p17532248_concert_platform_mvp.group_members(group_id);

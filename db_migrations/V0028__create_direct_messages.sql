CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.direct_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id TEXT NOT NULL,
  sender_id     TEXT NOT NULL,
  sender_type   TEXT NOT NULL DEFAULT 'user',
  sender_name   TEXT NOT NULL DEFAULT '',
  sender_avatar TEXT NOT NULL DEFAULT '',
  sender_color  TEXT NOT NULL DEFAULT 'from-neon-purple to-neon-cyan',
  recipient_id  TEXT NOT NULL,
  text          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
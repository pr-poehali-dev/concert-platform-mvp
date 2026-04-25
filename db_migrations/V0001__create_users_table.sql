CREATE TABLE t_p17532248_concert_platform_mvp.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'venue')),
  city TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT 'from-neon-purple to-neon-cyan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
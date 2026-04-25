CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.email_verifications (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON t_p17532248_concert_platform_mvp.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON t_p17532248_concert_platform_mvp.email_verifications(user_id);

-- Добавляем поле email_verified в users (отдельно от verified = одобрен админом)
ALTER TABLE t_p17532248_concert_platform_mvp.users
  ADD COLUMN IF NOT EXISTS email_confirmed boolean NOT NULL DEFAULT false;

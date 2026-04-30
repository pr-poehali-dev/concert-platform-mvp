-- Почтовые аккаунты пользователей
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.mail_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL,
  email                TEXT NOT NULL,
  display_name         TEXT NOT NULL DEFAULT '',
  imap_host            TEXT NOT NULL,
  imap_port            INTEGER NOT NULL DEFAULT 993,
  imap_ssl             BOOLEAN NOT NULL DEFAULT TRUE,
  smtp_host            TEXT NOT NULL,
  smtp_port            INTEGER NOT NULL DEFAULT 465,
  smtp_ssl             BOOLEAN NOT NULL DEFAULT TRUE,
  username             TEXT NOT NULL,
  password_encrypted   TEXT NOT NULL,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_mail_accounts_user_id
  ON t_p17532248_concert_platform_mvp.mail_accounts(user_id);

-- Кэш заголовков писем
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.mail_cache (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL,
  folder               TEXT NOT NULL,
  uid                  BIGINT NOT NULL,
  subject              TEXT NOT NULL DEFAULT '',
  from_address         TEXT NOT NULL DEFAULT '',
  from_name            TEXT NOT NULL DEFAULT '',
  to_addresses         TEXT NOT NULL DEFAULT '',
  preview              TEXT NOT NULL DEFAULT '',
  is_read              BOOLEAN NOT NULL DEFAULT FALSE,
  has_attachment       BOOLEAN NOT NULL DEFAULT FALSE,
  date_at              TIMESTAMPTZ,
  cached_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, folder, uid)
);

CREATE INDEX IF NOT EXISTS idx_mail_cache_account_folder
  ON t_p17532248_concert_platform_mvp.mail_cache(account_id, folder, date_at DESC);

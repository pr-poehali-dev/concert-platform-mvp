-- Реквизиты и юридические данные пользователя/компании
ALTER TABLE t_p17532248_concert_platform_mvp.users
  ADD COLUMN IF NOT EXISTS company_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (company_type IN ('individual','ip','ooo','other')),
  ADD COLUMN IF NOT EXISTS legal_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS inn TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS kpp TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ogrn TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS actual_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_bik TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';

-- Таблица сотрудников компании
CREATE TABLE t_p17532248_concert_platform_mvp.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_in_company TEXT NOT NULL DEFAULT 'employee',
  avatar TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT 'from-neon-purple to-neon-cyan',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX idx_employees_company ON t_p17532248_concert_platform_mvp.employees(company_user_id);
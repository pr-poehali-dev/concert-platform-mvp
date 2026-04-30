
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.salary_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id  UUID NOT NULL,
  employee_id      UUID NOT NULL,
  period           VARCHAR(7) NOT NULL,  -- формат YYYY-MM
  base_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus            NUMERIC(12,2) NOT NULL DEFAULT 0,
  deduction        NUMERIC(12,2) NOT NULL DEFAULT 0,
  note             TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_user_id, employee_id, period)
);

CREATE INDEX IF NOT EXISTS idx_salary_company ON t_p17532248_concert_platform_mvp.salary_records(company_user_id, period);
CREATE INDEX IF NOT EXISTS idx_salary_employee ON t_p17532248_concert_platform_mvp.salary_records(employee_id);

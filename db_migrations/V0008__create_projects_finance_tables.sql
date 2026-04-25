-- Проекты / туры
CREATE TABLE t_p17532248_concert_platform_mvp.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  project_type TEXT NOT NULL DEFAULT 'single' CHECK (project_type IN ('single','tour')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','completed','cancelled')),
  date_start DATE,
  date_end DATE,
  city TEXT NOT NULL DEFAULT '',
  venue_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  -- Налоговая система
  tax_system TEXT NOT NULL DEFAULT 'none' CHECK (tax_system IN ('none','usn_6','usn_15','osn','npd')),
  -- Кэшированные суммы (обновляются при изменении строк)
  total_expenses_plan NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_expenses_fact NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_income_plan NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_income_fact NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Статьи расходов (план / факт)
CREATE TABLE t_p17532248_concert_platform_mvp.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  amount_plan NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_fact NUMERIC(14,2) NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Строки доходов (билеты по категориям)
CREATE TABLE t_p17532248_concert_platform_mvp.project_income_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'Стандарт',
  ticket_count INTEGER NOT NULL DEFAULT 0,
  ticket_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON t_p17532248_concert_platform_mvp.projects(user_id);
CREATE INDEX idx_expenses_project ON t_p17532248_concert_platform_mvp.project_expenses(project_id);
CREATE INDEX idx_income_project ON t_p17532248_concert_platform_mvp.project_income_lines(project_id);
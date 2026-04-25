ALTER TABLE t_p17532248_concert_platform_mvp.employees
ADD COLUMN IF NOT EXISTS access_permissions JSONB NOT NULL DEFAULT '{"canViewExpenses": true, "canViewIncome": true, "canViewSummary": true, "canEditExpenses": true, "canEditIncome": true}'::jsonb;

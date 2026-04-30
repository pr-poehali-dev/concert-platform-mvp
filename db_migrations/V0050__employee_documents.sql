
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.employee_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id  UUID NOT NULL,
  employee_id      UUID NOT NULL,
  doc_type         VARCHAR(30) NOT NULL CHECK (doc_type IN ('passport','inn','snils','contract','other')),
  file_name        TEXT NOT NULL,
  file_url         TEXT NOT NULL,
  file_size        INTEGER,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emp_docs_employee ON t_p17532248_concert_platform_mvp.employee_documents(employee_id);

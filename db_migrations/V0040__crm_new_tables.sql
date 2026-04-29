
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  industry text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'lead',
  revenue bigint NOT NULL DEFAULT 0,
  contact text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  company_name text NOT NULL DEFAULT '',
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'lead',
  amount bigint NOT NULL DEFAULT 0,
  probability int NOT NULL DEFAULT 30,
  assignee text NOT NULL DEFAULT '',
  deadline date,
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  assignee text NOT NULL DEFAULT '',
  deadline date,
  subtasks jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.crm_goals2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'revenue',
  target numeric NOT NULL DEFAULT 0,
  current_val numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  deadline date,
  owner text NOT NULL DEFAULT '',
  team text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now()
);

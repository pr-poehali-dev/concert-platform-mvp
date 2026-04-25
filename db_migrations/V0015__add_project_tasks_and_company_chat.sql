-- CRM-задачи внутри проекта (назначаются сотрудникам)
CREATE TABLE t_p17532248_concert_platform_mvp.project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    company_user_id UUID NOT NULL,           -- владелец/организатор (для фильтрации)
    assigned_to UUID,                         -- employee.id (NULL = не назначено)
    created_by UUID NOT NULL,                -- employee.id или user.id кто создал
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo',     -- todo | in_progress | review | done
    priority TEXT NOT NULL DEFAULT 'medium', -- low | medium | high | urgent
    due_date DATE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Внутренний чат компании (между сотрудниками и владельцем)
CREATE TABLE t_p17532248_concert_platform_mvp.company_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_user_id UUID NOT NULL,           -- к какой компании относится
    sender_id UUID NOT NULL,                 -- users.id или employees.id
    sender_type TEXT NOT NULL DEFAULT 'user', -- 'user' | 'employee'
    sender_name TEXT NOT NULL DEFAULT '',
    sender_avatar TEXT NOT NULL DEFAULT '',
    sender_color TEXT NOT NULL DEFAULT 'from-neon-purple to-neon-cyan',
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_tasks_project ON t_p17532248_concert_platform_mvp.project_tasks(project_id);
CREATE INDEX idx_project_tasks_assigned ON t_p17532248_concert_platform_mvp.project_tasks(assigned_to);
CREATE INDEX idx_company_messages_company ON t_p17532248_concert_platform_mvp.company_messages(company_user_id, created_at);

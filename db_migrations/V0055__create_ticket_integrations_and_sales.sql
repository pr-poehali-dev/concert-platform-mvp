-- Интеграции с билетными системами
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.ticket_integrations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL,
    project_id     UUID,
    provider       TEXT NOT NULL DEFAULT 'ticketscloud',
    name           TEXT NOT NULL DEFAULT '',
    api_key        TEXT NOT NULL DEFAULT '',
    event_id       TEXT NOT NULL DEFAULT '',
    webhook_secret TEXT NOT NULL DEFAULT '',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at   TIMESTAMP WITH TIME ZONE,
    meta           JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Данные о продажах билетов
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.ticket_sales (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL,
    project_id     UUID,
    provider       TEXT NOT NULL DEFAULT 'ticketscloud',
    event_id       TEXT NOT NULL DEFAULT '',
    order_id       TEXT NOT NULL DEFAULT '',
    ticket_type    TEXT NOT NULL DEFAULT '',
    quantity       INTEGER NOT NULL DEFAULT 0,
    price          NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'paid',
    buyer_name     TEXT NOT NULL DEFAULT '',
    buyer_email    TEXT NOT NULL DEFAULT '',
    sold_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    raw_payload    JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_integrations_user    ON t_p17532248_concert_platform_mvp.ticket_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_integrations_project ON t_p17532248_concert_platform_mvp.ticket_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_integration    ON t_p17532248_concert_platform_mvp.ticket_sales(integration_id);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_project        ON t_p17532248_concert_platform_mvp.ticket_sales(project_id);

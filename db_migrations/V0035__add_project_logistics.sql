-- Логистика проекта: билеты и отели для участников тура
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.project_logistics (
    id              uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid        NOT NULL,
    person_name     text        NOT NULL DEFAULT '',
    person_role     text        NOT NULL DEFAULT '',
    type            text        NOT NULL DEFAULT 'flight',
    status          text        NOT NULL DEFAULT 'needed',
    route_from      text        NOT NULL DEFAULT '',
    route_to        text        NOT NULL DEFAULT '',
    date_depart     date        NULL,
    date_return     date        NULL,
    booking_ref     text        NOT NULL DEFAULT '',
    price           numeric(12,2) NOT NULL DEFAULT 0,
    notes           text        NOT NULL DEFAULT '',
    file_url        text        NOT NULL DEFAULT '',
    file_name       text        NOT NULL DEFAULT '',
    created_by      uuid        NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_logistics_project_id_idx
    ON t_p17532248_concert_platform_mvp.project_logistics(project_id);

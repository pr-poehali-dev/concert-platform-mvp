-- Таблица задач по бронированию (для организатора)
CREATE TABLE t_p17532248_concert_platform_mvp.booking_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    project_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, done
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Чеклист статусов бронирования (для площадки)
CREATE TABLE t_p17532248_concert_platform_mvp.booking_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    venue_id UUID NOT NULL,
    step_key TEXT NOT NULL,        -- date_confirmed, contract_signed, rent_paid, timing_agreed, logistics_agreed
    step_title TEXT NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT false,
    note TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Добавляем conversation_id к бронированию (чтобы быстро открыть чат)
ALTER TABLE t_p17532248_concert_platform_mvp.venue_bookings
    ADD COLUMN IF NOT EXISTS conversation_id UUID;

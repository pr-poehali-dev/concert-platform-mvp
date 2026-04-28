-- Договоры (ЭДО)
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.contracts (
    id                uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id        uuid        NOT NULL,
    project_id        uuid        NULL,
    -- стороны
    organizer_id      uuid        NOT NULL,
    venue_user_id     uuid        NOT NULL,
    -- реквизиты на момент создания (снапшот)
    organizer_legal_name  text    NOT NULL DEFAULT '',
    organizer_inn         text    NOT NULL DEFAULT '',
    organizer_kpp         text    NOT NULL DEFAULT '',
    organizer_ogrn        text    NOT NULL DEFAULT '',
    organizer_address     text    NOT NULL DEFAULT '',
    organizer_bank_name   text    NOT NULL DEFAULT '',
    organizer_bank_account text   NOT NULL DEFAULT '',
    organizer_bank_bik    text    NOT NULL DEFAULT '',
    organizer_phone       text    NOT NULL DEFAULT '',
    venue_legal_name      text    NOT NULL DEFAULT '',
    venue_inn             text    NOT NULL DEFAULT '',
    venue_kpp             text    NOT NULL DEFAULT '',
    venue_ogrn            text    NOT NULL DEFAULT '',
    venue_address         text    NOT NULL DEFAULT '',
    venue_bank_name       text    NOT NULL DEFAULT '',
    venue_bank_account    text    NOT NULL DEFAULT '',
    venue_bank_bik        text    NOT NULL DEFAULT '',
    venue_phone           text    NOT NULL DEFAULT '',
    -- условия договора
    venue_name            text    NOT NULL DEFAULT '',
    event_date            date    NULL,
    event_time            text    NOT NULL DEFAULT '',
    artist                text    NOT NULL DEFAULT '',
    rental_amount         numeric(14,2) NOT NULL DEFAULT 0,
    venue_conditions      text    NOT NULL DEFAULT '',
    contract_number       text    NOT NULL DEFAULT '',
    -- статус
    status                text    NOT NULL DEFAULT 'draft',
    -- draft | sent | signed_venue | signed_organizer | signed | rejected
    organizer_signed_at   timestamptz NULL,
    venue_signed_at       timestamptz NULL,
    organizer_sign_code   text    NOT NULL DEFAULT '',
    venue_sign_code       text    NOT NULL DEFAULT '',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_booking_id_idx   ON t_p17532248_concert_platform_mvp.contracts(booking_id);
CREATE INDEX IF NOT EXISTS contracts_organizer_id_idx ON t_p17532248_concert_platform_mvp.contracts(organizer_id);
CREATE INDEX IF NOT EXISTS contracts_venue_user_id_idx ON t_p17532248_concert_platform_mvp.contracts(venue_user_id);

-- Счета на оплату
CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.invoices (
    id                uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id       uuid        NOT NULL,
    booking_id        uuid        NOT NULL,
    invoice_number    text        NOT NULL DEFAULT '',
    payer_legal_name  text        NOT NULL DEFAULT '',
    payer_inn         text        NOT NULL DEFAULT '',
    payee_legal_name  text        NOT NULL DEFAULT '',
    payee_inn         text        NOT NULL DEFAULT '',
    payee_bank_name   text        NOT NULL DEFAULT '',
    payee_bank_account text       NOT NULL DEFAULT '',
    payee_bank_bik    text        NOT NULL DEFAULT '',
    amount            numeric(14,2) NOT NULL DEFAULT 0,
    description       text        NOT NULL DEFAULT '',
    due_date          date        NULL,
    status            text        NOT NULL DEFAULT 'issued',
    -- issued | paid | cancelled
    paid_at           timestamptz NULL,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_contract_id_idx ON t_p17532248_concert_platform_mvp.invoices(contract_id);
CREATE INDEX IF NOT EXISTS invoices_booking_id_idx  ON t_p17532248_concert_platform_mvp.invoices(booking_id);

CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.venue_bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL,
  venue_id        uuid NOT NULL,
  organizer_id    uuid NOT NULL,
  venue_user_id   uuid NOT NULL,
  event_date      date NOT NULL,
  event_time      text NOT NULL DEFAULT '',
  artist          text NOT NULL DEFAULT '',
  age_limit       text NOT NULL DEFAULT '',
  expected_guests integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending',
  rental_amount   numeric(14,2),
  venue_conditions text NOT NULL DEFAULT '',
  organizer_response text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

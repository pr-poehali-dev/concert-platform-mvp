CREATE TABLE IF NOT EXISTS t_p17532248_concert_platform_mvp.venue_booking_tasks (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  venue_user_id uuid NOT NULL,
  assigned_to uuid NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date date NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_booking_tasks_booking_id ON t_p17532248_concert_platform_mvp.venue_booking_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_venue_booking_tasks_venue_user_id ON t_p17532248_concert_platform_mvp.venue_booking_tasks(venue_user_id);

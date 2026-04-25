-- Задачи для существующих подтверждённых бронирований без задач
INSERT INTO t_p17532248_concert_platform_mvp.booking_tasks (booking_id, project_id, title, description, sort_order)
SELECT b.id, b.project_id, t.title, t.description, t.sort_order
FROM t_p17532248_concert_platform_mvp.venue_bookings b
CROSS JOIN (VALUES
  (0, 'Заключение договора',     'Подготовить и подписать договор аренды площадки с обеих сторон'),
  (1, 'Согласование техрайдера', 'Передать технический райдер площадке и получить подтверждение'),
  (2, 'Оплата аренды',           'Произвести оплату аренды площадки согласно договору'),
  (3, 'Согласование тайминга',   'Согласовать время заезда, саундчека, начала и конца мероприятия'),
  (4, 'Логистика заезда/выезда', 'Уточнить условия заезда оборудования и выезда после мероприятия'),
  (5, 'Промо и реклама',         'Согласовать рекламные материалы и размещение афиш')
) AS t(sort_order, title, description)
WHERE b.status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM t_p17532248_concert_platform_mvp.booking_tasks bt WHERE bt.booking_id = b.id
  );

-- Чеклист для существующих подтверждённых бронирований без чеклиста
INSERT INTO t_p17532248_concert_platform_mvp.booking_checklist (booking_id, venue_id, step_key, step_title, is_done, sort_order)
SELECT b.id, b.venue_id, c.step_key, c.step_title, c.is_done, c.sort_order
FROM t_p17532248_concert_platform_mvp.venue_bookings b
CROSS JOIN (VALUES
  (0, 'date_confirmed',  'Дата подтверждена',    true),
  (1, 'contract_signed', 'Договор подписан',      false),
  (2, 'rent_paid',       'Аренда оплачена',       false),
  (3, 'timing_agreed',   'Тайминг согласован',    false),
  (4, 'logistics_agreed','Заезд/выезд согласован',false)
) AS c(sort_order, step_key, step_title, is_done)
WHERE b.status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM t_p17532248_concert_platform_mvp.booking_checklist bc WHERE bc.booking_id = b.id
  );

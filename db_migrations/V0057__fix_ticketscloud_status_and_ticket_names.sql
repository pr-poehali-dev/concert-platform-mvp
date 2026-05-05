-- Обновляем статус и ticket_type для уже загруженных заказов TicketsCloud
-- Статус done → paid
UPDATE t_p17532248_concert_platform_mvp.ticket_sales
SET status = 'paid'
WHERE provider = 'ticketscloud' AND status = 'reserved'
  AND (raw_payload::jsonb->>'status') = 'done';

-- Исправляем ticket_type — берём имя из sets_values по set_id
-- Для каждой записи парсим raw_payload и ищем имя категории
UPDATE t_p17532248_concert_platform_mvp.ticket_sales ts
SET ticket_type = sv.name
FROM (
  SELECT 
    s.id,
    COALESCE(
      s.raw_payload::jsonb->'values'->'sets_values'->split_part(s.order_id, '_', 2)->'name' #>> '{}',
      s.ticket_type
    ) as name
  FROM t_p17532248_concert_platform_mvp.ticket_sales s
  WHERE s.provider = 'ticketscloud'
    AND s.ticket_type ~ '^[0-9a-f]{20,}$'
) sv
WHERE ts.id = sv.id AND sv.name IS NOT NULL AND sv.name != ts.ticket_type;

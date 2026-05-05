-- Исправляем ticket_type: меняем ID на человеческое имя из raw_payload.values.sets_values
UPDATE t_p17532248_concert_platform_mvp.ticket_sales ts
SET ticket_type = sv_name.name
FROM (
  SELECT 
    ts2.id,
    -- Берём имя из sets_values по ключу = ticket_type (который сейчас является set_id)
    ts2.raw_payload::jsonb -> 'values' -> 'sets_values' -> ts2.ticket_type ->> 'name' AS name
  FROM t_p17532248_concert_platform_mvp.ticket_sales ts2
  WHERE ts2.provider = 'ticketscloud'
    AND ts2.ticket_type ~ '^[0-9a-f]{20,}$'
    AND ts2.raw_payload::jsonb -> 'values' -> 'sets_values' -> ts2.ticket_type ->> 'name' IS NOT NULL
) sv_name
WHERE ts.id = sv_name.id
  AND sv_name.name IS NOT NULL
  AND sv_name.name != '';

-- Также обновляем note-маркер в project_income_lines если там тоже ID вместо имени
UPDATE t_p17532248_concert_platform_mvp.project_income_lines pil
SET category = ts_agg.ticket_type
FROM (
  SELECT DISTINCT ON (ticket_type_old)
    ticket_type_old,
    ticket_type
  FROM (
    SELECT
      CASE WHEN raw_payload::jsonb -> 'values' -> 'sets_values' -> order_id_part ->> 'name' IS NOT NULL
        THEN order_id_part
        ELSE NULL
      END as ticket_type_old,
      raw_payload::jsonb -> 'values' -> 'sets_values' -> order_id_part ->> 'name' as ticket_type
    FROM (
      SELECT 
        raw_payload,
        split_part(order_id, '_', 2) as order_id_part
      FROM t_p17532248_concert_platform_mvp.ticket_sales
      WHERE provider = 'ticketscloud'
    ) sub
  ) mapped
  WHERE ticket_type_old IS NOT NULL AND ticket_type IS NOT NULL
) ts_agg
WHERE pil.category = ts_agg.ticket_type_old
  AND pil.category ~ '^[0-9a-f]{20,}$';

-- Пересчитываем total_income_plan и total_income_fact для всех проектов
-- которые были созданы через импорт из TC и имеют нулевые суммы несмотря на данные в строках
UPDATE t_p17532248_concert_platform_mvp.projects p
SET
  total_income_plan = COALESCE((
    SELECT SUM(ticket_count::numeric * ticket_price)
    FROM t_p17532248_concert_platform_mvp.project_income_lines
    WHERE project_id = p.id
  ), 0),
  total_income_fact = COALESCE((
    SELECT SUM(sold_count::numeric * ticket_price)
    FROM t_p17532248_concert_platform_mvp.project_income_lines
    WHERE project_id = p.id
  ), 0),
  updated_at = NOW()
WHERE total_income_plan = 0
  AND EXISTS (
    SELECT 1 FROM t_p17532248_concert_platform_mvp.project_income_lines
    WHERE project_id = p.id AND ticket_count > 0
  );

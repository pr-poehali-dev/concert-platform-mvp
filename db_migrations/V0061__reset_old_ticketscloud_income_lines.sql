-- Обнуляем старые строки с форматом note 'ticketscloud:{integration_id}' (без set_id)
-- Новая синхронизация создаст правильные строки с форматом 'ticketscloud:{integration_id}:{set_id}'
UPDATE t_p17532248_concert_platform_mvp.project_income_lines
SET ticket_count = 0, sold_count = 0
WHERE note ~ '^ticketscloud:[a-f0-9\-]{36}$';

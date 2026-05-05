-- Исправляем категории в строках доходов проекта (синхронизированных из TicketsCloud)
UPDATE t_p17532248_concert_platform_mvp.project_income_lines
SET category = 'VIP'
WHERE category = '69e5542e79a19d0b66848452' AND note LIKE 'ticketscloud:%';

UPDATE t_p17532248_concert_platform_mvp.project_income_lines
SET category = 'Танцпол'
WHERE category = '69e55446a5419b5aa5a7a6c8' AND note LIKE 'ticketscloud:%';

UPDATE t_p17532248_concert_platform_mvp.project_income_lines
SET category = 'VIP'
WHERE category = '69e5541da5419b5aa5a7a6c4' AND note LIKE 'ticketscloud:%';

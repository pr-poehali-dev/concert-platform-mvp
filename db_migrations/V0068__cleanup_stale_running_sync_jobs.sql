UPDATE t_p17532248_concert_platform_mvp.sync_jobs
SET status = 'error', error = 'Завершён принудительно: зависший running-джоб', finished_at = NOW()
WHERE status = 'running' AND started_at < NOW() - INTERVAL '10 minutes';
-- 배포 시: {{PROJECT_REF}} 와 {{BATCH_SECRET}} 치환 필요 (README 참고)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('whybuy-daily-krx', '0 8 * * 1-5', $$
  select net.http_post(
    url := 'https://{{PROJECT_REF}}.supabase.co/functions/v1/daily-batch',
    headers := '{"Content-Type":"application/json","x-batch-secret":"{{BATCH_SECRET}}"}'::jsonb,
    body := '{"market":"KRX"}'::jsonb
  );
$$);

select cron.schedule('whybuy-daily-us', '0 22 * * 1-5', $$
  select net.http_post(
    url := 'https://{{PROJECT_REF}}.supabase.co/functions/v1/daily-batch',
    headers := '{"Content-Type":"application/json","x-batch-secret":"{{BATCH_SECRET}}"}'::jsonb,
    body := '{"market":"US"}'::jsonb
  );
$$);

-- 0002가 {{PROJECT_REF}}/{{BATCH_SECRET}} 플레이스홀더 상태로 적용된 것을 정리.
-- 실제 cron 등록은 대시보드 SQL Editor에서 실값으로 수행 (README 참고).
do $$
begin
  begin
    perform cron.unschedule('whybuy-daily-krx');
  exception when others then null;
  end;
  begin
    perform cron.unschedule('whybuy-daily-us');
  exception when others then null;
  end;
end $$;

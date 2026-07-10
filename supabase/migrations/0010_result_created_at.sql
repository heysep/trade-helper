-- 신호 unread 커서용 정밀 타임스탬프 (날짜 경계 UTC 문제 해결)
alter table public.check_results
  add column created_at timestamptz not null default now();

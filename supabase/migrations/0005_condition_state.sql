-- 감시 항목 상태 + 출처 (user가 고른 항목은 재검증 때 보존)
alter table public.check_conditions
  add column condition_state text not null default 'ok' check (condition_state in ('ok','warning','broken')),
  add column source text not null default 'ai' check (source in ('user','ai'));

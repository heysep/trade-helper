-- 감시/일정 항목의 정적 설명 (왜 이 항목이 내 가설에 중요한지)
alter table public.check_conditions
  add column detail text;

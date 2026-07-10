-- 감시 항목: 어느 논점에서 나왔는지 + 상태 사유 한 줄
alter table public.check_conditions
  add column reason_label text,
  add column state_note text;

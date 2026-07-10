-- 시장 공통 매크로 일정 (전 유저 공유, 주 1회 GPT 웹검색으로 갱신)
create table public.market_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  label text not null,
  region text not null default 'global' check (region in ('US','CN','KR','EU','JP','global')),
  importance text not null default 'normal' check (importance in ('high','normal')),
  fetched_at timestamptz not null default now(),
  unique (event_date, label)
);

alter table public.market_events enable row level security;
create policy "events readable" on public.market_events for select to authenticated using (true);
-- 쓰기는 service role 전용 (daily-batch)

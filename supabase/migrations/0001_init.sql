create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','paid')),
  expo_push_token text,
  created_at timestamptz not null default now()
);

create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  market text not null check (market in ('KRX','US')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ticker, market)
);

create table public.theses (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  buy_reason text not null,
  break_conditions text not null,
  add_conditions text,
  target_horizon text not null,
  soundness_review jsonb,
  status text not null default 'active' check (status in ('active','watching','reduce','exit','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  outcome text check (outcome in ('success','fail'))
);

create table public.check_conditions (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.theses(id) on delete cascade,
  label text not null,
  event_type text not null check (event_type in ('earnings','guidance','metric','custom')),
  next_check_date date,
  status text not null default 'open' check (status in ('open','done'))
);

create table public.daily_scans (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  market text not null check (market in ('KRX','US')),
  scan_date date not null,
  summary text not null,
  change_level text not null check (change_level in ('none','minor','major')),
  sources jsonb not null default '[]',
  unique (ticker, market, scan_date)
);

create table public.check_results (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.theses(id) on delete cascade,
  check_date date not null,
  opinion text not null check (opinion in ('hold','watch','reduce','exit')),
  rationale text not null,
  scan_ref uuid references public.daily_scans(id),
  unique (thesis_id, check_date)
);

create table public.usage_daily (
  usage_date date primary key,
  web_search_calls int not null default 0,
  eval_calls int not null default 0
);

-- free plan: max 5 holdings
create or replace function public.enforce_holding_limit()
returns trigger language plpgsql security definer as $$
declare cnt int; user_plan text;
begin
  select coalesce(p.plan, 'free') into user_plan from public.profiles p where p.id = new.user_id;
  if user_plan is null or user_plan = 'free' then
    select count(*) into cnt from public.holdings where user_id = new.user_id;
    if cnt >= 5 then
      raise exception 'FREE_PLAN_LIMIT: free plan allows up to 5 holdings';
    end if;
  end if;
  return new;
end $$;
create trigger holdings_limit before insert on public.holdings
  for each row execute function public.enforce_holding_limit();

-- auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.holdings enable row level security;
alter table public.theses enable row level security;
alter table public.check_conditions enable row level security;
alter table public.daily_scans enable row level security;
alter table public.check_results enable row level security;
alter table public.usage_daily enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own holdings" on public.holdings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own theses" on public.theses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own conditions" on public.check_conditions for all
  using (exists (select 1 from public.theses t where t.id = thesis_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.theses t where t.id = thesis_id and t.user_id = auth.uid()));
create policy "scans readable" on public.daily_scans for select to authenticated using (true);
create policy "own results" on public.check_results for select
  using (exists (select 1 from public.theses t where t.id = thesis_id and t.user_id = auth.uid()));
-- daily_scans/check_results/usage_daily writes are service-role only (Edge Functions)

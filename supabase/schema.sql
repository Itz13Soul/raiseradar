create extension if not exists "pgcrypto";

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  company_key text not null,
  amount_value numeric,
  currency text,
  amount_raw text,
  stage text,
  investors text[] not null default '{}',
  sector text,
  city text,
  announced_date date,
  use_of_funds text,
  founder_name text,
  source_url text not null unique,
  source_name text not null,
  hiring jsonb,
  is_sample boolean not null default false,
  reviewed boolean not null default false,
  raw_extraction jsonb,
  created_at timestamptz not null default now()
);

create index if not exists deals_company_key_idx on public.deals (company_key);
create index if not exists deals_announced_idx on public.deals (announced_date desc nulls last);
create index if not exists deals_filters_idx on public.deals (city, sector, stage);

alter table public.deals enable row level security;
drop policy if exists "public read deals" on public.deals;
create policy "public read deals" on public.deals for select using (true);

create table if not exists public.note_usage (
  day date primary key,
  count integer not null default 0
);
alter table public.note_usage enable row level security;

create or replace function public.bump_note_usage(cap integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.note_usage (day, count) values (current_date, 1)
  on conflict (day) do update set count = public.note_usage.count + 1
  returning count into current_count;
  return current_count <= cap;
end;
$$;

revoke execute on function public.bump_note_usage(integer) from public, anon, authenticated;
grant execute on function public.bump_note_usage(integer) to service_role;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  audience text not null check (audience in ('job_seeker','sales','recruiter')),
  roles text[] not null default '{}' check (cardinality(roles) <= 10),
  skills text[] not null default '{}' check (cardinality(skills) <= 20),
  cities text[] not null default '{}' check (cardinality(cities) <= 10),
  sectors text[] not null default '{}' check (cardinality(sectors) <= 10),
  stages text[] not null default '{}' check (cardinality(stages) <= 11),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own profile delete" on public.profiles;
create policy "own profile select" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "own profile insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profile delete" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.shortlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  status text not null default 'saved' check (status in ('saved','contacted','replied','meeting','closed','passed')),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, deal_id)
);
create index if not exists shortlist_user_idx on public.shortlist (user_id, updated_at desc);
create index if not exists shortlist_deal_idx on public.shortlist (deal_id);
alter table public.shortlist enable row level security;
drop policy if exists "own shortlist select" on public.shortlist;
drop policy if exists "own shortlist insert" on public.shortlist;
drop policy if exists "own shortlist update" on public.shortlist;
drop policy if exists "own shortlist delete" on public.shortlist;
create policy "own shortlist select" on public.shortlist for select to authenticated using ((select auth.uid()) = user_id);
create policy "own shortlist insert" on public.shortlist for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own shortlist update" on public.shortlist for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own shortlist delete" on public.shortlist for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.alert_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  frequency text not null default 'weekly' check (frequency in ('daily','weekly')),
  min_score integer not null default 40 check (min_score between 0 and 100),
  active boolean not null default true,
  last_sent_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);
alter table public.alert_subscriptions enable row level security;
drop policy if exists "own alert select" on public.alert_subscriptions;
drop policy if exists "own alert insert" on public.alert_subscriptions;
drop policy if exists "own alert update" on public.alert_subscriptions;
drop policy if exists "own alert delete" on public.alert_subscriptions;
create policy "own alert select" on public.alert_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "own alert insert" on public.alert_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own alert update" on public.alert_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own alert delete" on public.alert_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

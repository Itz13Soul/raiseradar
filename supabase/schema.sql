
create extension if not exists "pgcrypto";

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  company_key text not null,                 -- lowercased, alphanumerics only, for de-duplication
  amount_value numeric,                      -- full units as stated (no currency conversion)
  currency text,                             -- USD | INR | OTHER, as stated in the source
  amount_raw text,                           -- amount exactly as written in the source
  stage text,
  investors text[] not null default '{}',
  sector text,
  city text,
  announced_date date,
  use_of_funds text,
  founder_name text,                         -- only if named in the source
  source_url text not null unique,
  source_name text not null,
  hiring jsonb,                              -- predicted roles, outreach note, channel (see src/lib/schema.ts)
  is_sample boolean not null default false,  -- true = demo row, labelled on screen
  created_at timestamptz not null default now()
);

create index if not exists deals_company_key_idx on public.deals (company_key);
create index if not exists deals_announced_idx on public.deals (announced_date desc nulls last);
create index if not exists deals_filters_idx on public.deals (city, sector, stage);

alter table public.deals enable row level security;
drop policy if exists "public read deals" on public.deals;
create policy "public read deals" on public.deals for select using (true);

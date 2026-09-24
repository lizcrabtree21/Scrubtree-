-- Surgeon directory, procedure library, and surgeon preference records.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`),
-- after 0001 and 0002. The anon key the app uses can't run DDL, so this
-- can't be applied automatically.

alter table public.surgeons add column if not exists specialty text not null default '';
alter table public.surgeons add column if not exists is_demo boolean not null default false;

create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  definition text not null default '',
  summary text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.procedure_steps (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references public.procedures (id) on delete cascade,
  step_order int not null,
  title text not null,
  description text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (procedure_id, step_order)
);

create table public.surgeon_prefs (
  id uuid primary key default gen_random_uuid(),
  surgeon_id uuid not null references public.surgeons (id) on delete cascade,
  procedure_id uuid not null references public.procedures (id) on delete cascade,
  instrument_set text not null default '',
  equipment jsonb not null default '[]'::jsonb,
  sutures text not null default '',
  table_orientation text not null default '',
  table_angle int not null default 0 check (table_angle >= 0 and table_angle < 360),
  consoles jsonb not null default '[]'::jsonb,
  notes text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (surgeon_id, procedure_id)
);

create table public.surgeon_pref_steps (
  surgeon_pref_id uuid not null references public.surgeon_prefs (id) on delete cascade,
  step_id uuid not null references public.procedure_steps (id) on delete cascade,
  instrument text not null default '',
  primary key (surgeon_pref_id, step_id)
);

-- ---------------------------------------------------------------------------
-- Row level security: any active user (or admin) can read; only admins
-- can write. Reuses is_admin() from 0001.
-- ---------------------------------------------------------------------------

create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and status = 'active'
  );
$$;

alter table public.procedures enable row level security;
alter table public.procedure_steps enable row level security;
alter table public.surgeon_prefs enable row level security;
alter table public.surgeon_pref_steps enable row level security;

create policy "Active users can view procedures"
  on public.procedures
  for select
  to authenticated
  using (public.is_active_user() or public.is_admin());

create policy "Admins manage procedures"
  on public.procedures
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Active users can view procedure steps"
  on public.procedure_steps
  for select
  to authenticated
  using (public.is_active_user() or public.is_admin());

create policy "Admins manage procedure steps"
  on public.procedure_steps
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Active users can view surgeon prefs"
  on public.surgeon_prefs
  for select
  to authenticated
  using (public.is_active_user() or public.is_admin());

create policy "Admins manage surgeon prefs"
  on public.surgeon_prefs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Active users can view surgeon pref steps"
  on public.surgeon_pref_steps
  for select
  to authenticated
  using (public.is_active_user() or public.is_admin());

create policy "Admins manage surgeon pref steps"
  on public.surgeon_pref_steps
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

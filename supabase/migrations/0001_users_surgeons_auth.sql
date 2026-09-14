-- Users, surgeons, first-user-is-admin bootstrap, and row level security.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`) for
-- this project. It cannot be applied automatically from the app because
-- the app only holds the anon key, which has no DDL privileges.

create type public.user_role as enum ('nurse', 'surgeon', 'admin');
create type public.user_status as enum ('pending', 'active', 'rejected');

create table public.surgeons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role public.user_role not null,
  surgeon_id uuid references public.surgeons (id) on delete set null,
  status public.user_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bootstrap: create the profile row automatically when someone signs up.
-- The very first person to ever sign up becomes an active admin; everyone
-- after that keeps the role they requested at sign-up and starts pending.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
  requested_role public.user_role;
begin
  -- Serialize concurrent sign-ups so at most one can win "first user".
  perform pg_advisory_xact_lock(hashtext('public.users:first_user_bootstrap'));

  select not exists (select 1 from public.users) into is_first_user;

  requested_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::public.user_role,
    'nurse'
  );

  insert into public.users (id, name, role, surgeon_id, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when is_first_user then 'admin'::public.user_role else requested_role end,
    nullif(new.raw_user_meta_data ->> 'surgeon_id', '')::uuid,
    case when is_first_user then 'active'::public.user_status else 'pending'::public.user_status end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.surgeons enable row level security;

-- security definer helper avoids infinite recursion when a users-table
-- policy needs to know whether the current caller is an admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Users can view own row, admins view all"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "Users can update own row, admins update all"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- A non-admin can update their own row (e.g. their name) but must not be
-- able to grant themselves a different role/status/surgeon by editing it.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.surgeon_id := old.surgeon_id;
  end if;
  return new;
end;
$$;

create trigger enforce_role_status_immutable_for_non_admins
  before update on public.users
  for each row execute function public.prevent_self_privilege_escalation();

-- Surgeons: any signed-in user can read the list (e.g. to populate a
-- dropdown at sign-up); only admins can add/edit/remove surgeons.
create policy "Authenticated users can view surgeons"
  on public.surgeons
  for select
  to authenticated
  using (true);

create policy "Admins manage surgeons"
  on public.surgeons
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

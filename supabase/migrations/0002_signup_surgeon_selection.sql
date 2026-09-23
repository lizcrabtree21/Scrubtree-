-- Lets a sign-up choosing role = surgeon either link to an existing
-- surgeons row or create their own, without loosening the surgeons RLS
-- policy (still admin-only for direct writes). The new surgeons row is
-- created by the same SECURITY DEFINER trigger that creates the profile
-- row, so it's scoped to sign-up only, not to arbitrary later writes.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`),
-- after 0001_users_surgeons_auth.sql.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
  requested_role public.user_role;
  chosen_surgeon_id uuid;
  new_surgeon_name text;
begin
  perform pg_advisory_xact_lock(hashtext('public.users:first_user_bootstrap'));

  select not exists (select 1 from public.users) into is_first_user;

  requested_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::public.user_role,
    'nurse'
  );

  chosen_surgeon_id := nullif(new.raw_user_meta_data ->> 'surgeon_id', '')::uuid;
  new_surgeon_name := nullif(trim(new.raw_user_meta_data ->> 'new_surgeon_name'), '');

  -- Only surgeons may create/link a surgeons row at sign-up.
  if requested_role = 'surgeon' and chosen_surgeon_id is null and new_surgeon_name is not null then
    insert into public.surgeons (name) values (new_surgeon_name)
    returning id into chosen_surgeon_id;
  elsif requested_role <> 'surgeon' then
    chosen_surgeon_id := null;
  end if;

  insert into public.users (id, name, role, surgeon_id, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when is_first_user then 'admin'::public.user_role else requested_role end,
    chosen_surgeon_id,
    case when is_first_user then 'active'::public.user_status else 'pending'::public.user_status end
  );

  return new;
end;
$$;

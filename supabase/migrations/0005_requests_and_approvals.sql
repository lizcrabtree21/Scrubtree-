-- Edit requests and approvals: nurses (and anyone who isn't the target
-- surgeon or an admin) propose changes instead of writing directly;
-- surgeons approve changes to their own preference records, admins
-- approve everything. Self-edits by the target surgeon or an admin still
-- save immediately, with an already-approved row logged for audit.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`),
-- after 0001-0004.

create type public.request_type as enum ('add', 'edit');
create type public.request_target_type as enum ('surgeon_pref', 'procedure');
create type public.request_status as enum ('pending', 'approved', 'rejected');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  type public.request_type not null,
  target_type public.request_target_type not null,
  target_id uuid,
  surgeon_id uuid references public.surgeons (id) on delete cascade,
  payload jsonb not null,
  submitted_by uuid not null references public.users (id) on delete cascade,
  status public.request_status not null default 'pending',
  decided_by uuid references public.users (id),
  read_by uuid[] not null default '{}',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.requests enable row level security;

-- Reusable check: is the current user the surgeon this request targets?
create or replace function public.is_target_surgeon(target_surgeon_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select target_surgeon_id is not null and exists (
    select 1 from public.users where id = auth.uid() and surgeon_id = target_surgeon_id
  );
$$;

create policy "Active users can submit requests"
  on public.requests
  for insert
  to authenticated
  with check (public.is_active_user() and submitted_by = auth.uid());

create policy "Submitter, target surgeon, or admin can view requests"
  on public.requests
  for select
  to authenticated
  using (
    submitted_by = auth.uid()
    or public.is_admin()
    or public.is_target_surgeon(surgeon_id)
  );

create policy "Submitter, target surgeon, or admin can update requests"
  on public.requests
  for update
  to authenticated
  using (
    submitted_by = auth.uid()
    or public.is_admin()
    or public.is_target_surgeon(surgeon_id)
  )
  with check (
    submitted_by = auth.uid()
    or public.is_admin()
    or public.is_target_surgeon(surgeon_id)
  );

-- A plain submitter (not the target surgeon, not an admin) may only ever
-- toggle read_by (to mark a notification read) - not the decision itself.
create or replace function public.enforce_request_decision_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if not (public.is_admin() or public.is_target_surgeon(old.surgeon_id)) then
    new.type := old.type;
    new.target_type := old.target_type;
    new.target_id := old.target_id;
    new.surgeon_id := old.surgeon_id;
    new.payload := old.payload;
    new.submitted_by := old.submitted_by;
    new.status := old.status;
    new.decided_by := old.decided_by;
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end;
$$;

create trigger enforce_request_decision_authority_trigger
  before update on public.requests
  for each row execute function public.enforce_request_decision_authority();

-- ---------------------------------------------------------------------------
-- Let the target surgeon write their own preference records directly
-- (the "self-edit saves immediately" exception). Procedures/procedure_steps
-- stay admin-only, per this stage's spec - only surgeon_prefs gets this.
-- ---------------------------------------------------------------------------

create policy "Surgeons manage their own preference records"
  on public.surgeon_prefs
  for all
  to authenticated
  using (public.is_target_surgeon(surgeon_id))
  with check (public.is_target_surgeon(surgeon_id));

create policy "Surgeons manage their own preference steps"
  on public.surgeon_pref_steps
  for all
  to authenticated
  using (
    exists (
      select 1 from public.surgeon_prefs sp
      where sp.id = surgeon_pref_steps.surgeon_pref_id
        and public.is_target_surgeon(sp.surgeon_id)
    )
  )
  with check (
    exists (
      select 1 from public.surgeon_prefs sp
      where sp.id = surgeon_pref_steps.surgeon_pref_id
        and public.is_target_surgeon(sp.surgeon_id)
    )
  );

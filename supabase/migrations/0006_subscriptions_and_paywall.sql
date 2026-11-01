-- Stage 6: individual nurse subscriptions via Stripe, 30-day trial, surgeons
-- and admins exempt. Stripe Checkout/webhook/portal calls happen in Supabase
-- Edge Functions (this app has no Next.js server code); this migration only
-- adds the table that tracks billing state and the RLS gate on the content
-- tables that are actually worth paying for.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`),
-- after 0001-0005.

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete'
);

create table public.subscriptions (
  user_id uuid primary key references public.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Only the user themself (or an admin) can ever read this - and only ever
-- read. Every write comes from a Supabase Edge Function using the service
-- role key (Stripe webhooks, checkout session creation), which bypasses RLS
-- entirely, or from the trigger below. No authenticated-role write policy
-- exists on purpose: a user must never be able to grant themselves access by
-- writing their own subscription row.
create policy "Users view own subscription, admins view all"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Starting the trial: when an admin approves a nurse (status -> active),
-- give them 30 days from that moment. Surgeons and admins never get a row
-- here at all - has_active_access() below treats that as "exempt", not
-- "unpaid".
-- ---------------------------------------------------------------------------

create or replace function public.start_trial_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' and new.role = 'nurse' then
    insert into public.subscriptions (user_id, status, trial_ends_at)
    values (new.id, 'trialing', now() + interval '30 days')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger start_trial_on_approval_trigger
  after update on public.users
  for each row execute function public.start_trial_on_approval();

-- ---------------------------------------------------------------------------
-- The paywall itself, as an RLS-enforced helper: admins and surgeons always
-- have access; everyone else needs an active subscription or a trial that
-- hasn't expired yet. This is the real enforcement - any client-side "you're
-- locked out" screen is UX only, same as the rest of this app.
-- ---------------------------------------------------------------------------

create or replace function public.has_active_access()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'surgeon')
    or exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid()
        and (
          s.status = 'active'
          or (s.status = 'trialing' and s.trial_ends_at > now())
        )
    );
$$;

drop policy "Active users can view procedures" on public.procedures;
create policy "Active users with access can view procedures"
  on public.procedures
  for select
  to authenticated
  using (public.is_active_user() and public.has_active_access());

drop policy "Active users can view procedure steps" on public.procedure_steps;
create policy "Active users with access can view procedure steps"
  on public.procedure_steps
  for select
  to authenticated
  using (public.is_active_user() and public.has_active_access());

drop policy "Active users can view surgeon prefs" on public.surgeon_prefs;
create policy "Active users with access can view surgeon prefs"
  on public.surgeon_prefs
  for select
  to authenticated
  using (public.is_active_user() and public.has_active_access());

drop policy "Active users can view surgeon pref steps" on public.surgeon_pref_steps;
create policy "Active users with access can view surgeon pref steps"
  on public.surgeon_pref_steps
  for select
  to authenticated
  using (public.is_active_user() and public.has_active_access());

-- Admins always have access via has_active_access(), so the separate
-- "public.is_admin()" clause these four policies used to have is no longer
-- needed - has_active_access() already covers it. Note this does narrow
-- surgeons' own write policies not at all: "Admins manage procedures" etc.
-- (admin-write-all) and "Surgeons manage their own preference records"
-- (from 0005) are untouched, so a surgeon can still edit their own prefs
-- directly regardless of billing, which only ever applies to nurses.

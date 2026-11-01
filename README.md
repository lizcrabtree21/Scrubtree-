This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase setup

This app uses Supabase for auth and data. Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (see `.env.example`).

The database schema (enums, `surgeons`/`users` tables, the first-signup
bootstrap trigger, and row level security policies) lives in
`supabase/migrations/`. Apply the migrations once, in order, against your
project — the anon key the app uses has no permission to run DDL, so this
can't happen automatically:

- Supabase dashboard → SQL Editor → paste each file's contents in order → Run, or
- `supabase db push` if you have the Supabase CLI linked to this project.

Schema summary:

- `public.surgeons (id, name, created_at)`
- `public.users (id → auth.users, name, role: nurse|surgeon|admin, surgeon_id → surgeons, status: pending|active|rejected, created_at)`
- A trigger on `auth.users` inserts the matching `public.users` row on
  sign-up. The very first user ever to sign up becomes `role = admin`,
  `status = active`; everyone after that gets the role they chose at
  sign-up and starts at `status = pending`. A surgeon signing up can link
  to an existing `surgeons` row or create their own (also done inside the
  trigger, so the `surgeons` table itself stays admin-write-only via RLS).
- RLS: a user can read/update only their own row; admins can read/update
  every row. A second trigger blocks non-admins from changing their own
  `role`/`status`/`surgeon_id` even though they can update their row.
- `/signup`, `/login`, and `/logout` pages handle auth.
- Pending/rejected users see a "waiting for approval" / "access declined"
  screen instead of the app (`src/app/app-gate.tsx`); this is UX only —
  the real enforcement is the RLS policies above, which apply no matter
  what the client requests.
- `/admin` lists pending sign-ups for an admin to grant or deny.

### Surgeon directory, procedure library, and preference records

- `public.procedures (id, name, category, definition, summary, is_demo)`
- `public.procedure_steps (id, procedure_id → procedures, step_order, title, description, is_demo)`
- `public.surgeons` gains `specialty` and `is_demo` columns.
- `public.surgeon_prefs (id, surgeon_id → surgeons, procedure_id → procedures, instrument_set, equipment jsonb, sutures, table_orientation, table_angle, consoles jsonb, notes, is_demo)`
- `public.surgeon_pref_steps (surgeon_pref_id → surgeon_prefs, step_id → procedure_steps, instrument)`
- RLS: any user with `status = 'active'` (or an admin) can read these
  tables; only admins can insert/update/delete, via the same `is_admin()`
  helper as the users table, plus a new `is_active_user()` helper.
- `0004_seed_demo_data.sql` seeds two example surgeons, two example
  procedures with steps, and one example preference record, all flagged
  `is_demo = true`. The step content is a generic placeholder — the
  original prototype file wasn't available when this was written, so it's
  not a copy of it; replace it via the admin forms once you've reviewed it.
- `/surgeons` (directory, searchable) → `/surgeons/[id]` (a surgeon's
  saved preferences vs. library procedures they don't have one for yet) →
  `/surgeons/[id]/procedures/[procedureId]` (the detail page: instrument
  set, equipment, sutures, a theatre set-up diagram, and a
  general-steps/surgeon-steps toggle showing the instrument per step).
- `/procedures` (library, by category, searchable) → `/procedures/[id]`
  (definition, overview, general steps, and links to any surgeon-specific
  versions).
- Forms: `/admin/surgeons/new` (still admin-only), `/admin/procedures/new`
  and `/admin/procedures/[procedureId]/edit`, and `/admin/surgeon-prefs/new`
  (linked from a surgeon's "not yet set up" list) /
  `/admin/surgeon-prefs/[prefId]/edit`. Despite the URL prefix these last
  four are open to any active user now — see Stage 4 below for what
  actually happens on submit.

### Edit requests and approvals

- `public.requests (id, type: add|edit, target_type: surgeon_pref|procedure, target_id, surgeon_id, payload jsonb, submitted_by → users, status: pending|approved|rejected, decided_by → users, read_by uuid[], submitted_at, updated_at)`.
- Submitting the surgeon-preference or procedure form now branches on who's
  submitting: the target surgeon editing their own preference record, or
  an admin editing anything, writes straight to `surgeon_prefs`/`procedures`
  as before and logs an already-`approved` row in `requests` for the audit
  trail. Anyone else (a nurse, or a surgeon proposing a change to a
  colleague's record) instead gets a pending row in `requests` and a "sent
  for approval" confirmation — nothing changes live until it's approved.
- RLS: any active user can insert a request as themselves; a request is
  visible to its submitter, its target surgeon (via a new
  `is_target_surgeon()` helper matching `users.surgeon_id`), or an admin.
  A trigger (`enforce_request_decision_authority`) means only the target
  surgeon or an admin can actually change a request's status/decision —
  everyone else's updates are limited to toggling `read_by` (marking their
  own notifications read).
- `surgeon_prefs`/`surgeon_pref_steps` gain a policy letting the target
  surgeon write their own rows directly (needed for the self-edit and
  self-approval paths); `procedures`/`procedure_steps` stay admin-only, so
  a surgeon can never approve a procedure-library change themselves.
- `/approvals` — a surgeon sees pending requests targeting them; an admin
  sees every pending request plus the last 15 decisions; everyone sees
  their own submitted requests and their outcome. Approving copies the
  request's payload into the live table (insert for "add," update for
  "edit"); declining only changes the request's own status.
- A notification bell in the top bar (every page, via `src/app/layout.tsx`)
  shows anything visible to you (per the same RLS) that you haven't
  opened yet — a pending request awaiting your decision, or the outcome of
  something you submitted. Opening it marks the current batch read.

### Email notifications

- `supabase/functions/notify-change` — a Supabase Edge Function, not part
  of the Next.js app, so the Resend API key it uses never exists in
  browser code or the deployed app's environment variables at all; it's
  set only as an Edge Function secret (`RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`) via the Supabase dashboard.
- It's invoked by **Database Webhooks** (Database → Webhooks in the
  Supabase dashboard) configured on `public.requests` (insert + update)
  and `public.users` (insert) — set up through the dashboard rather than
  SQL, since that's what lets Supabase authenticate the call to the Edge
  Function without a secret ever needing to be typed in by hand.
- It sends a generic message and a link back to the app only — never any
  preference/procedure content — when: a new request is created pending
  (emails the target surgeon, if any, and every admin), a request is
  decided (emails whoever submitted it), or a new sign-up is pending
  (emails every admin). A direct self-edit never creates a pending
  request in the first place, so it never emails anyone.
- A failed send is logged (visible in the function's logs) and swallowed,
  never thrown - and since the webhook that invokes the function fires
  asynchronously after the database change has already committed, a bad
  Resend key structurally cannot block or break the underlying action.

### Subscriptions (Stripe)

- Individual, per-nurse billing: $14.95 AUD/month, 30-day free trial, surgeons
  and admins exempt entirely (they never see a paywall or a bill). Nurses pay
  because they're the ones consuming surgeon preference data the surgeons
  contribute for free - the two-sided-marketplace design behind that choice.
- `public.subscriptions (user_id → users, stripe_customer_id, stripe_subscription_id, status: trialing|active|past_due|canceled|incomplete, trial_ends_at, current_period_end, updated_at)`.
  RLS: a user can only ever read their own row (or an admin reads all); there
  is no authenticated-role write policy at all - every write comes from a
  Supabase Edge Function using the service role key, or the trigger below.
- `start_trial_on_approval` trigger: the moment an admin approves a nurse
  (`users.status` flips to `active`), it inserts a `trialing` row with
  `trial_ends_at = now() + 30 days`. Surgeons and admins never get a row.
- `has_active_access()` is the real paywall - a SECURITY DEFINER helper used
  inside RLS: true for admins and surgeons unconditionally, otherwise true
  only if the caller's subscription is `active`, or `trialing` with
  `trial_ends_at` still in the future. The `procedures`, `procedure_steps`,
  `surgeon_prefs`, and `surgeon_pref_steps` select policies now require this
  in addition to `is_active_user()` - that's the content nurses are actually
  paying for. The `surgeons` table (names/specialties only, no clinical
  content) stays open to any active user, same as before.
- `src/components/RequirePaidAccess.tsx` wraps the surgeon directory and
  procedure library pages with a "your trial has ended, subscribe" screen -
  UX only, same caveat as `RequireActive`: the RLS policy above is what
  actually enforces it no matter what the client requests.
- `/billing` shows trial days remaining, a Subscribe button, or (once
  subscribed) a Manage billing button - and the account panel in the top bar
  shows a running "N days left in trial" / "subscribed" / "trial ended" badge
  for nurses.
- Three Supabase Edge Functions do the actual Stripe work, since this app has
  no Next.js server code and a Stripe *secret* key must never reach the
  browser:
  - `create-checkout-session` - creates a Stripe customer on first use,
    starts a Checkout Session (`mode: "subscription"`) for the one Scrubtree
    price, returns its URL.
  - `create-portal-session` - opens a Stripe-hosted Customer Portal session
    (update card, cancel) for the signed-in nurse's existing customer.
  - `stripe-webhook` - the actual source of truth. Verifies the
    `Stripe-Signature` header and syncs `subscriptions.status` /
    `current_period_end` on `checkout.session.completed`,
    `customer.subscription.updated`/`created`/`deleted`, and
    `invoice.payment_failed`. The Checkout success-page redirect is never
    trusted on its own - a closed tab or someone hitting that URL directly
    without paying must not grant access, so only the webhook flips billing
    state.
- Requires these Edge Function secrets (Project Settings → Edge Functions,
  entered directly in the dashboard - never typed into chat, same as the
  Resend key in Stage 5): `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (the
  `price_...` for the $14.95 AUD/month plan), and `STRIPE_WEBHOOK_SECRET`
  (from the webhook's settings once it's pointed at the `stripe-webhook`
  function's URL in the Stripe dashboard). `create-checkout-session` and
  `create-portal-session` are deployed with JWT verification on (the caller
  must be a signed-in Scrubtree user); `stripe-webhook` is deployed with it
  off, since Stripe has no Supabase session to send.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

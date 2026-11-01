// Supabase Edge Function: stripe-webhook
//
// Stripe calls this directly (not through Supabase Database Webhooks, and
// not JWT-verified - Stripe has no Supabase session). It's the single
// source of truth for subscription state: the Checkout success-page
// redirect is just UX, since a closed tab or a direct hit on the success
// URL without paying must never grant access on its own.
//
// Requires these Edge Function secrets:
//   STRIPE_SECRET_KEY      - sk_test_... (shared with the other functions)
//   STRIPE_WEBHOOK_SECRET  - whsec_..., from the webhook's settings in the
//                            Stripe dashboard once it's pointed at this
//                            function's URL
// Deploy with --no-verify-jwt (or verify_jwt: false) since Stripe can't
// send a Supabase JWT.

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" });

function mapStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "incomplete":
      return "incomplete";
    default:
      // incomplete_expired, canceled, unpaid, paused - all read as "not
      // paying" from this app's point of view.
      return "canceled";
  }
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const periodEnd = subscription.items.data[0]?.current_period_end;

  await admin
    .from("subscriptions")
    .update({
      stripe_subscription_id: subscription.id,
      status: mapStatus(subscription.status),
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);
}

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await admin
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", customerId);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await admin
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_customer_id", customerId)
            .neq("status", "canceled");
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe-webhook handler error", event.type, err);
  }

  return new Response("ok", { status: 200 });
});

// Supabase Edge Function: create-portal-session
//
// Called by the app when a subscribed nurse clicks "Manage billing". Opens
// a Stripe-hosted Customer Portal session where they can update their card
// or cancel - same reasoning as create-checkout-session for why this has to
// live server-side rather than in the Next.js app.
//
// Requires the STRIPE_SECRET_KEY Edge Function secret (shared with
// create-checkout-session). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
// provided automatically.

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://scrubtree.vercel.app";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return new Response("Unauthorized", { status: 401 });

  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return new Response("No billing account yet", { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${APP_URL}/billing`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

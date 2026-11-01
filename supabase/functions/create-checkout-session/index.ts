// Supabase Edge Function: create-checkout-session
//
// Called by the app (authenticated fetch, Supabase JWT in the Authorization
// header) when a nurse whose trial has ended clicks "Subscribe". Creates a
// Stripe customer on first use, starts a Checkout Session for the one
// Scrubtree price, and hands back its URL for the browser to redirect to.
// Lives here rather than in the Next.js app because this app has no server
// code at all, and a Checkout Session must be created with the Stripe
// *secret* key, which must never reach the browser.
//
// Called directly from the browser, so it needs CORS headers (including on
// the OPTIONS preflight) - without them the browser blocks the request
// before it ever reaches here and the app just sees "Failed to fetch".
//
// Requires these Edge Function secrets (Project Settings -> Edge Functions):
//   STRIPE_SECRET_KEY  - sk_test_... (or sk_live_... in production)
//   STRIPE_PRICE_ID    - price_... for the $14.95 AUD/month plan
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://scrubtree.vercel.app";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const userId = authData.user.id;
    const email = authData.user.email;

    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("role, status")
      .eq("id", userId)
      .single();
    if (profileError || !profile) {
      return new Response("Profile not found", { status: 404, headers: corsHeaders });
    }
    if (profile.role !== "nurse" || profile.status !== "active") {
      return new Response("Not eligible for billing", { status: 400, headers: corsHeaders });
    }

    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    // A stored customer ID can be stale (e.g. left over from a previous
    // Stripe secret key pointing at a different account), so verify it
    // still exists on *this* account before reusing it, rather than letting
    // Stripe reject the whole checkout session over a bad customer ID.
    let customerId: string | null = null;
    if (sub?.stripe_customer_id) {
      try {
        await stripe.customers.retrieve(sub.stripe_customer_id);
        customerId = sub.stripe_customer_id;
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await admin
        .from("subscriptions")
        .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${APP_URL}/billing?checkout=success`,
      cancel_url: `${APP_URL}/billing?checkout=canceled`,
      client_reference_id: userId,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error", err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

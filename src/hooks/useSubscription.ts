"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { Subscription } from "@/lib/database";

export function useSubscription() {
  const { profile, loading: profileLoading } = useProfile();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [rowLoading, setRowLoading] = useState(true);
  // Captured once per fetch (not read live during render) so this hook stays
  // pure - see https://react.dev/reference/rules/components-and-hooks-must-be-pure.
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!profile || profile.role !== "nurse") {
      Promise.resolve().then(() => {
        setSubscription(null);
        setFetchedAt(Date.now());
        setRowLoading(false);
      });
      return;
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setRowLoading(true);
    });
    supabase
      .from("subscriptions")
      .select(
        "user_id, stripe_customer_id, stripe_subscription_id, status, trial_ends_at, current_period_end, updated_at",
      )
      .eq("user_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSubscription(data);
        setFetchedAt(Date.now());
        setRowLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const exempt = profile?.role === "admin" || profile?.role === "surgeon";
  const trialEndsAt = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at)
    : null;
  const trialDaysRemaining = trialEndsAt && fetchedAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - fetchedAt) / 86_400_000))
    : null;
  const isTrialing =
    subscription?.status === "trialing" && !!trialEndsAt && !!fetchedAt && trialEndsAt.getTime() > fetchedAt;

  const hasAccess = exempt || subscription?.status === "active" || isTrialing;

  return {
    subscription,
    loading: profileLoading || rowLoading,
    exempt,
    hasAccess,
    isTrialing,
    trialDaysRemaining,
  };
}

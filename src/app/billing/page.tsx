"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RequireActive from "@/components/RequireActive";
import { useSubscription } from "@/hooks/useSubscription";
import { openBillingPortal, startCheckout } from "@/lib/billing";

function CheckoutNotice() {
  const params = useSearchParams();
  const checkout = params.get("checkout");
  if (checkout === "success") {
    return (
      <p className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
        Payment received - this can take a few seconds to show below.
      </p>
    );
  }
  if (checkout === "canceled") {
    return (
      <p className="rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        Checkout canceled - no charge was made.
      </p>
    );
  }
  return null;
}

function BillingContent() {
  const { subscription, loading, exempt, hasAccess, isTrialing, trialDaysRemaining } =
    useSubscription();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setWorking(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-24">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <Link href="/" className="text-sm font-medium text-brand underline">
          Back home
        </Link>
      </div>

      <Suspense fallback={null}>
        <CheckoutNotice />
      </Suspense>

      {exempt ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Surgeon and admin accounts don&apos;t need a subscription.
        </p>
      ) : subscription?.status === "active" ? (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You&apos;re subscribed - $14.95 AUD/month.
          </p>
          <button
            type="button"
            disabled={working}
            onClick={() => run(openBillingPortal)}
            className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            Manage billing
          </button>
        </>
      ) : isTrialing ? (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} left in your free
            trial.
          </p>
          <button
            type="button"
            disabled={working}
            onClick={() => run(startCheckout)}
            className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            Subscribe - $14.95 AUD/month
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {subscription?.status === "past_due"
              ? "Your last payment failed - update your card to keep access."
              : !hasAccess
                ? "Your free trial has ended."
                : "No active subscription yet."}
          </p>
          <button
            type="button"
            disabled={working}
            onClick={() =>
              run(subscription?.stripe_customer_id ? openBillingPortal : startCheckout)
            }
            className="self-start rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {subscription?.stripe_customer_id ? "Update billing" : "Subscribe - $14.95 AUD/month"}
          </button>
        </>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </main>
  );
}

export default function BillingPage() {
  return (
    <RequireActive>
      <BillingContent />
    </RequireActive>
  );
}

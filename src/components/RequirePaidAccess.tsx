"use client";

import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";

// Gates the pages that hold the actual content nurses pay for (the surgeon
// directory and procedure library). This is UX only, same as RequireActive -
// the real enforcement is the has_active_access() check inside the RLS
// policies on procedures/surgeon_prefs/etc, which apply no matter what the
// client requests.
export default function RequirePaidAccess({ children }: { children: React.ReactNode }) {
  const { loading, hasAccess } = useSubscription();

  if (loading) {
    return <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>;
  }

  if (!hasAccess) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">Your free trial has ended</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Subscribe for $14.95 AUD/month to keep using the surgeon directory and procedure
          library.
        </p>
        <Link
          href="/billing"
          className="mx-auto rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Go to billing
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}

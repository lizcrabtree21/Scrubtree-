"use client";

import { useProfile } from "@/hooks/useProfile";

type Props = { children: React.ReactNode };

export default function AppGate({ children }: Props) {
  const { session, profile, loading } = useProfile();

  if (loading) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>;
  }

  // Logged-out visitors see the public landing content (children).
  if (!session) {
    return <>{children}</>;
  }

  if (profile?.status === "pending") {
    return (
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-xl font-semibold">Waiting for approval</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Thanks for signing up. Your request has been sent to an admin —
          you&apos;ll get access to Scrubtree once they approve your account.
        </p>
      </div>
    );
  }

  if (profile?.status === "rejected") {
    return (
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-xl font-semibold">Access declined</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          An admin has declined this account&apos;s access request. Contact
          your administrator if you think this is a mistake.
        </p>
      </div>
    );
  }

  // status === "active" (includes the bootstrap admin).
  return <>{children}</>;
}

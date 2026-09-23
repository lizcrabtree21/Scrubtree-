"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { UserProfile } from "@/lib/database";

export default function AdminPage() {
  const { session, profile, loading } = useProfile();
  const [pending, setPending] = useState<UserProfile[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    const { data, error: fetchError } = await supabase
      .from("users")
      .select("id, name, role, surgeon_id, status, created_at")
      .eq("status", "pending")
      .order("created_at");
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPending(data ?? []);
    }
    setPendingLoading(false);
  }, []);

  useEffect(() => {
    if (profile?.role === "admin") {
      Promise.resolve().then(() => loadPending());
    }
  }, [profile, loadPending]);

  async function decide(userId: string, status: "active" | "rejected") {
    setActingOn(userId);
    setError("");
    const { error: updateError } = await supabase
      .from("users")
      .update({ status })
      .eq("id", userId);
    setActingOn(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPending((rows) => rows.filter((r) => r.id !== userId));
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-24">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!session || profile?.role !== "admin") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-24">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          This page is only available to admins.
        </p>
        <Link href="/" className="font-medium underline">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pending sign-ups</h1>
        <Link href="/" className="text-sm font-medium underline">
          Back home
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {pendingLoading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No pending sign-ups.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-4 rounded border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium">{u.name || "(no name)"}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {u.role} &middot;{" "}
                  {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actingOn === u.id}
                  onClick={() => decide(u.id, "active")}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                >
                  Grant access
                </button>
                <button
                  type="button"
                  disabled={actingOn === u.id}
                  onClick={() => decide(u.id, "rejected")}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-white/[.08]"
                >
                  Deny
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

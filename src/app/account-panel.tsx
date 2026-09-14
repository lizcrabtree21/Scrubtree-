"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import type { UserProfile } from "@/lib/database";

export default function AccountPanel() {
  const { session, loading } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!session) {
      Promise.resolve().then(() => setProfile(null));
      return;
    }
    supabase
      .from("users")
      .select("id, name, role, surgeon_id, status, created_at")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  if (loading) return null;

  if (!session) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
        <Link href="/signup" className="font-medium underline">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-zinc-600 dark:text-zinc-400">
        Signed in as <span className="font-medium">{session.user.email}</span>
        {profile && (
          <>
            {" "}
            &middot; {profile.name} &middot; {profile.role} &middot;{" "}
            <span
              className={
                profile.status === "active"
                  ? "text-green-600"
                  : profile.status === "rejected"
                    ? "text-red-600"
                    : "text-yellow-600"
              }
            >
              {profile.status}
            </span>
          </>
        )}
      </p>
      <Link href="/logout" className="font-medium underline">
        Log out
      </Link>
    </div>
  );
}

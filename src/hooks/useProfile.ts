"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import type { UserProfile } from "@/lib/database";

export function useProfile() {
  const { session, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      Promise.resolve().then(() => {
        setProfile(null);
        setProfileLoading(false);
      });
      return;
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setProfileLoading(true);
    });
    supabase
      .from("users")
      .select("id, name, role, surgeon_id, status, created_at")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data);
        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return {
    session,
    profile,
    loading: sessionLoading || (Boolean(session) && profileLoading),
  };
}

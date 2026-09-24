"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";

type Props = {
  children: React.ReactNode;
  adminOnly?: boolean;
};

export default function RequireActive({ children, adminOnly = false }: Props) {
  const router = useRouter();
  const { session, profile, loading } = useProfile();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (profile && profile.status !== "active") {
      router.replace("/");
      return;
    }
    if (adminOnly && profile && profile.role !== "admin") {
      router.replace("/");
    }
  }, [loading, session, profile, adminOnly, router]);

  if (loading || !session || !profile || profile.status !== "active") {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  if (adminOnly && profile.role !== "admin") {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  return <>{children}</>;
}

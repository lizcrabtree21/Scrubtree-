"use client";

import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";

export default function AccountPanel() {
  const { session, profile, loading } = useProfile();

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
      <div className="flex flex-wrap items-center gap-4">
        {profile?.status === "active" && (
          <>
            <Link href="/surgeons" className="font-medium underline">
              Surgeons
            </Link>
            <Link href="/procedures" className="font-medium underline">
              Procedures
            </Link>
          </>
        )}
        {profile?.role === "admin" && (
          <>
            <Link href="/admin" className="font-medium underline">
              Admin
            </Link>
            <Link href="/admin/surgeons/new" className="font-medium underline">
              Add surgeon
            </Link>
            <Link href="/admin/procedures/new" className="font-medium underline">
              Add procedure
            </Link>
          </>
        )}
        <Link href="/logout" className="font-medium underline">
          Log out
        </Link>
      </div>
    </div>
  );
}

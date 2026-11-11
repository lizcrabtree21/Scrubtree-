"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { session, profile } = useProfile();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-black/[.04] dark:hover:bg-white/[.08]"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <nav className="relative flex h-full w-64 flex-col gap-1 overflow-y-auto bg-secondary p-4 text-secondary-foreground">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg font-semibold">
                <Image src="/logo-mark.png" alt="" width={28} height={29} aria-hidden="true" />
                Scrubtree
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="rounded-md p-1 hover:bg-white/10"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M4 4l10 10M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <Link
              href="/"
              onClick={close}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
            >
              Home
            </Link>

            {!session && (
              <>
                <Link
                  href="/login"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Sign up
                </Link>
              </>
            )}

            {profile?.status === "active" && (
              <>
                <Link
                  href="/surgeons"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Surgeons
                </Link>
                <Link
                  href="/procedures"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Procedures
                </Link>
                <Link
                  href="/approvals"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Approvals
                </Link>
              </>
            )}

            {profile?.role === "nurse" && profile.status === "active" && (
              <Link
                href="/billing"
                onClick={close}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
              >
                Billing
              </Link>
            )}

            {profile?.role === "admin" && (
              <>
                <div className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-white/60">
                  Admin
                </div>
                <Link
                  href="/admin"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Pending sign-ups
                </Link>
                <Link
                  href="/admin/surgeons/new"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Add surgeon
                </Link>
                <Link
                  href="/admin/procedures/new"
                  onClick={close}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Add procedure
                </Link>
              </>
            )}

            {session && (
              <Link
                href="/logout"
                onClick={close}
                className="mt-auto rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
              >
                Log out
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

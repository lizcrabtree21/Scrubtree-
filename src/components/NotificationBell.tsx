"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { EditRequest } from "@/lib/database";

function summarize(req: EditRequest): string {
  const kind = req.target_type === "surgeon_pref" ? "preference record" : "procedure";
  if (req.status === "pending") {
    return `A ${req.type} request for a ${kind} is awaiting your review.`;
  }
  if (req.status === "approved") {
    return `Your ${req.type} request for a ${kind} was approved.`;
  }
  return `Your ${req.type} request for a ${kind} was declined.`;
}

export default function NotificationBell() {
  const { session, profile } = useProfile();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("requests")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(30);
    setRequests((data as EditRequest[] | null) ?? []);
  }, []);

  useEffect(() => {
    if (session) Promise.resolve().then(() => load());
  }, [session, load]);

  if (!session || !profile) return null;

  const unread = requests.filter((r) => !r.read_by.includes(profile.id));

  async function markAllRead() {
    if (!profile) return;
    const toMark = unread;
    if (toMark.length === 0) return;
    await Promise.all(
      toMark.map((r) =>
        supabase
          .from("requests")
          .update({ read_by: [...r.read_by, profile.id] })
          .eq("id", r.id),
      ),
    );
    setRequests((rs) =>
      rs.map((r) =>
        toMark.some((t) => t.id === r.id)
          ? { ...r, read_by: [...r.read_by, profile.id] }
          : r,
      ),
    );
  }

  function toggleOpen() {
    setOpen((wasOpen) => {
      if (!wasOpen) markAllRead();
      return !wasOpen;
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      >
        🔔
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {requests.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No notifications.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
              {requests.slice(0, 15).map((r) => (
                <li key={r.id} className="text-sm">
                  <p>{summarize(r)}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(r.updated_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/approvals"
            className="mt-3 block text-sm font-medium underline"
            onClick={() => setOpen(false)}
          >
            Go to approvals
          </Link>
        </div>
      )}
    </div>
  );
}

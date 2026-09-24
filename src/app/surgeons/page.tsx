"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RequireActive from "@/components/RequireActive";
import type { Surgeon } from "@/lib/database";

function SurgeonDirectory() {
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase
      .from("surgeons")
      .select("id, name, specialty, is_demo, created_at")
      .order("name")
      .then(({ data }) => {
        setSurgeons(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = surgeons.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Surgeons</h1>
        <Link href="/" className="text-sm font-medium underline">
          Home
        </Link>
      </div>
      <input
        type="search"
        placeholder="Search by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No surgeons found.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                href={`/surgeons/${s.id}`}
                className="flex items-center justify-between rounded border border-zinc-200 px-4 py-3 hover:bg-black/[.02] dark:border-zinc-800 dark:hover:bg-white/[.04]"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {s.specialty}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function SurgeonsPage() {
  return (
    <RequireActive>
      <SurgeonDirectory />
    </RequireActive>
  );
}

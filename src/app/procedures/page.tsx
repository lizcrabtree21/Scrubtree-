"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RequireActive from "@/components/RequireActive";
import type { Procedure } from "@/lib/database";

function ProcedureLibrary() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase
      .from("procedures")
      .select("id, name, category, definition, summary, is_demo, created_at")
      .order("category")
      .order("name")
      .then(({ data }) => {
        setProcedures(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = procedures.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const byCategory = useMemo(() => {
    const groups = new Map<string, Procedure[]>();
    for (const p of filtered) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Procedure library</h1>
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
      ) : byCategory.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No procedures found.
        </p>
      ) : (
        byCategory.map(([category, list]) => (
          <section key={category} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {category}
            </h2>
            <ul className="flex flex-col gap-2">
              {list.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/procedures/${p.id}`}
                    className="block rounded border border-zinc-200 px-4 py-3 hover:bg-black/[.02] dark:border-zinc-800 dark:hover:bg-white/[.04]"
                  >
                    <p className="font-medium">{p.name}</p>
                    {p.summary && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {p.summary}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

export default function ProceduresPage() {
  return (
    <RequireActive>
      <ProcedureLibrary />
    </RequireActive>
  );
}

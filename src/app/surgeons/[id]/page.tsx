"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RequireActive from "@/components/RequireActive";
import { useProfile } from "@/hooks/useProfile";
import type { Procedure, Surgeon, SurgeonPref } from "@/lib/database";

type PrefWithProcedure = SurgeonPref & { procedure: Procedure };

function SurgeonOverview({ surgeonId }: { surgeonId: string }) {
  const { profile } = useProfile();
  const [surgeon, setSurgeon] = useState<Surgeon | null>(null);
  const [prefs, setPrefs] = useState<PrefWithProcedure[]>([]);
  const [allProcedures, setAllProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: surgeonData }, { data: prefData }, { data: procData }] =
        await Promise.all([
          supabase
            .from("surgeons")
            .select("id, name, specialty, is_demo, created_at")
            .eq("id", surgeonId)
            .single(),
          supabase
            .from("surgeon_prefs")
            .select("*, procedure:procedures(*)")
            .eq("surgeon_id", surgeonId),
          supabase
            .from("procedures")
            .select("id, name, category, definition, summary, is_demo, created_at")
            .order("name"),
        ]);
      setSurgeon(surgeonData ?? null);
      setPrefs((prefData as PrefWithProcedure[] | null) ?? []);
      setAllProcedures(procData ?? []);
      setLoading(false);
    }
    load();
  }, [surgeonId]);

  if (loading) {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  if (!surgeon) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
        <p>Surgeon not found.</p>
        <Link href="/surgeons" className="font-medium underline">
          Back to surgeons
        </Link>
      </main>
    );
  }

  const withPrefsIds = new Set(prefs.map((p) => p.procedure_id));
  const withoutPrefs = allProcedures.filter((p) => !withPrefsIds.has(p.id));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{surgeon.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {surgeon.specialty}
          </p>
        </div>
        <Link href="/surgeons" className="text-sm font-medium underline">
          All surgeons
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Saved preferences</h2>
        {prefs.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No saved preference records yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {prefs.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/surgeons/${surgeon.id}/procedures/${p.procedure_id}`}
                  className="block rounded border border-zinc-200 px-4 py-3 hover:bg-black/[.02] dark:border-zinc-800 dark:hover:bg-white/[.04]"
                >
                  <p className="font-medium">{p.procedure.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {p.procedure.category}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Not yet set up</h2>
        {withoutPrefs.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Every library procedure has a preference record for this surgeon.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {withoutPrefs.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {p.category}
                  </p>
                </div>
                {profile?.role === "admin" && (
                  <Link
                    href={`/admin/surgeon-prefs/new?surgeonId=${surgeon.id}&procedureId=${p.id}`}
                    className="text-sm font-medium underline"
                  >
                    Add preferences
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function SurgeonPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireActive>
      <SurgeonOverview surgeonId={params.id} />
    </RequireActive>
  );
}

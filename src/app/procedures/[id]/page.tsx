"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RequireActive from "@/components/RequireActive";
import type { Procedure, ProcedureStep, Surgeon } from "@/lib/database";

function ProcedureDetail({ procedureId }: { procedureId: string }) {
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [surgeonsWithPrefs, setSurgeonsWithPrefs] = useState<Surgeon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: procedureData }, { data: stepData }, { data: prefData }] =
        await Promise.all([
          supabase
            .from("procedures")
            .select("id, name, category, definition, summary, is_demo, created_at")
            .eq("id", procedureId)
            .single(),
          supabase
            .from("procedure_steps")
            .select("id, procedure_id, step_order, title, description, is_demo, created_at")
            .eq("procedure_id", procedureId)
            .order("step_order"),
          supabase
            .from("surgeon_prefs")
            .select("surgeon:surgeons(*)")
            .eq("procedure_id", procedureId),
        ]);
      setProcedure(procedureData ?? null);
      setSteps(stepData ?? []);
      setSurgeonsWithPrefs(
        ((prefData as { surgeon: Surgeon }[] | null) ?? []).map(
          (row) => row.surgeon,
        ),
      );
      setLoading(false);
    }
    load();
  }, [procedureId]);

  if (loading) {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  if (!procedure) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
        <p>Procedure not found.</p>
        <Link href="/procedures" className="font-medium underline">
          Back to library
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{procedure.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {procedure.category}
          </p>
        </div>
        <Link href="/procedures" className="text-sm font-medium underline">
          Library
        </Link>
      </div>

      {procedure.definition && (
        <section>
          <h2 className="text-lg font-medium">Definition</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            {procedure.definition}
          </p>
        </section>
      )}

      {procedure.summary && (
        <section>
          <h2 className="text-lg font-medium">Overview</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            {procedure.summary}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">General steps</h2>
        {steps.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No steps recorded yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {steps.map((step) => (
              <li
                key={step.id}
                className="rounded border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <p className="font-medium">
                  {step.step_order}. {step.title}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Surgeon-specific versions</h2>
        {surgeonsWithPrefs.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No surgeon has a saved preference record for this procedure yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {surgeonsWithPrefs.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/surgeons/${s.id}/procedures/${procedure.id}`}
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
      </section>
    </main>
  );
}

export default function ProcedurePage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireActive>
      <ProcedureDetail procedureId={params.id} />
    </RequireActive>
  );
}

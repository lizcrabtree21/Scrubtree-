"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RequireActive from "@/components/RequireActive";
import TheatreDiagram from "@/components/TheatreDiagram";
import { useProfile } from "@/hooks/useProfile";
import type {
  Procedure,
  ProcedureStep,
  Surgeon,
  SurgeonPref,
} from "@/lib/database";

function SurgeonProcedureDetail({
  surgeonId,
  procedureId,
}: {
  surgeonId: string;
  procedureId: string;
}) {
  const { profile } = useProfile();
  const [surgeon, setSurgeon] = useState<Surgeon | null>(null);
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [pref, setPref] = useState<SurgeonPref | null>(null);
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [instrumentByStep, setInstrumentByStep] = useState<
    Record<string, string>
  >({});
  const [showSurgeonSteps, setShowSurgeonSteps] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { data: surgeonData },
        { data: procedureData },
        { data: prefData },
        { data: stepData },
      ] = await Promise.all([
        supabase
          .from("surgeons")
          .select("id, name, specialty, is_demo, created_at")
          .eq("id", surgeonId)
          .single(),
        supabase
          .from("procedures")
          .select("id, name, category, definition, summary, is_demo, created_at")
          .eq("id", procedureId)
          .single(),
        supabase
          .from("surgeon_prefs")
          .select("*")
          .eq("surgeon_id", surgeonId)
          .eq("procedure_id", procedureId)
          .maybeSingle(),
        supabase
          .from("procedure_steps")
          .select("id, procedure_id, step_order, title, description, is_demo, created_at")
          .eq("procedure_id", procedureId)
          .order("step_order"),
      ]);

      setSurgeon(surgeonData ?? null);
      setProcedure(procedureData ?? null);
      setPref(prefData ?? null);
      setSteps(stepData ?? []);

      if (prefData) {
        const { data: prefSteps } = await supabase
          .from("surgeon_pref_steps")
          .select("step_id, instrument")
          .eq("surgeon_pref_id", prefData.id);
        const map: Record<string, string> = {};
        for (const row of prefSteps ?? []) {
          map[row.step_id] = row.instrument;
        }
        setInstrumentByStep(map);
      }

      setLoading(false);
    }
    load();
  }, [surgeonId, procedureId]);

  if (loading) {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  if (!surgeon || !procedure) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
        <p>Not found.</p>
        <Link href="/surgeons" className="font-medium underline">
          Back to surgeons
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{procedure.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {surgeon.name} &middot; {surgeon.specialty}
          </p>
        </div>
        <Link
          href={`/surgeons/${surgeon.id}`}
          className="text-sm font-medium underline"
        >
          {surgeon.name}&apos;s procedures
        </Link>
      </div>

      {!pref ? (
        <section className="flex flex-col gap-3 rounded border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            {surgeon.name} doesn&apos;t have a saved preference record for this
            procedure yet.
          </p>
          {profile?.role === "admin" && (
            <Link
              href={`/admin/surgeon-prefs/new?surgeonId=${surgeon.id}&procedureId=${procedure.id}`}
              className="self-start font-medium underline"
            >
              Add preferences
            </Link>
          )}
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Preferences</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Instrument set
                </p>
                <p>{pref.instrument_set || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Sutures / dressings
                </p>
                <p>{pref.sutures || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Equipment
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {pref.equipment.length === 0 ? (
                    <span>—</span>
                  ) : (
                    pref.equipment.map((item, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-black/[.06] px-3 py-1 text-sm dark:bg-white/[.08]"
                      >
                        {item}
                      </span>
                    ))
                  )}
                </div>
              </div>
              {pref.notes && (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Notes
                  </p>
                  <p>{pref.notes}</p>
                </div>
              )}
            </div>
            {profile?.role === "admin" && (
              <Link
                href={`/admin/surgeon-prefs/${pref.id}/edit`}
                className="self-start text-sm font-medium underline"
              >
                Edit preferences
              </Link>
            )}
          </section>

          <section className="flex flex-col items-center gap-3">
            <h2 className="self-start text-lg font-medium">Theatre set-up</h2>
            <TheatreDiagram
              tableAngle={pref.table_angle}
              tableOrientation={pref.table_orientation}
              consoles={pref.consoles}
            />
          </section>
        </>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Steps</h2>
          {pref && (
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setShowSurgeonSteps(false)}
                className={`rounded-full px-3 py-1 ${
                  !showSurgeonSteps
                    ? "bg-foreground text-background"
                    : "border border-zinc-300 dark:border-zinc-700"
                }`}
              >
                General steps
              </button>
              <button
                type="button"
                onClick={() => setShowSurgeonSteps(true)}
                className={`rounded-full px-3 py-1 ${
                  showSurgeonSteps
                    ? "bg-foreground text-background"
                    : "border border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {surgeon.name}&apos;s steps
              </button>
            </div>
          )}
        </div>
        {steps.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No steps recorded for this procedure yet.
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
                {pref && showSurgeonSteps && instrumentByStep[step.id] && (
                  <p className="mt-1 text-sm">
                    <span className="font-medium">Instrument:</span>{" "}
                    {instrumentByStep[step.id]}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

export default function SurgeonProcedurePage() {
  const params = useParams<{ id: string; procedureId: string }>();
  return (
    <RequireActive>
      <SurgeonProcedureDetail
        surgeonId={params.id}
        procedureId={params.procedureId}
      />
    </RequireActive>
  );
}

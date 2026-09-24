"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type {
  CompassPosition,
  ConsolePosition,
  Procedure,
  ProcedureStep,
  Surgeon,
} from "@/lib/database";

const COMPASS_OPTIONS: CompassPosition[] = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
];

type Props = {
  surgeonId: string;
  procedureId: string;
  existingPrefId?: string;
};

export default function SurgeonPrefForm({
  surgeonId,
  procedureId,
  existingPrefId,
}: Props) {
  const router = useRouter();
  const [surgeon, setSurgeon] = useState<Surgeon | null>(null);
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [instrumentSet, setInstrumentSet] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState("");
  const [sutures, setSutures] = useState("");
  const [tableOrientation, setTableOrientation] = useState("");
  const [tableAngle, setTableAngle] = useState(0);
  const [consoles, setConsoles] = useState<ConsolePosition[]>([]);
  const [notes, setNotes] = useState("");
  const [stepInstruments, setStepInstruments] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    async function load() {
      const [{ data: surgeonData }, { data: procedureData }, { data: stepData }] =
        await Promise.all([
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
            .from("procedure_steps")
            .select("id, procedure_id, step_order, title, description, is_demo, created_at")
            .eq("procedure_id", procedureId)
            .order("step_order"),
        ]);
      setSurgeon(surgeonData ?? null);
      setProcedure(procedureData ?? null);
      setSteps(stepData ?? []);

      if (existingPrefId) {
        const { data: pref } = await supabase
          .from("surgeon_prefs")
          .select("*")
          .eq("id", existingPrefId)
          .single();
        if (pref) {
          setInstrumentSet(pref.instrument_set ?? "");
          setEquipment(pref.equipment ?? []);
          setSutures(pref.sutures ?? "");
          setTableOrientation(pref.table_orientation ?? "");
          setTableAngle(pref.table_angle ?? 0);
          setConsoles(pref.consoles ?? []);
          setNotes(pref.notes ?? "");
        }
        const { data: prefSteps } = await supabase
          .from("surgeon_pref_steps")
          .select("step_id, instrument")
          .eq("surgeon_pref_id", existingPrefId);
        const map: Record<string, string> = {};
        for (const row of prefSteps ?? []) {
          map[row.step_id] = row.instrument;
        }
        setStepInstruments(map);
      }

      setLoading(false);
    }
    load();
  }, [surgeonId, procedureId, existingPrefId]);

  function addEquipment() {
    if (!newEquipment.trim()) return;
    setEquipment((e) => [...e, newEquipment.trim()]);
    setNewEquipment("");
  }

  function removeEquipment(index: number) {
    setEquipment((e) => e.filter((_, i) => i !== index));
  }

  function addConsole() {
    setConsoles((c) => [...c, { label: "", position: "N" }]);
  }

  function updateConsole(index: number, patch: Partial<ConsolePosition>) {
    setConsoles((c) =>
      c.map((console, i) => (i === index ? { ...console, ...patch } : console)),
    );
  }

  function removeConsole(index: number) {
    setConsoles((c) => c.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      surgeon_id: surgeonId,
      procedure_id: procedureId,
      instrument_set: instrumentSet,
      equipment,
      sutures,
      table_orientation: tableOrientation,
      table_angle: tableAngle,
      consoles,
      notes,
    };

    let prefId = existingPrefId;

    if (existingPrefId) {
      const { error: updateError } = await supabase
        .from("surgeon_prefs")
        .update(payload)
        .eq("id", existingPrefId);
      if (updateError) {
        setError(updateError.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("surgeon_prefs")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }
      prefId = data.id;
    }

    if (existingPrefId) {
      await supabase
        .from("surgeon_pref_steps")
        .delete()
        .eq("surgeon_pref_id", existingPrefId);
    }

    const stepRows = Object.entries(stepInstruments)
      .filter(([, instrument]) => instrument.trim())
      .map(([stepId, instrument]) => ({
        surgeon_pref_id: prefId,
        step_id: stepId,
        instrument: instrument.trim(),
      }));

    if (stepRows.length > 0) {
      const { error: stepsError } = await supabase
        .from("surgeon_pref_steps")
        .insert(stepRows);
      if (stepsError) {
        setError(stepsError.message);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    router.push(`/surgeons/${surgeonId}/procedures/${procedureId}`);
  }

  if (loading) {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  if (!surgeon || !procedure) {
    return <p className="p-8 text-sm">Surgeon or procedure not found.</p>;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">
        {existingPrefId ? "Edit" : "Add"} preferences: {surgeon.name} &middot;{" "}
        {procedure.name}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <label className="flex flex-col gap-1 text-sm">
          Instrument set
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={instrumentSet}
            onChange={(e) => setInstrumentSet(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2 text-sm">
          Equipment
          <div className="flex flex-wrap gap-2">
            {equipment.map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full bg-black/[.06] px-3 py-1 text-sm dark:bg-white/[.08]"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeEquipment(i)}
                  aria-label={`Remove ${item}`}
                  className="text-zinc-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={newEquipment}
              placeholder="Add equipment item"
              onChange={(e) => setNewEquipment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEquipment();
                }
              }}
            />
            <button
              type="button"
              onClick={addEquipment}
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Add
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Sutures / dressings
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={sutures}
            onChange={(e) => setSutures(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Table orientation notes
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={tableOrientation}
            onChange={(e) => setTableOrientation(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Table angle (0-359 degrees)
          <input
            type="number"
            min={0}
            max={359}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={tableAngle}
            onChange={(e) => setTableAngle(Number(e.target.value))}
          />
        </label>

        <div className="flex flex-col gap-2 text-sm">
          Consoles / staff positions
          {consoles.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Label (e.g. Surgeon)"
                value={c.label}
                onChange={(e) => updateConsole(i, { label: e.target.value })}
              />
              <select
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                value={c.position}
                onChange={(e) =>
                  updateConsole(i, {
                    position: e.target.value as CompassPosition,
                  })
                }
              >
                {COMPASS_OPTIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeConsole(i)}
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addConsole}
            className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            Add console/position
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Notes
          <textarea
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {steps.length > 0 && (
          <div className="flex flex-col gap-2 text-sm">
            Instrument per step
            {steps.map((step) => (
              <label key={step.id} className="flex flex-col gap-1">
                {step.step_order}. {step.title}
                <input
                  className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  value={stepInstruments[step.id] ?? ""}
                  onChange={(e) =>
                    setStepInstruments((m) => ({
                      ...m,
                      [step.id]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-full bg-foreground px-5 py-2.5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {submitting ? "Saving..." : "Save preferences"}
        </button>
      </form>
    </main>
  );
}

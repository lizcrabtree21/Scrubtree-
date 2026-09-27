"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { ProcedurePayload } from "@/lib/database";

type DraftStep = { title: string; description: string };

type Props = {
  existingProcedureId?: string;
};

export default function ProcedureForm({ existingProcedureId }: Props) {
  const router = useRouter();
  const { profile } = useProfile();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [definition, setDefinition] = useState("");
  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([{ title: "", description: "" }]);
  const [loading, setLoading] = useState(Boolean(existingProcedureId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedForApproval, setSubmittedForApproval] = useState(false);

  useEffect(() => {
    if (!existingProcedureId) return;
    async function load() {
      const [{ data: proc }, { data: stepData }] = await Promise.all([
        supabase
          .from("procedures")
          .select("id, name, category, definition, summary, is_demo, created_at")
          .eq("id", existingProcedureId)
          .single(),
        supabase
          .from("procedure_steps")
          .select("id, procedure_id, step_order, title, description, is_demo, created_at")
          .eq("procedure_id", existingProcedureId)
          .order("step_order"),
      ]);
      if (proc) {
        setName(proc.name);
        setCategory(proc.category);
        setDefinition(proc.definition);
        setSummary(proc.summary);
      }
      if (stepData && stepData.length > 0) {
        setSteps(
          stepData.map((s) => ({ title: s.title, description: s.description })),
        );
      }
      setLoading(false);
    }
    load();
  }, [existingProcedureId]);

  function updateStep(index: number, patch: Partial<DraftStep>) {
    setSteps((s) => s.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function addStep() {
    setSteps((s) => [...s, { title: "", description: "" }]);
  }

  function removeStep(index: number) {
    setSteps((s) => s.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const cleanSteps = steps.filter((s) => s.title.trim());
    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
      const requestPayload: ProcedurePayload = {
        name,
        category,
        definition,
        summary,
        steps: cleanSteps,
      };
      const { error: requestError } = await supabase.from("requests").insert({
        type: existingProcedureId ? "edit" : "add",
        target_type: "procedure",
        target_id: existingProcedureId ?? null,
        surgeon_id: null,
        payload: requestPayload,
        submitted_by: profile!.id,
        status: "pending",
      });

      setSubmitting(false);

      if (requestError) {
        setError(requestError.message);
        return;
      }

      setSubmittedForApproval(true);
      return;
    }

    const row = { name, category, definition, summary };
    let procedureId = existingProcedureId;

    if (existingProcedureId) {
      const { error: updateError } = await supabase
        .from("procedures")
        .update(row)
        .eq("id", existingProcedureId);
      if (updateError) {
        setError(updateError.message);
        setSubmitting(false);
        return;
      }
      await supabase
        .from("procedure_steps")
        .delete()
        .eq("procedure_id", existingProcedureId);
    } else {
      const { data, error: procError } = await supabase
        .from("procedures")
        .insert(row)
        .select("id")
        .single();
      if (procError) {
        setError(procError.message);
        setSubmitting(false);
        return;
      }
      procedureId = data.id;
    }

    const stepRows = cleanSteps.map((s, i) => ({
      procedure_id: procedureId,
      step_order: i + 1,
      title: s.title.trim(),
      description: s.description.trim(),
    }));

    if (stepRows.length > 0) {
      const { error: stepsError } = await supabase
        .from("procedure_steps")
        .insert(stepRows);
      if (stepsError) {
        setError(stepsError.message);
        setSubmitting(false);
        return;
      }
    }

    await supabase.from("requests").insert({
      type: existingProcedureId ? "edit" : "add",
      target_type: "procedure",
      target_id: procedureId,
      surgeon_id: null,
      payload: { name, category, definition, summary, steps: cleanSteps },
      submitted_by: profile!.id,
      status: "approved",
      decided_by: profile!.id,
    });

    setSubmitting(false);
    router.push(`/procedures/${procedureId}`);
  }

  if (loading) {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  if (submittedForApproval) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">Sent for approval</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your proposed {existingProcedureId ? "changes" : "new procedure"} have
          been sent to an admin for approval.
        </p>
        <Link href="/procedures" className="self-start font-medium underline">
          Back to the library
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">
        {existingProcedureId ? "Edit" : "Add"} procedure
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Definition
          <textarea
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            rows={2}
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Overview / summary
          <textarea
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Steps</p>
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Step {i + 1}
                </span>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Title"
                value={step.title}
                onChange={(e) => updateStep(i, { title: e.target.value })}
              />
              <textarea
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Description"
                rows={2}
                value={step.description}
                onChange={(e) => updateStep(i, { description: e.target.value })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addStep}
            className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            Add step
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-full bg-foreground px-5 py-2.5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {submitting ? "Saving..." : existingProcedureId ? "Save changes" : "Add procedure"}
        </button>
      </form>
    </main>
  );
}

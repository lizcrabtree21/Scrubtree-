"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RequireActive from "@/components/RequireActive";

type DraftStep = { title: string; description: string };

function NewProcedureForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [definition, setDefinition] = useState("");
  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([{ title: "", description: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

    const { data: procedure, error: procError } = await supabase
      .from("procedures")
      .insert({ name, category, definition, summary })
      .select("id")
      .single();

    if (procError) {
      setError(procError.message);
      setSubmitting(false);
      return;
    }

    const stepRows = steps
      .filter((s) => s.title.trim())
      .map((s, i) => ({
        procedure_id: procedure.id,
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

    setSubmitting(false);
    router.push(`/procedures/${procedure.id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Add procedure</h1>
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
          {submitting ? "Saving..." : "Add procedure"}
        </button>
      </form>
    </main>
  );
}

export default function NewProcedurePage() {
  return (
    <RequireActive adminOnly>
      <NewProcedureForm />
    </RequireActive>
  );
}

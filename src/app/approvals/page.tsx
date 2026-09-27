"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RequireActive from "@/components/RequireActive";
import { useProfile } from "@/hooks/useProfile";
import type {
  EditRequest,
  ProcedurePayload,
  Surgeon,
  SurgeonPrefPayload,
} from "@/lib/database";

function isPrefPayload(
  req: EditRequest,
): req is EditRequest & { payload: SurgeonPrefPayload } {
  return req.target_type === "surgeon_pref";
}

function RequestCard({
  req,
  surgeonNames,
  procedureNames,
  onApprove,
  onDecline,
  canDecide,
  error,
}: {
  req: EditRequest;
  surgeonNames: Record<string, string>;
  procedureNames: Record<string, string>;
  onApprove: (req: EditRequest) => void;
  onDecline: (req: EditRequest) => void;
  canDecide: boolean;
  error?: string;
}) {
  return (
    <li className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {req.type === "add" ? "Add" : "Edit"}{" "}
          {req.target_type === "surgeon_pref"
            ? "surgeon preferences"
            : "procedure"}
        </p>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {new Date(req.submitted_at).toLocaleString()}
        </span>
      </div>

      {isPrefPayload(req) ? (
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <p className="sm:col-span-2 font-medium">
            {surgeonNames[req.payload.surgeon_id] ?? "Unknown surgeon"} &middot;{" "}
            {procedureNames[req.payload.procedure_id] ?? "Unknown procedure"}
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">
              Instrument set:
            </span>{" "}
            {req.payload.instrument_set || "—"}
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Sutures:</span>{" "}
            {req.payload.sutures || "—"}
          </p>
          <p className="sm:col-span-2">
            <span className="text-zinc-500 dark:text-zinc-400">
              Equipment:
            </span>{" "}
            {req.payload.equipment.join(", ") || "—"}
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">
              Table orientation:
            </span>{" "}
            {req.payload.table_orientation || "—"}
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">
              Table angle:
            </span>{" "}
            {req.payload.table_angle}°
          </p>
          <p className="sm:col-span-2">
            <span className="text-zinc-500 dark:text-zinc-400">
              Consoles:
            </span>{" "}
            {req.payload.consoles.map((c) => `${c.label} (${c.position})`).join(", ") ||
              "—"}
          </p>
          {req.payload.notes && (
            <p className="sm:col-span-2">
              <span className="text-zinc-500 dark:text-zinc-400">Notes:</span>{" "}
              {req.payload.notes}
            </p>
          )}
          <p className="sm:col-span-2 text-zinc-500 dark:text-zinc-400">
            {Object.values(req.payload.step_instruments).filter(Boolean).length}{" "}
            step instrument(s) included.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Name:</span>{" "}
            {(req.payload as ProcedurePayload).name}
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Category:</span>{" "}
            {(req.payload as ProcedurePayload).category}
          </p>
          {(req.payload as ProcedurePayload).definition && (
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">
                Definition:
              </span>{" "}
              {(req.payload as ProcedurePayload).definition}
            </p>
          )}
          <p className="text-zinc-500 dark:text-zinc-400">
            {(req.payload as ProcedurePayload).steps.length} step(s) included.
          </p>
        </div>
      )}

      {req.status !== "pending" && (
        <p
          className={
            req.status === "approved"
              ? "text-sm text-green-600"
              : "text-sm text-red-600"
          }
        >
          {req.status === "approved" ? "Approved" : "Declined"}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {req.status === "pending" && canDecide && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onApprove(req)}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onDecline(req)}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-zinc-700 dark:hover:bg-white/[.08]"
          >
            Decline
          </button>
        </div>
      )}
    </li>
  );
}

function ApprovalsInbox() {
  const { profile } = useProfile();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [procedureNames, setProcedureNames] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [{ data: reqData }, { data: surgeonData }, { data: procedureData }] =
      await Promise.all([
        supabase
          .from("requests")
          .select("*")
          .order("submitted_at", { ascending: false }),
        supabase.from("surgeons").select("id, name, specialty, is_demo, created_at"),
        supabase.from("procedures").select("id, name"),
      ]);
    setRequests((reqData as EditRequest[] | null) ?? []);
    setSurgeons(surgeonData ?? []);
    const procNames: Record<string, string> = {};
    for (const p of procedureData ?? []) {
      procNames[p.id] = p.name;
    }
    setProcedureNames(procNames);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const surgeonNames = Object.fromEntries(surgeons.map((s) => [s.id, s.name]));

  async function applyPayload(req: EditRequest) {
    if (isPrefPayload(req)) {
      const payload = req.payload;
      const row = {
        surgeon_id: payload.surgeon_id,
        procedure_id: payload.procedure_id,
        instrument_set: payload.instrument_set,
        equipment: payload.equipment,
        sutures: payload.sutures,
        table_orientation: payload.table_orientation,
        table_angle: payload.table_angle,
        consoles: payload.consoles,
        notes: payload.notes,
      };
      let prefId = req.target_id;
      if (prefId) {
        const { error } = await supabase
          .from("surgeon_prefs")
          .update(row)
          .eq("id", prefId);
        if (error) throw error;
        await supabase
          .from("surgeon_pref_steps")
          .delete()
          .eq("surgeon_pref_id", prefId);
      } else {
        const { data, error } = await supabase
          .from("surgeon_prefs")
          .insert(row)
          .select("id")
          .single();
        if (error) throw error;
        prefId = data.id;
      }
      const stepRows = Object.entries(payload.step_instruments)
        .filter(([, instrument]) => instrument.trim())
        .map(([stepId, instrument]) => ({
          surgeon_pref_id: prefId,
          step_id: stepId,
          instrument,
        }));
      if (stepRows.length > 0) {
        const { error } = await supabase
          .from("surgeon_pref_steps")
          .insert(stepRows);
        if (error) throw error;
      }
    } else {
      const payload = req.payload as ProcedurePayload;
      const row = {
        name: payload.name,
        category: payload.category,
        definition: payload.definition,
        summary: payload.summary,
      };
      let procedureId = req.target_id;
      if (procedureId) {
        const { error } = await supabase
          .from("procedures")
          .update(row)
          .eq("id", procedureId);
        if (error) throw error;
        await supabase
          .from("procedure_steps")
          .delete()
          .eq("procedure_id", procedureId);
      } else {
        const { data, error } = await supabase
          .from("procedures")
          .insert(row)
          .select("id")
          .single();
        if (error) throw error;
        procedureId = data.id;
      }
      const stepRows = payload.steps
        .filter((s) => s.title.trim())
        .map((s, i) => ({
          procedure_id: procedureId,
          step_order: i + 1,
          title: s.title,
          description: s.description,
        }));
      if (stepRows.length > 0) {
        const { error } = await supabase
          .from("procedure_steps")
          .insert(stepRows);
        if (error) throw error;
      }
    }
  }

  async function decide(req: EditRequest, status: "approved" | "rejected") {
    setErrors((e) => ({ ...e, [req.id]: "" }));
    try {
      if (status === "approved") {
        await applyPayload(req);
      }
      const { error } = await supabase
        .from("requests")
        .update({ status, decided_by: profile?.id })
        .eq("id", req.id);
      if (error) throw error;
      await load();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [req.id]: err instanceof Error ? err.message : "Something went wrong.",
      }));
    }
  }

  if (loading) {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
    );
  }

  const isAdmin = profile?.role === "admin";
  const mySurgeonId = profile?.surgeon_id ?? null;

  const decidable = requests.filter((r) => {
    if (r.status !== "pending") return false;
    if (isAdmin) return true;
    return mySurgeonId && r.surgeon_id === mySurgeonId;
  });
  const recentDecisions = requests
    .filter((r) => r.status !== "pending")
    .slice(0, 15);
  const mine = requests.filter((r) => r.submitted_by === profile?.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <Link href="/" className="text-sm font-medium underline">
          Home
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">
          {isAdmin ? "Pending requests" : "Awaiting your approval"}
        </h2>
        {decidable.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing pending.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {decidable.map((r) => (
              <RequestCard
                key={r.id}
                req={r}
                surgeonNames={surgeonNames}
                procedureNames={procedureNames}
                onApprove={(req) => decide(req, "approved")}
                onDecline={(req) => decide(req, "rejected")}
                canDecide
                error={errors[r.id]}
              />
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Recent decisions</h2>
          {recentDecisions.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No decisions yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {recentDecisions.map((r) => (
                <RequestCard
                  key={r.id}
                  req={r}
                  surgeonNames={surgeonNames}
                  procedureNames={procedureNames}
                  onApprove={() => {}}
                  onDecline={() => {}}
                  canDecide={false}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Requests you submitted</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You haven&apos;t submitted any edit requests.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {mine.map((r) => (
              <RequestCard
                key={r.id}
                req={r}
                surgeonNames={surgeonNames}
                procedureNames={procedureNames}
                onApprove={() => {}}
                onDecline={() => {}}
                canDecide={false}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function ApprovalsPage() {
  return (
    <RequireActive>
      <ApprovalsInbox />
    </RequireActive>
  );
}

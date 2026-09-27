"use client";

import RequireActive from "@/components/RequireActive";
import ProcedureForm from "@/components/ProcedureForm";

export default function NewProcedurePage() {
  return (
    <RequireActive>
      <ProcedureForm />
    </RequireActive>
  );
}

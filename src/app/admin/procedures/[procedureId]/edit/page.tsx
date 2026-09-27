"use client";

import { useParams } from "next/navigation";
import RequireActive from "@/components/RequireActive";
import ProcedureForm from "@/components/ProcedureForm";

export default function EditProcedurePage() {
  const params = useParams<{ procedureId: string }>();
  return (
    <RequireActive>
      <ProcedureForm existingProcedureId={params.procedureId} />
    </RequireActive>
  );
}

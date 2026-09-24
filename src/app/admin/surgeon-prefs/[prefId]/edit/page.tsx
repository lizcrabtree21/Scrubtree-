"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RequireActive from "@/components/RequireActive";
import SurgeonPrefForm from "@/components/SurgeonPrefForm";

function EditPrefLoader({ prefId }: { prefId: string }) {
  const [ids, setIds] = useState<{
    surgeonId: string;
    procedureId: string;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("surgeon_prefs")
      .select("surgeon_id, procedure_id")
      .eq("id", prefId)
      .single()
      .then(({ data }) => {
        if (data) {
          setIds({ surgeonId: data.surgeon_id, procedureId: data.procedure_id });
        } else {
          setNotFound(true);
        }
      });
  }, [prefId]);

  if (notFound) {
    return <p className="p-8 text-sm">Preference record not found.</p>;
  }

  if (!ids) {
    return (
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">
        Loading...
      </p>
    );
  }

  return (
    <SurgeonPrefForm
      surgeonId={ids.surgeonId}
      procedureId={ids.procedureId}
      existingPrefId={prefId}
    />
  );
}

export default function EditSurgeonPrefPage() {
  const params = useParams<{ prefId: string }>();
  return (
    <RequireActive adminOnly>
      <EditPrefLoader prefId={params.prefId} />
    </RequireActive>
  );
}

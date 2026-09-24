"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RequireActive from "@/components/RequireActive";
import SurgeonPrefForm from "@/components/SurgeonPrefForm";

function NewPrefContent() {
  const searchParams = useSearchParams();
  const surgeonId = searchParams.get("surgeonId") ?? "";
  const procedureId = searchParams.get("procedureId") ?? "";

  if (!surgeonId || !procedureId) {
    return (
      <p className="p-8 text-sm">
        Missing surgeon or procedure — go to a surgeon&apos;s page and use
        &quot;Add preferences&quot; from there.
      </p>
    );
  }

  return <SurgeonPrefForm surgeonId={surgeonId} procedureId={procedureId} />;
}

export default function NewSurgeonPrefPage() {
  return (
    <RequireActive adminOnly>
      <Suspense
        fallback={
          <p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">
            Loading...
          </p>
        }
      >
        <NewPrefContent />
      </Suspense>
    </RequireActive>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Status = "checking" | "connected" | "error";

export default function SupabaseStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
        } else {
          setStatus("connected");
        }
      })
      .catch((err: Error) => {
        setStatus("error");
        setMessage(err.message);
      });
  }, []);

  const color =
    status === "connected"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-yellow-500";

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {status === "checking" && "Checking Supabase connection..."}
      {status === "connected" && "Connected to Supabase"}
      {status === "error" && `Supabase error: ${message}`}
    </div>
  );
}

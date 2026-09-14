"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.signOut().then(() => {
      setDone(true);
      router.push("/login");
    });
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-24 text-center">
      <p className="text-zinc-600 dark:text-zinc-400">
        {done ? (
          <>
            You&apos;ve been logged out.{" "}
            <Link href="/login" className="font-medium underline">
              Log in again
            </Link>
          </>
        ) : (
          "Logging out..."
        )}
      </p>
    </main>
  );
}

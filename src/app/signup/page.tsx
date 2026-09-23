"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Surgeon, UserRole } from "@/lib/database";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("nurse");
  const [surgeonChoice, setSurgeonChoice] = useState<"existing" | "new">(
    "existing",
  );
  const [surgeonId, setSurgeonId] = useState("");
  const [newSurgeonName, setNewSurgeonName] = useState("");
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);

  useEffect(() => {
    supabase
      .from("surgeons")
      .select("id, name, created_at")
      .order("name")
      .then(({ data }) => {
        setSurgeons(data ?? []);
        if (!data || data.length === 0) setSurgeonChoice("new");
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          surgeon_id:
            role === "surgeon" && surgeonChoice === "existing"
              ? surgeonId || null
              : null,
          new_surgeon_name:
            role === "surgeon" && surgeonChoice === "new"
              ? newSurgeonName || null
              : null,
        },
      },
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/");
    } else {
      setConfirmationNeeded(true);
    }
  }

  if (confirmationNeeded) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-24">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          We sent a confirmation link to {email}. Confirm your address, then{" "}
          <Link href="/login" className="font-medium underline">
            log in
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Role
          <select
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={role}
            onChange={(e) => setRole(e.target.value as Exclude<UserRole, "admin">)}
          >
            <option value="nurse">Nurse</option>
            <option value="surgeon">Surgeon</option>
          </select>
        </label>
        {role === "surgeon" && (
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1">Which surgeon are you?</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="surgeonChoice"
                checked={surgeonChoice === "existing"}
                onChange={() => setSurgeonChoice("existing")}
              />
              I&apos;m already listed
            </label>
            {surgeonChoice === "existing" && (
              <select
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                value={surgeonId}
                required
                onChange={(e) => setSurgeonId(e.target.value)}
              >
                <option value="" disabled>
                  Select your name
                </option>
                {surgeons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="surgeonChoice"
                checked={surgeonChoice === "new"}
                onChange={() => setSurgeonChoice("new")}
              />
              I&apos;m not listed yet
            </label>
            {surgeonChoice === "new" && (
              <input
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                type="text"
                placeholder="Your name as it should appear"
                required
                value={newSurgeonName}
                onChange={(e) => setNewSurgeonName(e.target.value)}
              />
            )}
          </fieldset>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-foreground px-5 py-2.5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {submitting ? "Signing up..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

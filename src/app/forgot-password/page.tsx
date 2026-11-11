"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/reset-password` },
    );

    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-24">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          If an account exists for {email}, we sent a link to reset your
          password. Open it to choose a new password.
        </p>
        <Link href="/login" className="text-sm font-medium text-brand underline">
          Back to log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter the email on your account and we&apos;ll send you a link to
        reset your password.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand px-5 py-2.5 font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/login" className="font-medium text-brand underline">
          Back to log in
        </Link>
      </p>
    </main>
  );
}

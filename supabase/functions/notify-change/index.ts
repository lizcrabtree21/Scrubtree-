// Supabase Edge Function: notify-change
//
// Invoked by Database Webhooks (see supabase/functions/notify-change/README.md
// for the webhook setup this expects) whenever a row changes in `requests`
// or `users`. Sends a short transactional email via Resend - never any
// clinical/preference content, just a generic message and a link back to
// the app. A failed send is logged and swallowed; it can never block or
// undo the database change that triggered it, since the webhook that
// invokes this function is fired asynchronously, after the change has
// already committed.
//
// Requires these Edge Function secrets (Project Settings -> Edge Functions):
//   RESEND_API_KEY     - from resend.com
//   RESEND_FROM_EMAIL   - e.g. onboarding@resend.dev for testing
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Supabase runtime for every Edge Function - no need to set them.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://scrubtree.vercel.app";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendEmail(to: string, subject: string, body: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      console.error("Resend send failed", to, res.status, await res.text());
    }
  } catch (err) {
    console.error("Resend send threw", to, err);
  }
}

async function emailsForUserIds(ids: string[]): Promise<string[]> {
  const emails: string[] = [];
  for (const id of ids) {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (!error && data.user?.email) emails.push(data.user.email);
  }
  return emails;
}

async function adminEmails(): Promise<string[]> {
  const { data } = await admin.from("users").select("id").eq("role", "admin");
  return emailsForUserIds((data ?? []).map((u: { id: string }) => u.id));
}

async function surgeonUserEmails(surgeonId: string): Promise<string[]> {
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("surgeon_id", surgeonId);
  return emailsForUserIds((data ?? []).map((u: { id: string }) => u.id));
}

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const { type, table, record, old_record } = payload;

  try {
    if (table === "requests" && type === "INSERT" && record.status === "pending") {
      const recipients = new Set<string>(await adminEmails());
      const surgeonId = record.surgeon_id as string | null;
      if (surgeonId) {
        for (const email of await surgeonUserEmails(surgeonId)) {
          recipients.add(email);
        }
      }
      await Promise.all(
        [...recipients].map((email) =>
          sendEmail(
            email,
            "New change request waiting for approval",
            `You have a new change request waiting for approval.\n\n${APP_URL}/approvals`,
          ),
        ),
      );
    } else if (
      table === "requests" &&
      type === "UPDATE" &&
      old_record?.status === "pending" &&
      record.status !== "pending"
    ) {
      const emails = await emailsForUserIds([record.submitted_by as string]);
      const outcome = record.status === "approved" ? "approved" : "declined";
      await Promise.all(
        emails.map((email) =>
          sendEmail(
            email,
            `Your change request was ${outcome}`,
            `Your change request was ${outcome}.\n\n${APP_URL}/approvals`,
          ),
        ),
      );
    } else if (table === "users" && type === "INSERT" && record.status === "pending") {
      const recipients = await adminEmails();
      await Promise.all(
        recipients.map((email) =>
          sendEmail(
            email,
            "A new user is waiting for access",
            `A new user is waiting for access.\n\n${APP_URL}/admin`,
          ),
        ),
      );
    }
  } catch (err) {
    console.error("notify-change handler error", err);
  }

  return new Response("ok", { status: 200 });
});

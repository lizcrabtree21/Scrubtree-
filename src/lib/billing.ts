import { supabase } from "@/lib/supabase";

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

async function callBillingFunction(name: "create-checkout-session" | "create-portal-session") {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You need to be signed in.");

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error((await res.text()) || "Something went wrong.");
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

export async function startCheckout() {
  window.location.href = await callBillingFunction("create-checkout-session");
}

export async function openBillingPortal() {
  window.location.href = await callBillingFunction("create-portal-session");
}

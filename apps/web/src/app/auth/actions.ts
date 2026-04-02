"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

export async function signup(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  if (!displayName || !email || !password) {
    redirect(`/auth/signup?message=${encodeMessage("Please complete all fields.")}`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: `${origin}/auth/confirm?next=/app`,
    },
  });

  if (error) {
    redirect(`/auth/signup?message=${encodeMessage(error.message)}`);
  }

  redirect(
    `/auth/signup?message=${encodeMessage("Check your email to confirm your account before logging in.")}`,
  );
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/auth/login?message=${encodeMessage("Enter your email and password.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/auth/login?message=${encodeMessage(error.message)}`);
  }

  redirect("/app");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

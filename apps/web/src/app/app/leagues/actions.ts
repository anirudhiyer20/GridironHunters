"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeInviteCode, normalizeLeagueSlug } from "@gridiron/shared";

import { createClient } from "@/lib/supabase/server";

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

export async function createLeague(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const season = Number.parseInt(String(formData.get("season") ?? ""), 10);
  const draftStartsAtInput = String(formData.get("draft_starts_at") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = normalizeLeagueSlug(slugInput || name);

  if (!name || !slug || Number.isNaN(season) || !draftStartsAtInput) {
    redirect(
      `/app/leagues/create?message=${encodeMessage("Please complete all league fields.")}`,
    );
  }

  const draftStartsAt = new Date(draftStartsAtInput);
  if (Number.isNaN(draftStartsAt.getTime())) {
    redirect(
      `/app/leagues/create?message=${encodeMessage("Draft start time is invalid.")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_league_with_invite", {
    p_name: name,
    p_slug: slug,
    p_season: season,
    p_draft_starts_at: draftStartsAt.toISOString(),
  });

  if (error) {
    redirect(`/app/leagues/create?message=${encodeMessage(error.message)}`);
  }

  const createdLeague = data?.[0];
  revalidatePath("/app");
  revalidatePath("/app/leagues");

  redirect(
    `/app/leagues/${createdLeague?.league_slug ?? slug}?message=${encodeMessage("League created successfully.")}`,
  );
}

export async function joinLeague(formData: FormData) {
  const code = normalizeInviteCode(String(formData.get("code") ?? ""));

  if (!code) {
    redirect(`/app/leagues/join?message=${encodeMessage("Enter an invite code.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_league_via_code", {
    p_code: code,
  });

  if (error) {
    redirect(`/app/leagues/join?message=${encodeMessage(error.message)}`);
  }

  const joinedLeague = data?.[0];
  revalidatePath("/app");
  revalidatePath("/app/leagues");

  redirect(
    `/app/leagues/${joinedLeague?.league_slug ?? ""}?message=${encodeMessage("Joined league successfully.")}`,
  );
}

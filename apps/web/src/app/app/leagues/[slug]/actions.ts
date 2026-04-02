"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

export async function regenerateInvite(formData: FormData) {
  const leagueId = String(formData.get("league_id") ?? "");
  const leagueSlug = String(formData.get("league_slug") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_league_invite", {
    p_league_id: leagueId,
  });

  if (error) {
    redirect(
      `/app/leagues/${leagueSlug}?message=${encodeMessage(error.message)}`,
    );
  }

  revalidatePath(`/app/leagues/${leagueSlug}`);
  revalidatePath("/app/leagues");
  redirect(
    `/app/leagues/${leagueSlug}?message=${encodeMessage("Invite code regenerated.")}`,
  );
}

export async function removeMember(formData: FormData) {
  const leagueId = String(formData.get("league_id") ?? "");
  const leagueSlug = String(formData.get("league_slug") ?? "");
  const memberUserId = String(formData.get("member_user_id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_league_member", {
    p_league_id: leagueId,
    p_member_user_id: memberUserId,
  });

  if (error) {
    redirect(
      `/app/leagues/${leagueSlug}?message=${encodeMessage(error.message)}`,
    );
  }

  revalidatePath(`/app/leagues/${leagueSlug}`);
  revalidatePath("/app/leagues");
  redirect(
    `/app/leagues/${leagueSlug}?message=${encodeMessage("Member removed.")}`,
  );
}

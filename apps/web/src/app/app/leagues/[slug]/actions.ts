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

export async function updateLeagueSettings(formData: FormData) {
  const leagueId = String(formData.get("league_id") ?? "");
  const leagueSlug = String(formData.get("league_slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const draftStartsAtInput = String(formData.get("draft_starts_at") ?? "").trim();

  if (!name || !draftStartsAtInput) {
    redirect(
      `/app/leagues/${leagueSlug}?message=${encodeMessage("League name and draft time are required.")}`,
    );
  }

  const draftStartsAt = new Date(draftStartsAtInput);
  if (Number.isNaN(draftStartsAt.getTime())) {
    redirect(
      `/app/leagues/${leagueSlug}?message=${encodeMessage("Draft time is invalid.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_predraft_league_settings", {
    p_league_id: leagueId,
    p_name: name,
    p_draft_starts_at: draftStartsAt.toISOString(),
  });

  if (error) {
    redirect(
      `/app/leagues/${leagueSlug}?message=${encodeMessage(error.message)}`,
    );
  }

  revalidatePath(`/app/leagues/${leagueSlug}`);
  revalidatePath("/app/leagues");
  redirect(
    `/app/leagues/${leagueSlug}?message=${encodeMessage("League settings updated.")}`,
  );
}

export async function prepareDraft(formData: FormData) {
  const leagueId = String(formData.get("league_id") ?? "");
  const leagueSlug = String(formData.get("league_slug") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("prepare_draft_room", {
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
    `/app/leagues/${leagueSlug}?message=${encodeMessage("Draft room prepared.")}`,
  );
}

export async function startDraft(formData: FormData) {
  const leagueId = String(formData.get("league_id") ?? "");
  const leagueSlug = String(formData.get("league_slug") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_draft_now", {
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
    `/app/leagues/${leagueSlug}?message=${encodeMessage("Draft started.")}`,
  );
}

export async function pauseDraft(formData: FormData) {
  const leagueId = String(formData.get("league_id") ?? "");
  const leagueSlug = String(formData.get("league_slug") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("pause_draft", {
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
    `/app/leagues/${leagueSlug}?message=${encodeMessage("Draft paused.")}`,
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

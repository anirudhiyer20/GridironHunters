"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

export async function resignFromGuild(formData: FormData) {
  const leagueId = String(formData.get("league_id") ?? "").trim();

  if (!leagueId) {
    redirect("/app/guild/ledger?message=" + encodeMessage("Guild ID is required."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resign_from_guild", {
    p_league_id: leagueId,
  });

  if (error) {
    redirect("/app/guild/ledger?message=" + encodeMessage(error.message));
  }

  const result = Array.isArray(data) ? data[0] : data;
  const guildName = result?.left_league_name ?? "the Guild";

  revalidatePath("/app/guild");
  revalidatePath("/app/guild/ledger");
  revalidatePath("/app/leagues");
  revalidatePath("/app/house/board");

  redirect(
    "/app/leagues?message=" +
      encodeMessage(`You resigned from ${guildName}. Rejoin with an invite code if needed.`),
  );
}

export async function confirmExitWorld() {
  await logout();
}

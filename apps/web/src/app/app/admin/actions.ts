"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const FANTASYCALC_URL =
  "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&numTeams=12&ppr=1";

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

export async function importFantasyCalcPlayers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before importing players."));
  }

  const adminCheck = await supabase.rpc("is_platform_admin", {
    p_user_id: user.id,
  });

  if (adminCheck.error || !adminCheck.data) {
    redirect("/app/admin?message=" + encodeMessage("Only platform admins can import players."));
  }

  const response = await fetch(FANTASYCALC_URL, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    redirect(
      "/app/admin?message=" +
        encodeMessage(`FantasyCalc request failed with status ${response.status}.`),
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!Array.isArray(payload)) {
    redirect(
      "/app/admin?message=" +
        encodeMessage("FantasyCalc returned an unexpected payload shape."),
    );
  }

  const importResult = await supabase.rpc("import_fantasycalc_players", {
    p_payload: payload,
    p_deactivate_seed_players: true,
  });

  if (importResult.error) {
    redirect("/app/admin?message=" + encodeMessage(importResult.error.message));
  }

  const summary = importResult.data?.[0];
  const importedCount = Number(summary?.imported_count ?? 0);
  const deactivatedSeedCount = Number(summary?.deactivated_seed_count ?? 0);
  const deactivatedProviderCount = Number(summary?.deactivated_provider_count ?? 0);

  revalidatePath("/app/admin");
  revalidatePath("/app/leagues");
  revalidatePath("/app/leagues/[slug]/draft", "page");

  redirect(
    "/app/admin?message=" +
      encodeMessage(
        `Imported ${importedCount} FantasyCalc players, deactivated ${deactivatedSeedCount} seed players, and deactivated ${deactivatedProviderCount} stale FantasyCalc players.`,
      ),
  );
}

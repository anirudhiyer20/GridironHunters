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

export async function grantWeeklyBattleKeys(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before granting Battle Keys."));
  }

  const adminCheck = await supabase.rpc("is_platform_admin", {
    p_user_id: user.id,
  });

  if (adminCheck.error || !adminCheck.data) {
    redirect("/app/admin?message=" + encodeMessage("Only platform admins can grant Battle Keys."));
  }

  const leagueId = String(formData.get("league_id") ?? "").trim();
  const weekNumber = Number.parseInt(String(formData.get("week_number") ?? "").trim(), 10);
  const keysGranted = Number.parseInt(String(formData.get("keys_granted") ?? "").trim(), 10);

  if (!leagueId || Number.isNaN(weekNumber) || Number.isNaN(keysGranted)) {
    redirect("/app/admin?message=" + encodeMessage("League, week, and keys are required."));
  }

  const grantResult = await supabase.rpc("grant_weekly_battle_keys", {
    p_league_id: leagueId,
    p_week_number: weekNumber,
    p_keys_granted: keysGranted,
  });

  if (grantResult.error) {
    redirect("/app/admin?message=" + encodeMessage(grantResult.error.message));
  }

  const summary = grantResult.data?.[0];
  const grantedCount = Number(summary?.granted_count ?? 0);
  const notifiedCount = Number(summary?.notified_count ?? 0);

  revalidatePath("/app/admin");
  revalidatePath("/app/house/notifications");
  revalidatePath("/app/dungeon/hunts");

  redirect(
    "/app/admin?message=" +
      encodeMessage(
        `Granted ${keysGranted} Battle Keys for week ${weekNumber} to ${grantedCount} House(s). ${notifiedCount} notification scroll(s) sent.`,
      ),
  );
}

export async function resolveSubmittedHunts(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before resolving Hunts."));
  }

  const adminCheck = await supabase.rpc("is_platform_admin", {
    p_user_id: user.id,
  });

  if (adminCheck.error || !adminCheck.data) {
    redirect("/app/admin?message=" + encodeMessage("Only platform admins can resolve Hunts."));
  }

  const leagueId = String(formData.get("league_id") ?? "").trim();
  const weekNumber = Number.parseInt(String(formData.get("week_number") ?? "").trim(), 10);
  const limit = Number.parseInt(String(formData.get("resolve_limit") ?? "").trim(), 10);

  if (!leagueId || Number.isNaN(weekNumber) || Number.isNaN(limit)) {
    redirect("/app/admin?message=" + encodeMessage("Guild, week, and limit are required."));
  }

  const resolveResult = await supabase.rpc("resolve_submitted_hunts", {
    p_league_id: leagueId,
    p_week_number: weekNumber,
    p_limit: limit,
  });

  if (resolveResult.error) {
    redirect("/app/admin?message=" + encodeMessage(resolveResult.error.message));
  }

  const summary = resolveResult.data?.[0];
  const resolvedCount = Number(summary?.resolved_count ?? 0);
  const capturedCount = Number(summary?.captured_count ?? 0);
  const escapedCount = Number(summary?.escaped_count ?? 0);
  const pendingCount = Number(summary?.pending_count ?? 0);

  revalidatePath("/app/admin");
  revalidatePath("/app/dungeon/hunts");
  revalidatePath("/app/house/notifications");
  revalidatePath("/app/house/party");

  redirect(
    "/app/admin?message=" +
      encodeMessage(
        `Resolved ${resolvedCount} Hunt(s) for week ${weekNumber}. Captured: ${capturedCount}. Escaped: ${escapedCount}. Pending: ${pendingCount}.`,
      ),
  );
}

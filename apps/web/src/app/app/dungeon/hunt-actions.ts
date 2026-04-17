"use server";

import { TRIBE_DETAILS, TRIBE_NAMES, type TribeName } from "@gridiron/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { countBattleKeys } from "./hunt-rules";

const tribeBySlug = Object.fromEntries(
  TRIBE_NAMES.map((tribe) => [TRIBE_DETAILS[tribe].slug, tribe]),
) as Record<string, TribeName>;

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function readRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`Missing ${key}.`);
  }

  return value;
}

function readOptional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function getTribeReturnPath(tribe: TribeName) {
  return `/app/dungeon/${TRIBE_DETAILS[tribe].slug}`;
}

function readSafeReturnPath(formData: FormData, fallback: string) {
  const returnTo = readOptional(formData, "return_to");

  if (returnTo?.startsWith("/app/dungeon")) {
    return returnTo;
  }

  return fallback;
}

function redirectWithMessage(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}message=${encodeMessage(message)}`);
}

function readTribe(value: string): TribeName {
  if (TRIBE_NAMES.includes(value as TribeName)) {
    return value as TribeName;
  }

  const tribeFromSlug = tribeBySlug[value];
  if (tribeFromSlug) {
    return tribeFromSlug;
  }

  throw new Error("Unknown Dungeon Tribe.");
}

function readOptionalTribe(formData: FormData) {
  const tribeValue = readOptional(formData, "target_tribe");
  return tribeValue ? readTribe(tribeValue) : null;
}

export async function queueHuntTarget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before queuing a Hunt target."));
  }

  let tribe: TribeName = "Combat";

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const targetPlayerId = readRequired(formData, "target_player_id");
    tribe = readTribe(readRequired(formData, "target_tribe"));

    const { data: participant } = await supabase
      .from("league_participants")
      .select("id")
      .eq("id", participantId)
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .eq("participant_type", "human")
      .maybeSingle();

    if (!participant) {
      throw new Error("Could not find your House in this Guild.");
    }

    const { data: targetPlayer } = await supabase
      .from("players")
      .select("id, tribe, is_active")
      .eq("id", targetPlayerId)
      .eq("is_active", true)
      .eq("tribe", tribe)
      .maybeSingle();

    if (!targetPlayer) {
      throw new Error("That Wild Player is not available in this Dungeon.");
    }

    const { data: draftedTarget } = await supabase
      .from("draft_picks")
      .select("id")
      .eq("league_id", leagueId)
      .eq("picked_player_id", targetPlayerId)
      .maybeSingle();

    const { data: capturedTarget } = await supabase
      .from("hunt_captures")
      .select("id")
      .eq("league_id", leagueId)
      .eq("player_id", targetPlayerId)
      .maybeSingle();

    if (draftedTarget || capturedTarget) {
      throw new Error("That Wild Player already belongs to a House in this Guild.");
    }

    const { data: lastQueuedTarget } = await supabase
      .from("hunt_queue_entries")
      .select("queue_rank")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .eq("target_tribe", tribe)
      .order("queue_rank", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextQueueRank = Number(lastQueuedTarget?.queue_rank ?? 0) + 1;

    const { error } = await supabase.from("hunt_queue_entries").insert({
      league_id: leagueId,
      participant_id: participantId,
      target_player_id: targetPlayerId,
      target_tribe: tribe,
      queue_rank: nextQueueRank,
    });

    if (error) {
      if (error.code === "23505") {
        throw new Error("That Wild Player is already on your Hunt Queue.");
      }

      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not queue Hunt target.";
    redirectWithMessage(getTribeReturnPath(tribe), message);
  }

  revalidatePath(getTribeReturnPath(tribe));
  revalidatePath("/app/dungeon/hunts");
  redirectWithMessage(getTribeReturnPath(tribe), "Wild Player added to Hunt Queue.");
}

export async function unqueueHuntTarget(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before changing your Hunt Queue."));
  }

  let tribe: TribeName = "Combat";

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const queueEntryId = readRequired(formData, "queue_entry_id");
    tribe = readTribe(readRequired(formData, "target_tribe"));

    const { data: participant } = await supabase
      .from("league_participants")
      .select("id")
      .eq("id", participantId)
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .eq("participant_type", "human")
      .maybeSingle();

    if (!participant) {
      throw new Error("Could not find your House in this Guild.");
    }

    const { error } = await supabase
      .from("hunt_queue_entries")
      .delete()
      .eq("id", queueEntryId)
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .eq("target_tribe", tribe);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove Hunt target.";
    redirectWithMessage(getTribeReturnPath(tribe), message);
  }

  revalidatePath(getTribeReturnPath(tribe));
  revalidatePath("/app/dungeon/hunts");
  redirectWithMessage(getTribeReturnPath(tribe), "Wild Player removed from Hunt Queue.");
}

export async function assignHuntChallenger(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before setting Hunt challengers."));
  }

  let tribe: TribeName = "Combat";
  let returnPath = "/app/dungeon/hunts";

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const queueEntryId = readRequired(formData, "queue_entry_id");
    const challengerDraftPickId = readRequired(formData, "challenger_draft_pick_id");
    tribe = readTribe(readRequired(formData, "target_tribe"));
    returnPath = readSafeReturnPath(formData, "/app/dungeon/hunts");
    const challengerSlot = Number(readRequired(formData, "challenger_slot"));

    if (challengerSlot !== 1 && challengerSlot !== 2) {
      throw new Error("Unknown Hunt challenger slot.");
    }

    const queueEntry = await validateOwnedQueueEntry({
      supabase,
      userId: user.id,
      leagueId,
      participantId,
      queueEntryId,
      tribe,
    });

    const { data: existingSlotAssignment, error: existingSlotError } = await supabase
      .from("hunt_challengers")
      .select("id")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .eq("hunt_queue_entry_id", queueEntryId)
      .eq("challenger_slot", challengerSlot)
      .maybeSingle();

    if (existingSlotError) {
      throw new Error(existingSlotError.message);
    }

    const { data: duplicateAssignment, error: duplicateError } = await supabase
      .from("hunt_challengers")
      .select("id")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .eq("challenger_draft_pick_id", challengerDraftPickId)
      .neq("hunt_queue_entry_id", queueEntryId)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(duplicateError.message);
    }

    if (duplicateAssignment) {
      throw new Error("That battler is already assigned to another Hunt.");
    }

    const { data: grantRow, error: grantError } = await supabase
      .from("battle_key_grants")
      .select("keys_granted")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (grantError) {
      throw new Error(grantError.message);
    }

    const { data: allAssignedRows, error: assignedRowsError } = await supabase
      .from("hunt_challengers")
      .select("id")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId);

    if (assignedRowsError) {
      throw new Error(assignedRowsError.message);
    }

    const battleKeyTotal = Number(grantRow?.keys_granted ?? 12);
    const currentBattleKeysInUse = allAssignedRows?.length ?? 0;

    if (!existingSlotAssignment && currentBattleKeysInUse >= battleKeyTotal) {
      throw new Error("No unspent Battle Keys remain. Clear a battler or wait for next grant.");
    }

    const { data: challengerPick } = await supabase
      .from("draft_picks")
      .select("id, picked_position")
      .eq("id", challengerDraftPickId)
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .in("status", ["made", "autopicked"])
      .maybeSingle();

    if (!challengerPick) {
      throw new Error("That challenger is not in your Party.");
    }

    if (challengerPick.picked_position !== queueEntry.targetPosition) {
      throw new Error(`Only ${queueEntry.targetPosition} challengers can fight this target.`);
    }

    const { data: arenaAssignment } = await supabase
      .from("party_assignments")
      .select("id")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .eq("draft_pick_id", challengerDraftPickId)
      .eq("assignment_type", "arena")
      .maybeSingle();

    if (arenaAssignment) {
      throw new Error("Arena lineup players cannot be assigned to Hunts.");
    }

    const { error } = await supabase.from("hunt_challengers").upsert(
      {
        league_id: leagueId,
        participant_id: participantId,
        hunt_queue_entry_id: queueEntryId,
        challenger_draft_pick_id: challengerDraftPickId,
        challenger_slot: challengerSlot,
      },
      {
        onConflict: "hunt_queue_entry_id,challenger_slot",
      },
    );

    if (error) {
      if (error.code === "23505") {
        throw new Error("That challenger is already assigned to this Hunt.");
      }

      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign Hunt challenger.";
    redirectWithMessage(returnPath, message);
  }

  revalidatePath(getTribeReturnPath(tribe));
  revalidatePath("/app/dungeon/hunts");
  redirectWithMessage(returnPath, "Hunt challenger assigned.");
}

export async function clearHuntChallenger(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before changing Hunt challengers."));
  }

  let tribe: TribeName = "Combat";
  let returnPath = "/app/dungeon/hunts";

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const queueEntryId = readRequired(formData, "queue_entry_id");
    tribe = readTribe(readRequired(formData, "target_tribe"));
    returnPath = readSafeReturnPath(formData, "/app/dungeon/hunts");
    const challengerSlot = Number(readRequired(formData, "challenger_slot"));

    if (challengerSlot !== 1 && challengerSlot !== 2) {
      throw new Error("Unknown Hunt challenger slot.");
    }

    await validateOwnedQueueEntry({
      supabase,
      userId: user.id,
      leagueId,
      participantId,
      queueEntryId,
      tribe,
    });

    const { error } = await supabase
      .from("hunt_challengers")
      .delete()
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .eq("hunt_queue_entry_id", queueEntryId)
      .eq("challenger_slot", challengerSlot);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear Hunt challenger.";
    redirectWithMessage(returnPath, message);
  }

  revalidatePath(getTribeReturnPath(tribe));
  revalidatePath("/app/dungeon/hunts");
  redirectWithMessage(returnPath, "Hunt challenger cleared.");
}

export async function submitHuntSlate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before submitting a Hunt."));
  }

  const fallbackPath = "/app/dungeon/hunts";
  let returnPath = fallbackPath;

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const weekNumber = Number.parseInt(readRequired(formData, "week_number"), 10);
    const targetTribe = readOptionalTribe(formData);
    returnPath = readSafeReturnPath(formData, targetTribe ? getTribeReturnPath(targetTribe) : fallbackPath);

    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 18) {
      throw new Error("Week number must be between 1 and 18.");
    }

    await validateOwnedParticipant({ supabase, userId: user.id, leagueId, participantId });

    const { data: grantRow, error: grantError } = await supabase
      .from("battle_key_grants")
      .select("keys_granted")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .eq("week_number", weekNumber)
      .maybeSingle();

    if (grantError) {
      throw new Error(grantError.message);
    }

    let queueQuery = supabase
      .from("hunt_queue_entries")
      .select("id, target_player_id, target_tribe")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId);

    if (targetTribe) {
      queueQuery = queueQuery.eq("target_tribe", targetTribe);
    }

    const { data: queueRows } = await queueQuery;
    const queueEntries = (queueRows ?? []).filter(
      (entry): entry is { id: string; target_player_id: string; target_tribe: TribeName } =>
        Boolean(entry.id) && Boolean(entry.target_player_id) && TRIBE_NAMES.includes(entry.target_tribe as TribeName),
    );

    if (!queueEntries.length) {
      throw new Error("Queue at least one Wild Player before submitting this Hunt slate.");
    }

    const { data: challengerRows } = await supabase
      .from("hunt_challengers")
      .select("hunt_queue_entry_id, challenger_draft_pick_id, challenger_slot")
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .in("hunt_queue_entry_id", queueEntries.map((entry) => entry.id))
      .order("challenger_slot", { ascending: true });
    const challengersByQueueEntryId = (challengerRows ?? []).reduce<
      Record<string, Array<{ challenger_draft_pick_id: string; challenger_slot: 1 | 2 }>>
    >((acc, challenger) => {
      if (
        Boolean(challenger.hunt_queue_entry_id) &&
        Boolean(challenger.challenger_draft_pick_id) &&
        (challenger.challenger_slot === 1 || challenger.challenger_slot === 2)
      ) {
        acc[challenger.hunt_queue_entry_id] ??= [];
        acc[challenger.hunt_queue_entry_id].push({
          challenger_draft_pick_id: challenger.challenger_draft_pick_id,
          challenger_slot: challenger.challenger_slot,
        });
      }

      return acc;
    }, {});
    const readyQueueEntries = queueEntries.filter(
      (entry) => countBattleKeys(challengersByQueueEntryId[entry.id]?.length ?? 0) > 0,
    );

    if (!readyQueueEntries.length) {
      throw new Error("Assign at least one battler before submitting this Hunt slate.");
    }

    const totalBattleKeysSpent = readyQueueEntries.reduce((total, entry) => {
      const challengers = challengersByQueueEntryId[entry.id] ?? [];
      return total + countBattleKeys(challengers.length);
    }, 0);
    const battleKeysGranted = Number(grantRow?.keys_granted ?? 12);

    if (totalBattleKeysSpent > battleKeysGranted) {
      throw new Error(
        `This Hunt slate uses ${totalBattleKeysSpent} Battle Keys, but week ${weekNumber} has only ${battleKeysGranted}.`,
      );
    }

    for (const queueEntry of readyQueueEntries) {
      const challengers = challengersByQueueEntryId[queueEntry.id] ?? [];
      const battleKeysSpent = countBattleKeys(challengers.length);
      const { data: attempt, error: attemptError } = await supabase
        .from("hunt_attempts")
        .upsert(
          {
            league_id: leagueId,
            participant_id: participantId,
            hunt_queue_entry_id: queueEntry.id,
            target_player_id: queueEntry.target_player_id,
            target_tribe: queueEntry.target_tribe,
            week_number: weekNumber,
            battle_keys_spent: battleKeysSpent,
            status: "submitted",
            result: null,
            target_score: null,
            best_challenger_score: null,
            resolved_at: null,
          },
          {
            onConflict: "hunt_queue_entry_id",
          },
        )
        .select("id")
        .single();

      if (attemptError || !attempt) {
        throw new Error(attemptError?.message ?? "Could not submit Hunt.");
      }

      const { error: deleteError } = await supabase
        .from("hunt_attempt_challengers")
        .delete()
        .eq("hunt_attempt_id", attempt.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      const { error: insertError } = await supabase.from("hunt_attempt_challengers").insert(
        challengers.map((challenger) => ({
          hunt_attempt_id: attempt.id,
          challenger_draft_pick_id: challenger.challenger_draft_pick_id,
          challenger_slot: challenger.challenger_slot,
        })),
      );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit Hunt slate.";
    redirectWithMessage(returnPath, message);
  }

  revalidatePath("/app/dungeon");
  revalidatePath("/app/dungeon/hunts");
  revalidatePath("/app/house/board");
  revalidatePath("/app/house/party");
  redirectWithMessage(returnPath, "Hunt slate submitted. Scores are pending.");
}

async function validateOwnedQueueEntry({
  supabase,
  userId,
  leagueId,
  participantId,
  queueEntryId,
  tribe,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  leagueId: string;
  participantId: string;
  queueEntryId: string;
  tribe: TribeName;
}) {
  await validateOwnedParticipant({ supabase, userId, leagueId, participantId });

  const { data: queueEntry } = await supabase
    .from("hunt_queue_entries")
    .select("id, target_player_id, players!inner(position)")
    .eq("id", queueEntryId)
    .eq("league_id", leagueId)
    .eq("participant_id", participantId)
    .eq("target_tribe", tribe)
    .maybeSingle();

  const targetPlayer = Array.isArray(queueEntry?.players) ? queueEntry?.players[0] : queueEntry?.players;
  const targetPosition = targetPlayer?.position;

  if (!queueEntry || !targetPosition) {
    throw new Error("Could not find that queued Hunt target.");
  }

  return {
    id: queueEntry.id,
    targetPlayerId: queueEntry.target_player_id,
    targetPosition,
  };
}

async function validateOwnedParticipant({
  supabase,
  userId,
  leagueId,
  participantId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  leagueId: string;
  participantId: string;
}) {
  const { data: participant } = await supabase
    .from("league_participants")
    .select("id")
    .eq("id", participantId)
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .eq("participant_type", "human")
    .maybeSingle();

  if (!participant) {
    throw new Error("Could not find your House in this Guild.");
  }
}

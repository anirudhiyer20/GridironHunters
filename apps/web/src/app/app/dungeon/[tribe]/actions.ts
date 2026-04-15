"use server";

import { TRIBE_DETAILS, TRIBE_NAMES, type TribeName } from "@gridiron/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

function getTribeReturnPath(tribe: TribeName) {
  return `/app/dungeon/${TRIBE_DETAILS[tribe].slug}`;
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

    if (draftedTarget) {
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
    redirect(`${getTribeReturnPath(tribe)}?message=${encodeMessage(message)}`);
  }

  revalidatePath(getTribeReturnPath(tribe));
  redirect(`${getTribeReturnPath(tribe)}?message=${encodeMessage("Wild Player added to Hunt Queue.")}`);
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
    redirect(`${getTribeReturnPath(tribe)}?message=${encodeMessage(message)}`);
  }

  revalidatePath(getTribeReturnPath(tribe));
  redirect(`${getTribeReturnPath(tribe)}?message=${encodeMessage("Wild Player removed from Hunt Queue.")}`);
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

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const queueEntryId = readRequired(formData, "queue_entry_id");
    const challengerDraftPickId = readRequired(formData, "challenger_draft_pick_id");
    tribe = readTribe(readRequired(formData, "target_tribe"));
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
    redirect(`${getTribeReturnPath(tribe)}?message=${encodeMessage(message)}`);
  }

  revalidatePath(getTribeReturnPath(tribe));
  redirect(`${getTribeReturnPath(tribe)}?message=${encodeMessage("Hunt challenger assigned.")}`);
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

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const queueEntryId = readRequired(formData, "queue_entry_id");
    tribe = readTribe(readRequired(formData, "target_tribe"));
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
    redirect(`${getTribeReturnPath(tribe)}?message=${encodeMessage(message)}`);
  }

  revalidatePath(getTribeReturnPath(tribe));
  redirect(`${getTribeReturnPath(tribe)}?message=${encodeMessage("Hunt challenger cleared.")}`);
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

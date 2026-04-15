"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const ARENA_SLOTS = ["qb", "rb", "wr", "te", "flex-1", "flex-2"] as const;
const DUNGEON_SLOTS = ["dungeon-1", "dungeon-2", "dungeon-3"] as const;

type AssignmentType = "arena" | "dungeon";

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

function readAssignmentType(value: string): AssignmentType {
  if (value === "arena" || value === "dungeon") {
    return value;
  }

  throw new Error("Unknown Party assignment type.");
}

function validateSlot(type: AssignmentType, slotKey: string) {
  const validSlots: readonly string[] = type === "arena" ? ARENA_SLOTS : DUNGEON_SLOTS;
  if (!validSlots.includes(slotKey)) {
    throw new Error("Unknown Party assignment slot.");
  }
}

function validateArenaEligibility(slotKey: string, position: string | null) {
  if (!position) {
    throw new Error("That player does not have a valid Draft position.");
  }

  if (slotKey === "flex-1" || slotKey === "flex-2") {
    if (position === "RB" || position === "WR" || position === "TE") {
      return;
    }

    throw new Error("Only RB, WR, or TE can be assigned to FLEX.");
  }

  if (position.toLowerCase() !== slotKey) {
    throw new Error(`Only ${slotKey.toUpperCase()} can be assigned to this Arena slot.`);
  }
}

export async function savePartyAssignment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before setting your Party."));
  }

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const draftPickId = readRequired(formData, "draft_pick_id");
    const assignmentType = readAssignmentType(readRequired(formData, "assignment_type"));
    const slotKey = readRequired(formData, "slot_key");

    validateSlot(assignmentType, slotKey);

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

    const { data: draftedPick } = await supabase
      .from("draft_picks")
      .select("id, picked_position")
      .eq("id", draftPickId)
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .in("status", ["made", "autopicked"])
      .maybeSingle();

    if (!draftedPick) {
      throw new Error("That player is not in your Party.");
    }

    if (assignmentType === "arena") {
      validateArenaEligibility(slotKey, draftedPick.picked_position);
    }

    const { error: moveError } = await supabase
      .from("party_assignments")
      .delete()
      .eq("participant_id", participantId)
      .eq("draft_pick_id", draftPickId)
      .neq("slot_key", slotKey);

    if (moveError) {
      throw new Error(moveError.message);
    }

    const { error } = await supabase.from("party_assignments").upsert(
      {
        league_id: leagueId,
        participant_id: participantId,
        draft_pick_id: draftPickId,
        assignment_type: assignmentType,
        slot_key: slotKey,
      },
      {
        onConflict: "participant_id,assignment_type,slot_key",
      },
    );

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save Party assignment.";
    redirect("/app/house/party?message=" + encodeMessage(message));
  }

  revalidatePath("/app/house/party");
  redirect("/app/house/party?message=" + encodeMessage("Party assignment saved."));
}

export async function clearPartyAssignment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before setting your Party."));
  }

  try {
    const leagueId = readRequired(formData, "league_id");
    const participantId = readRequired(formData, "participant_id");
    const assignmentType = readAssignmentType(readRequired(formData, "assignment_type"));
    const slotKey = readRequired(formData, "slot_key");

    validateSlot(assignmentType, slotKey);

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
      .from("party_assignments")
      .delete()
      .eq("league_id", leagueId)
      .eq("participant_id", participantId)
      .eq("assignment_type", assignmentType)
      .eq("slot_key", slotKey);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear Party assignment.";
    redirect("/app/house/party?message=" + encodeMessage(message));
  }

  revalidatePath("/app/house/party");
  redirect("/app/house/party?message=" + encodeMessage("Party slot cleared."));
}

export async function confirmPartySquad() {
  revalidatePath("/app/house/party");
  redirect("/app/house/party?message=" + encodeMessage("Squad confirmed. You can enter the Duel Dais when ready."));
}

import { type DraftPosition, type TribeName } from "@gridiron/shared";

import { createClient } from "@/lib/supabase/server";
import { getRoomAvatarAppearance, normalizeCharacter } from "../house/wardrobe/wardrobe-model";

export const ARENA_SLOT_LAYOUT = [
  { key: "flex-1", label: "FLEX", position: "FLEX" as const },
  { key: "wr", label: "WR", position: "WR" as const },
  { key: "rb", label: "RB", position: "RB" as const },
  { key: "qb", label: "QB", position: "QB" as const },
  { key: "te", label: "TE", position: "TE" as const },
  { key: "flex-2", label: "FLEX", position: "FLEX" as const },
] as const;

type ArenaSlotKey = (typeof ARENA_SLOT_LAYOUT)[number]["key"];

type LeagueParticipantRow = {
  id: string;
  user_id: string | null;
  participant_type: "human" | "bot";
  display_name: string;
};

type PartyAssignmentRow = {
  participant_id: string;
  slot_key: string;
  draft_pick_id: string;
};

type DraftPickRow = {
  id: string;
  picked_player_id: string | null;
  picked_player_name: string | null;
  picked_position: DraftPosition | null;
};

type PlayerRow = {
  id: string;
  nfl_team: string | null;
  tribe: TribeName | null;
};

type UserCharacterRow = {
  user_id: string;
  character_name: string | null;
  archetype: string | null;
  body_frame: string | null;
  skin_tone: string | null;
  hair_style: string | null;
  hair_color: string | null;
  outfit_style: string | null;
  cloak_color: string | null;
  accent_color: string | null;
  shirt_color: string | null;
  pants_color: string | null;
  crest: string | null;
  pose: string | null;
};

export type ArenaLineupEntry = {
  slotKey: ArenaSlotKey;
  slotLabel: string;
  position: DraftPosition | "FLEX";
  playerName: string | null;
  playerTeam: string | null;
  tribe: TribeName | null;
  actualScore: number;
  projectedScore: number;
};

export type ArenaFighter = {
  participantId: string;
  displayName: string;
  appearance: ReturnType<typeof getRoomAvatarAppearance>;
  lineup: ArenaLineupEntry[];
  actualTotal: number;
  projectedTotal: number;
};

export type ArenaViewContext = {
  leagueId: string;
  leagueName: string;
  userFighter: ArenaFighter;
  opponentFighter: ArenaFighter;
  selectedOpponentId: string;
  prevOpponentId: string;
  nextOpponentId: string;
  matchupCount: number;
  matchupIndex: number;
};

function buildEmptyLineup(): ArenaLineupEntry[] {
  return ARENA_SLOT_LAYOUT.map((slot) => ({
    slotKey: slot.key,
    slotLabel: slot.label,
    position: slot.position,
    playerName: null,
    playerTeam: null,
    tribe: null,
    actualScore: 0,
    projectedScore: 0,
  }));
}

function buildFighterLineup(
  participantId: string,
  assignments: PartyAssignmentRow[],
  picksById: Map<string, DraftPickRow>,
  playersById: Map<string, PlayerRow>,
): ArenaLineupEntry[] {
  const slotToPickId = new Map(
    assignments
      .filter((assignment) => assignment.participant_id === participantId)
      .map((assignment) => [assignment.slot_key, assignment.draft_pick_id]),
  );

  return ARENA_SLOT_LAYOUT.map((slot) => {
    const draftPickId = slotToPickId.get(slot.key);
    const pick = draftPickId ? picksById.get(draftPickId) : null;
    const player = pick?.picked_player_id ? playersById.get(pick.picked_player_id) : null;

    return {
      slotKey: slot.key,
      slotLabel: slot.label,
      position: slot.position,
      playerName: pick?.picked_player_name ?? null,
      playerTeam: player?.nfl_team ?? null,
      tribe: player?.tribe ?? null,
      actualScore: 0,
      projectedScore: 0,
    };
  });
}

function sumLineupScore(lineup: ArenaLineupEntry[], key: "actualScore" | "projectedScore") {
  return lineup.reduce((total, entry) => total + (entry[key] ?? 0), 0);
}

function formatFallbackName(participant: LeagueParticipantRow) {
  if (participant.participant_type === "bot") {
    return participant.display_name;
  }

  return participant.display_name || "Guildmate";
}

export async function getArenaViewContext(
  requestedOpponentId: string | null | undefined,
): Promise<ArenaViewContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return null;
  }

  const { data: memberships } = await supabase
    .from("league_members")
    .select("joined_at, leagues!inner(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1);

  const league = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;

  if (!league) {
    return null;
  }

  const { data: participantRows } = await supabase
    .from("league_participants")
    .select("id, user_id, participant_type, display_name")
    .eq("league_id", league.id)
    .order("joined_at", { ascending: true });

  const participants = (participantRows ?? []) as LeagueParticipantRow[];
  const userParticipant = participants.find((participant) => participant.user_id === user.id);

  if (!userParticipant) {
    return null;
  }

  const opponents = participants.filter((participant) => participant.id !== userParticipant.id);
  if (opponents.length === 0) {
    return null;
  }

  const selectedOpponent =
    opponents.find((participant) => participant.id === requestedOpponentId) ?? opponents[0];
  const opponentIndex = opponents.findIndex((participant) => participant.id === selectedOpponent.id);
  const prevOpponent = opponents[(opponentIndex - 1 + opponents.length) % opponents.length];
  const nextOpponent = opponents[(opponentIndex + 1) % opponents.length];

  const selectedParticipantIds = [userParticipant.id, selectedOpponent.id];
  const { data: assignmentRows } = await supabase
    .from("party_assignments")
    .select("participant_id, slot_key, draft_pick_id")
    .eq("assignment_type", "arena")
    .in("participant_id", selectedParticipantIds);
  const assignments = (assignmentRows ?? []) as PartyAssignmentRow[];

  const draftPickIds = assignments.map((assignment) => assignment.draft_pick_id);
  const { data: draftPickRows } = draftPickIds.length
    ? await supabase
        .from("draft_picks")
        .select("id, picked_player_id, picked_player_name, picked_position")
        .in("id", draftPickIds)
    : { data: [] };
  const picks = (draftPickRows ?? []) as DraftPickRow[];
  const picksById = new Map(picks.map((pick) => [pick.id, pick]));

  const playerIds = picks
    .map((pick) => pick.picked_player_id)
    .filter((playerId): playerId is string => Boolean(playerId));
  const { data: playerRows } = playerIds.length
    ? await supabase
        .from("players")
        .select("id, nfl_team, tribe")
        .in("id", playerIds)
    : { data: [] };
  const players = (playerRows ?? []) as PlayerRow[];
  const playersById = new Map(players.map((player) => [player.id, player]));

  const characterUserIds = [userParticipant.user_id, selectedOpponent.user_id].filter(
    (userId): userId is string => Boolean(userId),
  );
  const { data: characterRows } = characterUserIds.length
    ? await supabase
        .from("user_characters")
        .select(
          "user_id, character_name, archetype, body_frame, skin_tone, hair_style, hair_color, outfit_style, cloak_color, accent_color, shirt_color, pants_color, crest, pose",
        )
        .in("user_id", characterUserIds)
    : { data: [] };
  const charactersByUserId = new Map(
    ((characterRows ?? []) as UserCharacterRow[]).map((row) => [row.user_id, row]),
  );

  const userLineup = buildFighterLineup(userParticipant.id, assignments, picksById, playersById);
  const opponentLineup = buildFighterLineup(selectedOpponent.id, assignments, picksById, playersById);

  const userCharacter = normalizeCharacter(
    userParticipant.user_id ? charactersByUserId.get(userParticipant.user_id) ?? null : null,
  );
  const opponentCharacter = normalizeCharacter(
    selectedOpponent.user_id ? charactersByUserId.get(selectedOpponent.user_id) ?? null : null,
  );

  return {
    leagueId: league.id,
    leagueName: league.name,
    userFighter: {
      participantId: userParticipant.id,
      displayName: formatFallbackName(userParticipant),
      appearance: getRoomAvatarAppearance(userCharacter),
      lineup: userLineup.length ? userLineup : buildEmptyLineup(),
      actualTotal: sumLineupScore(userLineup, "actualScore"),
      projectedTotal: sumLineupScore(userLineup, "projectedScore"),
    },
    opponentFighter: {
      participantId: selectedOpponent.id,
      displayName: formatFallbackName(selectedOpponent),
      appearance: getRoomAvatarAppearance(opponentCharacter),
      lineup: opponentLineup.length ? opponentLineup : buildEmptyLineup(),
      actualTotal: sumLineupScore(opponentLineup, "actualScore"),
      projectedTotal: sumLineupScore(opponentLineup, "projectedScore"),
    },
    selectedOpponentId: selectedOpponent.id,
    prevOpponentId: prevOpponent.id,
    nextOpponentId: nextOpponent.id,
    matchupCount: opponents.length,
    matchupIndex: opponentIndex + 1,
  };
}

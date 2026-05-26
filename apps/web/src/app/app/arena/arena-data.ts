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

type LeagueMatchupRow = {
  week_number: number;
  matchup_index: number;
  left_participant_id: string;
  right_participant_id: string;
  status: "scheduled" | "live" | "final";
  left_score: number | null;
  right_score: number | null;
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
  currentWeekNumber: number;
  selectedScoreboardWeekNumber: number;
  seasonWeekCount: number;
  userFighter: ArenaFighter;
  opponentFighter: ArenaFighter;
  userParticipantId: string;
  selectedUserOpponentId: string | null;
  isSelectedMatchupUserMatchup: boolean;
  selectedOpponentId: string;
  prevOpponentId: string | null;
  nextOpponentId: string | null;
  matchupCount: number;
  matchupIndex: number;
  scoreboardWeeks: ArenaScoreboardWeek[];
};

export type ArenaScoreboardMatchup = {
  leftParticipantId: string;
  leftName: string;
  rightParticipantId: string;
  rightName: string;
  leftScore: number | null;
  rightScore: number | null;
  status: "scheduled" | "live" | "final";
  isUserMatchup: boolean;
  isSelectedMatchup: boolean;
};

export type ArenaScoreboardWeek = {
  weekNumber: number;
  status: "past" | "current" | "future";
  matchups: ArenaScoreboardMatchup[];
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

type WeekMatchup = {
  leftParticipantId: string;
  rightParticipantId: string;
};

function buildRoundRobinSchedule(participants: LeagueParticipantRow[]): WeekMatchup[][] {
  if (participants.length < 2) {
    return [];
  }

  const BYE = "__bye__";
  const initialIds = participants.map((participant) => participant.id);
  const ids = initialIds.length % 2 === 0 ? initialIds : [...initialIds, BYE];
  const teamCount = ids.length;
  const weekCount = teamCount - 1;
  const schedule: WeekMatchup[][] = [];
  let rotation = ids.slice();

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const weekMatchups: WeekMatchup[] = [];
    for (let pairIndex = 0; pairIndex < teamCount / 2; pairIndex += 1) {
      const left = rotation[pairIndex];
      const right = rotation[teamCount - 1 - pairIndex];
      if (left !== BYE && right !== BYE) {
        weekMatchups.push({
          leftParticipantId: left,
          rightParticipantId: right,
        });
      }
    }
    schedule.push(weekMatchups);
    rotation = [rotation[0], rotation[teamCount - 1], ...rotation.slice(1, teamCount - 1)];
  }

  return schedule;
}

function wrapsToSeasonWeek(currentWeekNumber: number, seasonWeekCount: number) {
  if (seasonWeekCount <= 0) {
    return 1;
  }
  return ((currentWeekNumber - 1) % seasonWeekCount) + 1;
}

function toFallbackMatchupRows(schedule: WeekMatchup[][]): LeagueMatchupRow[] {
  const rows: LeagueMatchupRow[] = [];
  schedule.forEach((weekMatchups, weekIndex) => {
    weekMatchups.forEach((matchup, matchupIndex) => {
      rows.push({
        week_number: weekIndex + 1,
        matchup_index: matchupIndex + 1,
        left_participant_id: matchup.leftParticipantId,
        right_participant_id: matchup.rightParticipantId,
        status: "scheduled",
        left_score: null,
        right_score: null,
      });
    });
  });
  return rows;
}

function groupMatchupsByWeek(rows: LeagueMatchupRow[]) {
  const byWeek = new Map<number, LeagueMatchupRow[]>();
  for (const row of rows) {
    const existing = byWeek.get(row.week_number);
    if (existing) {
      existing.push(row);
    } else {
      byWeek.set(row.week_number, [row]);
    }
  }

  for (const weekRows of byWeek.values()) {
    weekRows.sort((a, b) => a.matchup_index - b.matchup_index);
  }

  return byWeek;
}

export async function getArenaViewContext(
  requestedOpponentId: string | null | undefined,
  requestedWeekNumber: number | null | undefined,
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

  const { data: latestGrantRow } = await supabase
    .from("battle_key_grants")
    .select("week_number")
    .eq("league_id", league.id)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentWeekNumber = latestGrantRow?.week_number ?? 1;

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

  await supabase.rpc("ensure_league_matchups", { p_league_id: league.id });

  const { data: persistedMatchupRows } = await supabase
    .from("league_matchups")
    .select(
      "week_number, matchup_index, left_participant_id, right_participant_id, status, left_score, right_score",
    )
    .eq("league_id", league.id)
    .order("week_number", { ascending: true })
    .order("matchup_index", { ascending: true });

  const persistedRows = (persistedMatchupRows ?? []) as LeagueMatchupRow[];
  const fallbackRows = toFallbackMatchupRows(buildRoundRobinSchedule(participants));
  const matchupRows = persistedRows.length ? persistedRows : fallbackRows;

  const seasonWeekCount =
    matchupRows.reduce((maxWeek, row) => Math.max(maxWeek, row.week_number), 0) || 1;
  const matchupsByWeek = groupMatchupsByWeek(matchupRows);
  const seasonWeekNumber = wrapsToSeasonWeek(currentWeekNumber, seasonWeekCount);
  const selectedScoreboardWeekNumber =
    requestedWeekNumber && Number.isInteger(requestedWeekNumber) && requestedWeekNumber >= 1
      ? Math.min(requestedWeekNumber, seasonWeekCount)
      : seasonWeekNumber;
  const weekMatchups = matchupsByWeek.get(seasonWeekNumber) ?? [];
  if (!weekMatchups.length) {
    return null;
  }

  const userMatchup =
    weekMatchups.find(
      (matchup) =>
        matchup.left_participant_id === userParticipant.id ||
        matchup.right_participant_id === userParticipant.id,
    ) ?? null;

  const selectedMatchup =
    (requestedOpponentId
      ? weekMatchups.find(
          (matchup) =>
            matchup.left_participant_id === requestedOpponentId ||
            matchup.right_participant_id === requestedOpponentId,
        )
      : null) ??
    userMatchup ??
    weekMatchups[0];

  const matchupIndex = weekMatchups.findIndex(
    (matchup) =>
      matchup.left_participant_id === selectedMatchup.left_participant_id &&
      matchup.right_participant_id === selectedMatchup.right_participant_id,
  );

  const prevMatchup = matchupIndex > 0 ? weekMatchups[matchupIndex - 1] : null;
  const nextMatchup = matchupIndex < weekMatchups.length - 1 ? weekMatchups[matchupIndex + 1] : null;

  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const leftParticipant = participantById.get(selectedMatchup.left_participant_id);
  const rightParticipant = participantById.get(selectedMatchup.right_participant_id);

  if (!leftParticipant || !rightParticipant) {
    return null;
  }

  const selectedParticipantIds = [leftParticipant.id, rightParticipant.id];
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

  const characterUserIds = [leftParticipant.user_id, rightParticipant.user_id].filter(
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

  const userLineup = buildFighterLineup(leftParticipant.id, assignments, picksById, playersById);
  const opponentLineup = buildFighterLineup(rightParticipant.id, assignments, picksById, playersById);

  const userCharacter = normalizeCharacter(
    leftParticipant.user_id ? charactersByUserId.get(leftParticipant.user_id) ?? null : null,
  );
  const opponentCharacter = normalizeCharacter(
    rightParticipant.user_id ? charactersByUserId.get(rightParticipant.user_id) ?? null : null,
  );

  const isSelectedMatchupUserMatchup =
    selectedMatchup.left_participant_id === userParticipant.id ||
    selectedMatchup.right_participant_id === userParticipant.id;
  const selectedUserOpponentId = isSelectedMatchupUserMatchup
    ? selectedMatchup.left_participant_id === userParticipant.id
      ? selectedMatchup.right_participant_id
      : selectedMatchup.left_participant_id
      : null;

  const scoreboardWeeks: ArenaScoreboardWeek[] = Array.from({ length: seasonWeekCount }, (_, index) => {
    const weekNumber = index + 1;
    const scheduleWeek = matchupsByWeek.get(weekNumber) ?? [];
    const weekStatus: ArenaScoreboardWeek["status"] =
      weekNumber < seasonWeekNumber ? "past" : weekNumber === seasonWeekNumber ? "current" : "future";

    return {
      weekNumber,
      status: weekStatus,
      matchups: scheduleWeek.map((matchup) => {
        const left = participantById.get(matchup.left_participant_id);
        const right = participantById.get(matchup.right_participant_id);
        const isSelectedMatchup =
          weekNumber === seasonWeekNumber &&
          matchup.left_participant_id === selectedMatchup.left_participant_id &&
          matchup.right_participant_id === selectedMatchup.right_participant_id;

        const leftScoreFromRow = matchup.left_score;
        const rightScoreFromRow = matchup.right_score;

        return {
          leftParticipantId: matchup.left_participant_id,
          leftName: left ? formatFallbackName(left) : "Unknown House",
          rightParticipantId: matchup.right_participant_id,
          rightName: right ? formatFallbackName(right) : "Unknown House",
          leftScore:
            isSelectedMatchup && leftParticipant.id === matchup.left_participant_id
              ? sumLineupScore(userLineup, "actualScore")
              : isSelectedMatchup && rightParticipant.id === matchup.left_participant_id
                ? sumLineupScore(opponentLineup, "actualScore")
                : leftScoreFromRow,
          rightScore:
            isSelectedMatchup && leftParticipant.id === matchup.right_participant_id
              ? sumLineupScore(userLineup, "actualScore")
              : isSelectedMatchup && rightParticipant.id === matchup.right_participant_id
                ? sumLineupScore(opponentLineup, "actualScore")
                : rightScoreFromRow,
          status: matchup.status,
          isUserMatchup:
            matchup.left_participant_id === userParticipant.id ||
            matchup.right_participant_id === userParticipant.id,
          isSelectedMatchup,
        } satisfies ArenaScoreboardMatchup;
      }),
    };
  });

  return {
    leagueId: league.id,
    leagueName: league.name,
    currentWeekNumber: seasonWeekNumber,
    selectedScoreboardWeekNumber,
    seasonWeekCount,
    userFighter: {
      participantId: leftParticipant.id,
      displayName: formatFallbackName(leftParticipant),
      appearance: getRoomAvatarAppearance(userCharacter),
      lineup: userLineup.length ? userLineup : buildEmptyLineup(),
      actualTotal: sumLineupScore(userLineup, "actualScore"),
      projectedTotal: sumLineupScore(userLineup, "projectedScore"),
    },
    opponentFighter: {
      participantId: rightParticipant.id,
      displayName: formatFallbackName(rightParticipant),
      appearance: getRoomAvatarAppearance(opponentCharacter),
      lineup: opponentLineup.length ? opponentLineup : buildEmptyLineup(),
      actualTotal: sumLineupScore(opponentLineup, "actualScore"),
      projectedTotal: sumLineupScore(opponentLineup, "projectedScore"),
    },
    userParticipantId: userParticipant.id,
    selectedUserOpponentId,
    isSelectedMatchupUserMatchup,
    selectedOpponentId: selectedMatchup.left_participant_id,
    prevOpponentId: prevMatchup?.left_participant_id ?? null,
    nextOpponentId: nextMatchup?.left_participant_id ?? null,
    matchupCount: weekMatchups.length,
    matchupIndex: matchupIndex + 1,
    scoreboardWeeks,
  };
}

import { TRIBE_NAMES, type DraftPosition, type TribeName } from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

import {
  HuntSlateClient,
} from "./hunt-slate-client";
import type {
  HuntAttemptSummary,
  HuntChallengerCandidate,
  HuntTargetPlayer,
  QueuedHuntChallenger,
  QueuedHuntTarget,
} from "../[tribe]/hunt-board-client";

type PartyAssignment = {
  assignment_type: "arena" | "dungeon";
  slot_key: string;
  draft_pick_id: string;
};

type DraftPickRow = {
  id: string;
  picked_player_id: string | null;
  picked_player_name: string | null;
  picked_position: string | null;
};

type PlayerRow = {
  id: string;
  full_name?: string | null;
  position?: DraftPosition | string | null;
  nfl_team: string | null;
  tribe: TribeName | "Unclaimed" | null;
  provider_value?: number | null;
  provider_overall_rank?: number | null;
};

type HuntQueueRow = {
  id: string;
  queue_rank: number;
  target_player_id: string;
  target_tribe: TribeName;
};

type HuntChallengerRow = {
  id: string;
  hunt_queue_entry_id: string;
  challenger_draft_pick_id: string;
  challenger_slot: 1 | 2;
};

type HuntAttemptRow = {
  id: string;
  hunt_queue_entry_id: string;
  status: "submitted" | "resolved";
  result: "captured" | "escaped" | null;
  battle_keys_spent: number;
  target_score: number | null;
  best_challenger_score: number | null;
};

type HuntAttemptChallengerRow = {
  hunt_attempt_id: string;
  challenger_draft_pick_id: string;
};

const BATTLE_KEY_TOTAL = 12;

export default async function HuntSlatePage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const { message } = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: memberships } = await supabase
    .from("league_members")
    .select("joined_at, leagues!inner(id, name, slug, season, status)")
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });
  const currentGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;
  const { data: participant } = currentGuild
    ? await supabase
        .from("league_participants")
        .select("id")
        .eq("league_id", currentGuild.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle()
    : { data: null };

  const { data: partyPickRows } = participant?.id
    ? await supabase
        .from("draft_picks")
        .select("id, picked_player_id, picked_player_name, picked_position")
        .eq("participant_id", participant.id)
        .in("status", ["made", "autopicked"])
    : { data: [] };
  const partyPicks = (partyPickRows ?? []) as DraftPickRow[];
  const partyPlayerIds = partyPicks
    .map((pick) => pick.picked_player_id)
    .filter((id): id is string => Boolean(id));
  const { data: partyPlayerRows } = partyPlayerIds.length
    ? await supabase.from("players").select("id, nfl_team, tribe").in("id", partyPlayerIds)
    : { data: [] };
  const partyPlayersById = new Map((partyPlayerRows ?? []).map((player) => [player.id, player as PlayerRow]));
  const { data: assignmentRows } = participant?.id
    ? await supabase
        .from("party_assignments")
        .select("assignment_type, slot_key, draft_pick_id")
        .eq("participant_id", participant.id)
    : { data: [] };
  const arenaDraftPickIds = new Set(
    ((assignmentRows ?? []) as PartyAssignment[])
      .filter((assignment) => assignment.assignment_type === "arena")
      .map((assignment) => assignment.draft_pick_id),
  );
  const challengerCandidates = partyPicks
    .map((pick): HuntChallengerCandidate | null => {
      if (!isDraftPosition(pick.picked_position)) return null;

      const player = pick.picked_player_id ? partyPlayersById.get(pick.picked_player_id) : null;

      return {
        draftPickId: pick.id,
        name: pick.picked_player_name ?? "Unknown Player",
        position: pick.picked_position,
        nflTeam: player?.nfl_team ?? "Unknown",
        tribe: player?.tribe ?? "Unclaimed",
        isInArenaLineup: arenaDraftPickIds.has(pick.id),
      };
    })
    .filter((candidate): candidate is HuntChallengerCandidate => Boolean(candidate));

  const { data: huntQueueRows } = participant?.id && currentGuild?.id
    ? await supabase
        .from("hunt_queue_entries")
        .select("id, queue_rank, target_player_id, target_tribe")
        .eq("league_id", currentGuild.id)
        .eq("participant_id", participant.id)
        .order("target_tribe", { ascending: true })
        .order("queue_rank", { ascending: true })
    : { data: [] };
  const queuedRows = ((huntQueueRows ?? []) as HuntQueueRow[]).filter((row) => isTribeName(row.target_tribe));
  const queuedPlayerIds = queuedRows.map((row) => row.target_player_id);
  const { data: queuedPlayerRows } = queuedPlayerIds.length
    ? await supabase
        .from("players")
        .select("id, full_name, position, nfl_team, tribe, provider_value, provider_overall_rank")
        .in("id", queuedPlayerIds)
    : { data: [] };
  const queuedPlayersById = new Map((queuedPlayerRows ?? []).map((player) => [player.id, player as PlayerRow]));
  const queueEntryIds = queuedRows.map((row) => row.id);
  const { data: huntChallengerRows } = queueEntryIds.length
    ? await supabase
        .from("hunt_challengers")
        .select("id, hunt_queue_entry_id, challenger_draft_pick_id, challenger_slot")
        .in("hunt_queue_entry_id", queueEntryIds)
        .order("challenger_slot", { ascending: true })
    : { data: [] };
  const { data: huntAttemptRows } = queueEntryIds.length
    ? await supabase
        .from("hunt_attempts")
        .select("id, hunt_queue_entry_id, status, result, battle_keys_spent, target_score, best_challenger_score")
        .in("hunt_queue_entry_id", queueEntryIds)
    : { data: [] };
  const attemptRows = (huntAttemptRows ?? []) as HuntAttemptRow[];
  const attemptIds = attemptRows.map((attempt) => attempt.id);
  const { data: huntAttemptChallengerRows } = attemptIds.length
    ? await supabase
        .from("hunt_attempt_challengers")
        .select("hunt_attempt_id, challenger_draft_pick_id")
        .in("hunt_attempt_id", attemptIds)
    : { data: [] };
  const challengerIdsByAttemptId = ((huntAttemptChallengerRows ?? []) as HuntAttemptChallengerRow[]).reduce<Record<string, string[]>>((acc, row) => {
    acc[row.hunt_attempt_id] ??= [];
    acc[row.hunt_attempt_id].push(row.challenger_draft_pick_id);
    return acc;
  }, {});
  const attemptsByQueueEntryId = new Map(
    attemptRows.map((attempt) => [
      attempt.hunt_queue_entry_id,
      {
        id: attempt.id,
        status: attempt.status,
        result: attempt.result,
        battleKeysSpent: attempt.battle_keys_spent,
        targetScore: attempt.target_score,
        bestChallengerScore: attempt.best_challenger_score,
        challengerDraftPickIds: challengerIdsByAttemptId[attempt.id] ?? [],
      } satisfies HuntAttemptSummary,
    ]),
  );
  const challengerRows = (huntChallengerRows ?? []) as HuntChallengerRow[];
  const challengerDraftPickIds = challengerRows.map((row) => row.challenger_draft_pick_id);
  const { data: challengerDraftPickRows } = challengerDraftPickIds.length
    ? await supabase
        .from("draft_picks")
        .select("id, picked_player_id, picked_player_name, picked_position")
        .in("id", challengerDraftPickIds)
    : { data: [] };
  const challengerDraftPicksById = new Map((challengerDraftPickRows ?? []).map((pick) => [pick.id, pick as DraftPickRow]));
  const challengerPlayerIds = (challengerDraftPickRows ?? [])
    .map((pick) => pick.picked_player_id)
    .filter((id): id is string => Boolean(id));
  const { data: challengerPlayerRows } = challengerPlayerIds.length
    ? await supabase.from("players").select("id, nfl_team, tribe").in("id", challengerPlayerIds)
    : { data: [] };
  const challengerPlayersById = new Map((challengerPlayerRows ?? []).map((player) => [player.id, player as PlayerRow]));
  const challengersByQueueEntryId = challengerRows.reduce<Record<string, Array<QueuedHuntChallenger | null>>>((acc, row) => {
    const pick = challengerDraftPicksById.get(row.challenger_draft_pick_id);

    if (!pick || !isDraftPosition(pick.picked_position)) {
      return acc;
    }

    const player = pick.picked_player_id ? challengerPlayersById.get(pick.picked_player_id) : null;
    acc[row.hunt_queue_entry_id] ??= [null, null];
    acc[row.hunt_queue_entry_id][row.challenger_slot - 1] = {
      queueChallengerId: row.id,
      challengerSlot: row.challenger_slot,
      draftPickId: pick.id,
      name: pick.picked_player_name ?? "Unknown Player",
      position: pick.picked_position,
      nflTeam: player?.nfl_team ?? "Unknown",
      tribe: player?.tribe ?? "Unclaimed",
    };

    return acc;
  }, {});
  const queuedTargets = queuedRows
    .map((row): QueuedHuntTarget | null => {
      const player = mapTargetPlayer(queuedPlayersById.get(row.target_player_id));

      if (!player) return null;

      return {
        ...player,
        tribe: row.target_tribe,
        queueEntryId: row.id,
        queueRank: row.queue_rank,
        challengers: challengersByQueueEntryId[row.id] ?? [null, null],
        attempt: attemptsByQueueEntryId.get(row.id) ?? null,
      };
    })
    .filter((target): target is QueuedHuntTarget => Boolean(target));

  return (
    <PageShell
      eyebrow="Dungeon / Hunts"
      title="Hunt Slate"
    >
      <HuntSlateClient
        leagueId={currentGuild?.id ?? null}
        participantId={participant?.id ?? null}
        message={message}
        queuedTargets={queuedTargets}
        challengerCandidates={challengerCandidates}
        battleKeyTotal={BATTLE_KEY_TOTAL}
      />
    </PageShell>
  );
}

function mapTargetPlayer(player: PlayerRow | null | undefined): HuntTargetPlayer | null {
  if (!player || !player.full_name || !isDraftPosition(player.position) || !isTribeName(player.tribe)) {
    return null;
  }

  return {
    id: player.id,
    fullName: player.full_name,
    position: player.position,
    nflTeam: player.nfl_team ?? "FA",
    tribe: player.tribe,
    providerValue: player.provider_value ?? null,
    providerOverallRank: player.provider_overall_rank ?? null,
  };
}

function isDraftPosition(position: string | null | undefined): position is DraftPosition {
  return position === "QB" || position === "RB" || position === "WR" || position === "TE";
}

function isTribeName(tribe: string | null | undefined): tribe is TribeName {
  return TRIBE_NAMES.includes(tribe as TribeName);
}

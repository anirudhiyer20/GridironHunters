import {
  FANTASY_TERMS,
  MVP_DRAFT_ROSTER_SIZE,
  MVP_REQUIRED_POSITION_COUNTS,
  type DraftPosition,
  type TribeName,
} from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

import { PartyChestClient, type HuntAssignment, type PartyChestPlayer } from "./party-chest-client";

type PartyChestPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

function houseNameFromEmail(email: string | null | undefined) {
  if (!email) return "The Ember House";

  const root = email.split("@")[0]?.replace(/[^a-zA-Z0-9]+/g, " ").trim() || "Ember";
  const proper = root
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return `House of ${proper}`;
}

type DraftPick = {
  id: string;
  pick_number: number;
  picked_player_id: string | null;
  picked_player_name: string | null;
  picked_position: DraftPosition | null;
  status: string;
};

type PlayerRow = {
  id: string;
  full_name?: string | null;
  position?: DraftPosition | string | null;
  nfl_team: string | null;
  tribe: TribeName | "Unclaimed" | null;
};

type HuntCaptureRow = {
  id: string;
  player_id: string;
  week_number: number;
};

type PartyAssignment = {
  assignment_type: "arena" | "dungeon";
  slot_key: string;
  draft_pick_id: string;
};

type HuntChallengerRow = {
  id: string;
  hunt_queue_entry_id: string;
  challenger_draft_pick_id: string;
};

type HuntQueueRow = {
  id: string;
  target_player_id: string;
  target_tribe: TribeName;
};

const lineupOrder = ["QB", "RB", "WR", "TE"] as const;

export default async function PartyChestPage({ searchParams }: PartyChestPageProps) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const houseName = houseNameFromEmail(user?.email);

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

  const { data: picks } = participant?.id
    ? await supabase
        .from("draft_picks")
        .select("id, pick_number, picked_player_id, picked_player_name, picked_position, status")
        .eq("participant_id", participant.id)
        .in("status", ["made", "autopicked"])
        .order("pick_number", { ascending: true })
    : { data: [] };
  const { data: assignments } = participant?.id
    ? await supabase
        .from("party_assignments")
        .select("assignment_type, slot_key, draft_pick_id")
        .eq("participant_id", participant.id)
    : { data: [] };
  const { data: huntCaptureRows } = participant?.id && currentGuild?.id
    ? await supabase
        .from("hunt_captures")
        .select("id, player_id, week_number")
        .eq("league_id", currentGuild.id)
        .eq("participant_id", participant.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const partyPicks = (picks ?? []) as DraftPick[];
  const playerIds = partyPicks
    .map((pick) => pick.picked_player_id)
    .filter((id): id is string => Boolean(id));
  const { data: playerRows } = playerIds.length
    ? await supabase.from("players").select("id, nfl_team, tribe").in("id", playerIds)
    : { data: [] };
  const playersById = new Map((playerRows ?? []).map((player) => [player.id, player as PlayerRow]));
  const party = partyPicks.map((pick): PartyChestPlayer => {
    const player = pick.picked_player_id ? playersById.get(pick.picked_player_id) : null;
    const nflTeam = player?.nfl_team ?? "Unknown";

    return {
      id: pick.id,
      draftPickId: pick.id,
      pickNumber: pick.pick_number,
      name: pick.picked_player_name ?? "Unknown Player",
      position: pick.picked_position ?? "Unknown",
      nflTeam,
      tribe: player?.tribe ?? "Unclaimed",
    };
  });
  const capturedRows = (huntCaptureRows ?? []) as HuntCaptureRow[];
  const capturedPlayerIds = capturedRows.map((capture) => capture.player_id).filter((id): id is string => Boolean(id));
  const { data: capturedPlayerRows } = capturedPlayerIds.length
    ? await supabase
        .from("players")
        .select("id, full_name, position, nfl_team, tribe")
        .in("id", capturedPlayerIds)
    : { data: [] };
  const capturedPlayersById = new Map((capturedPlayerRows ?? []).map((player) => [player.id, player as PlayerRow]));
  const capturedRecruits = capturedRows
    .map((capture): PartyChestPlayer | null => {
      const player = capturedPlayersById.get(capture.player_id);

      if (!player || !player.full_name || !isDraftPosition(player.position)) {
        return null;
      }

      return {
        id: `captured-${capture.id}`,
        draftPickId: `captured-${capture.id}`,
        pickNumber: 0,
        name: player.full_name,
        position: player.position,
        nflTeam: player.nfl_team ?? "FA",
        tribe: player.tribe ?? "Unclaimed",
      };
    })
    .filter((player): player is PartyChestPlayer => Boolean(player));
  const partyByPickId = new Map(party.map((player) => [player.draftPickId, player]));
  const assignmentRows = (assignments ?? []) as PartyAssignment[];
  const assignmentPlayerBySlot = new Map(
    assignmentRows
      .map((assignment) => [
        `${assignment.assignment_type}:${assignment.slot_key}`,
        partyByPickId.get(assignment.draft_pick_id) ?? null,
      ] as const)
      .filter(([, player]) => Boolean(player)),
  );

  const coveredPositions = new Set(party.map((player) => player.position));
  const uncoveredRequiredPositions = (Object.entries(MVP_REQUIRED_POSITION_COUNTS) as Array<[DraftPosition, number]>)
    .filter(([position]) => !coveredPositions.has(position))
    .map(([position]) => position);
  const coreLineup = lineupOrder.map((position) => ({
    id: position.toLowerCase(),
    position,
    player: assignmentPlayerBySlot.get(`arena:${position.toLowerCase()}`) ?? null,
  }));
  const lineup = [
    ...coreLineup,
    { id: "flex-1", position: "FLEX" as const, player: assignmentPlayerBySlot.get("arena:flex-1") ?? null },
    { id: "flex-2", position: "FLEX" as const, player: assignmentPlayerBySlot.get("arena:flex-2") ?? null },
  ];
  const { data: huntChallengerRows } = participant?.id
    ? await supabase
        .from("hunt_challengers")
        .select("id, hunt_queue_entry_id, challenger_draft_pick_id")
        .eq("participant_id", participant.id)
    : { data: [] };
  const huntChallengers = (huntChallengerRows ?? []) as HuntChallengerRow[];
  const huntQueueEntryIds = huntChallengers.map((row) => row.hunt_queue_entry_id);
  const { data: huntQueueRows } = huntQueueEntryIds.length
    ? await supabase
        .from("hunt_queue_entries")
        .select("id, target_player_id, target_tribe")
        .in("id", huntQueueEntryIds)
    : { data: [] };
  const huntQueueById = new Map((huntQueueRows ?? []).map((row) => [row.id, row as HuntQueueRow]));
  const huntTargetPlayerIds = (huntQueueRows ?? []).map((row) => row.target_player_id);
  const { data: huntTargetRows } = huntTargetPlayerIds.length
    ? await supabase
        .from("players")
        .select("id, full_name, position, nfl_team, tribe")
        .in("id", huntTargetPlayerIds)
    : { data: [] };
  const huntTargetsById = new Map((huntTargetRows ?? []).map((row) => [row.id, row]));
  const huntAssignments = huntChallengers
    .map((row): HuntAssignment | null => {
      const queueEntry = huntQueueById.get(row.hunt_queue_entry_id);
      const challenger = partyByPickId.get(row.challenger_draft_pick_id);
      const target = queueEntry ? huntTargetsById.get(queueEntry.target_player_id) : null;

      if (!queueEntry || !challenger || !target || !target.full_name || !isDraftPosition(target.position) || !isTribeName(queueEntry.target_tribe)) {
        return null;
      }

      return {
        id: row.id,
        challengerName: challenger.name,
        challengerPosition: challenger.position === "Unknown" ? target.position : challenger.position,
        challengerTeam: challenger.nflTeam,
        targetName: target.full_name,
        targetPosition: target.position,
        targetTeam: target.nfl_team ?? "FA",
        targetTribe: queueEntry.target_tribe,
      };
    })
    .filter((assignment): assignment is HuntAssignment => Boolean(assignment));

  return (
    <PageShell
      eyebrow="House / Party Chest"
      title="Party Chest"
    >
      <div className="grid gap-6">
        {message ? (
          <p className="rounded-[1.2rem] border border-[#d7b46f]/25 bg-[#d7b46f]/10 px-4 py-3 text-sm text-[#fff4d8]">
            {message}
          </p>
        ) : null}

        <PartyChestClient
          party={party}
          capturedRecruits={capturedRecruits}
          lineup={lineup}
          huntAssignments={huntAssignments}
          leagueId={currentGuild?.id ?? null}
          participantId={participant?.id ?? null}
        />

        <div className="flex flex-wrap gap-3">
          <InfoCard label="House" value={houseName} />
          <InfoCard label={FANTASY_TERMS.league} value={currentGuild?.name ?? "No Guild Yet"} />
          <InfoCard label={FANTASY_TERMS.roster} value={`${party.length} / ${MVP_DRAFT_ROSTER_SIZE}`} />
          <InfoCard label="Needed Roles" value={uncoveredRequiredPositions.length ? uncoveredRequiredPositions.join(", ") : "Core Set Covered"} />
        </div>
      </div>
    </PageShell>
  );
}

function isDraftPosition(position: string | null | undefined): position is DraftPosition {
  return position === "QB" || position === "RB" || position === "WR" || position === "TE";
}

function isTribeName(tribe: string | null | undefined): tribe is TribeName {
  return tribe === "Combat" || tribe === "Forge" || tribe === "Storm" || tribe === "Tundra" || tribe === "Halo" || tribe === "Blaze" || tribe === "Shroud" || tribe === "Prowl";
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.68rem] text-[#c6ad7d]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#fff4d8]">{value}</p>
    </div>
  );
}

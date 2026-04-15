import {
  FANTASY_TERMS,
  MVP_DRAFT_ROSTER_SIZE,
  MVP_REQUIRED_POSITION_COUNTS,
  TRIBE_DETAILS,
  type DraftPosition,
  type TribeName,
} from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

import { PartyChestClient, type PartyChestPlayer } from "./party-chest-client";

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
  nfl_team: string | null;
};

const lineupOrder = ["QB", "RB", "WR", "TE"] as const;

export default async function PartyChestPage() {
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

  const partyPicks = (picks ?? []) as DraftPick[];
  const playerIds = partyPicks
    .map((pick) => pick.picked_player_id)
    .filter((id): id is string => Boolean(id));
  const { data: playerRows } = playerIds.length
    ? await supabase.from("players").select("id, nfl_team").in("id", playerIds)
    : { data: [] };
  const playersById = new Map((playerRows ?? []).map((player) => [player.id, player as PlayerRow]));
  const party = partyPicks.map((pick): PartyChestPlayer => {
    const player = pick.picked_player_id ? playersById.get(pick.picked_player_id) : null;
    const nflTeam = player?.nfl_team ?? "Unknown";

    return {
      id: pick.id,
      pickNumber: pick.pick_number,
      name: pick.picked_player_name ?? "Unknown Player",
      position: pick.picked_position ?? "Unknown",
      nflTeam,
      tribe: getTribeForTeam(nflTeam),
    };
  });

  const groupedByPosition = party.reduce<Record<string, PartyChestPlayer[]>>((acc, player) => {
    acc[player.position] = [...(acc[player.position] ?? []), player];
    return acc;
  }, {});
  const coveredPositions = new Set(party.map((player) => player.position));
  const uncoveredRequiredPositions = (Object.entries(MVP_REQUIRED_POSITION_COUNTS) as Array<[DraftPosition, number]>)
    .filter(([position]) => !coveredPositions.has(position))
    .map(([position]) => position);
  const coreLineup = lineupOrder.map((position) => ({
    id: position.toLowerCase(),
    position,
    player: (groupedByPosition[position] ?? [])[0] ?? null,
  }));
  const corePlayerIds = new Set(coreLineup.map((slot) => slot.player?.id).filter(Boolean));
  const flexPlayers = party.filter((player) => !corePlayerIds.has(player.id)).slice(0, 2);
  const lineup = [
    ...coreLineup,
    { id: "flex-1", position: "FLEX" as const, player: flexPlayers[0] ?? null },
    { id: "flex-2", position: "FLEX" as const, player: flexPlayers[1] ?? null },
  ];
  const dungeonParty = party.slice(0, 3);

  return (
    <PageShell
      eyebrow="House / Party Chest"
      title="Party Chest"
      description="A wooden inventory chest for your House Party, Arena lineup, and Dungeon assignments."
    >
      <div className="grid gap-6">
        <div className="flex flex-wrap gap-3">
          <InfoCard label="House" value={houseName} />
          <InfoCard label={FANTASY_TERMS.league} value={currentGuild?.name ?? "No Guild Yet"} />
          <InfoCard label={FANTASY_TERMS.roster} value={`${party.length} / ${MVP_DRAFT_ROSTER_SIZE}`} />
          <InfoCard label="Needed Roles" value={uncoveredRequiredPositions.length ? uncoveredRequiredPositions.join(", ") : "Core Set Covered"} />
        </div>

        <PartyChestClient party={party} lineup={lineup} dungeonParty={dungeonParty} />

        <div className="flex flex-wrap gap-3">
          <HeroLink href="/app">Return Home</HeroLink>
          <HeroLink href="/app/guild" tone="secondary">Open Guild Hall</HeroLink>
        </div>
      </div>
    </PageShell>
  );
}

function getTribeForTeam(team: string): TribeName | "Unclaimed" {
  const normalizedTeam = team.trim().toLowerCase();
  const tribe = Object.entries(TRIBE_DETAILS).find(([, details]) =>
    details.teams.some((tribeTeam) => tribeTeam.toLowerCase() === normalizedTeam),
  );

  return tribe ? (tribe[0] as TribeName) : "Unclaimed";
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.68rem] text-[#c6ad7d]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#fff4d8]">{value}</p>
    </div>
  );
}

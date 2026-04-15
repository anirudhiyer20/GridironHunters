import { FANTASY_TERMS, TRIBE_COLORS, TRIBE_DETAILS, TRIBE_NAMES, type TribeName } from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { RoomScene } from "@/components/room-scene";
import { createClient } from "@/lib/supabase/server";
import { getRoomAvatarAppearance, normalizeCharacter } from "../house/wardrobe/wardrobe-model";

type DungeonAssignment = {
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
  nfl_team: string | null;
  tribe: TribeName | "Unclaimed" | null;
};

type StagedDungeonFighter = {
  slotKey: string;
  name: string;
  position: string;
  nflTeam: string;
  tribe: TribeName | "Unclaimed";
};

export default async function DungeonPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: characterRow } = user
    ? await supabase.from("user_characters").select("*").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const character = normalizeCharacter(characterRow);
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
  const { data: assignmentRows } = participant?.id
    ? await supabase
        .from("party_assignments")
        .select("slot_key, draft_pick_id")
        .eq("participant_id", participant.id)
        .eq("assignment_type", "dungeon")
        .order("slot_key", { ascending: true })
    : { data: [] };
  const assignments = (assignmentRows ?? []) as DungeonAssignment[];
  const draftPickIds = assignments.map((assignment) => assignment.draft_pick_id);
  const { data: draftPickRows } = draftPickIds.length
    ? await supabase
        .from("draft_picks")
        .select("id, picked_player_id, picked_player_name, picked_position")
        .in("id", draftPickIds)
    : { data: [] };
  const draftPicksById = new Map((draftPickRows ?? []).map((pick) => [pick.id, pick as DraftPickRow]));
  const playerIds = (draftPickRows ?? [])
    .map((pick) => pick.picked_player_id)
    .filter((id): id is string => Boolean(id));
  const { data: playerRows } = playerIds.length
    ? await supabase.from("players").select("id, nfl_team, tribe").in("id", playerIds)
    : { data: [] };
  const playersById = new Map((playerRows ?? []).map((player) => [player.id, player as PlayerRow]));
  const stagedFighters = assignments
    .map((assignment): StagedDungeonFighter | null => {
      const pick = draftPicksById.get(assignment.draft_pick_id);

      if (!pick) return null;

      const player = pick.picked_player_id ? playersById.get(pick.picked_player_id) : null;
      const nflTeam = player?.nfl_team ?? "Unknown";

      return {
        slotKey: assignment.slot_key,
        name: pick.picked_player_name ?? "Unknown Player",
        position: pick.picked_position ?? "Unknown",
        nflTeam,
        tribe: player?.tribe ?? "Unclaimed",
      };
    })
    .filter((fighter): fighter is StagedDungeonFighter => Boolean(fighter));
  const stagedCountByTribe = stagedFighters.reduce<Record<string, number>>((acc, fighter) => {
    acc[fighter.tribe] = (acc[fighter.tribe] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell
      eyebrow="Dungeon / Hub"
      title="Dungeon Gate"
      description="The Dungeon is the dark branch of the world shell. Enter one of the eight Tribe doors to browse the Wild Players your House will eventually hunt."
    >
      <RoomScene
        roomName="Dungeon Gate"
        roomMood="Wet stone, torch smoke, and sealed archways make the Dungeon feel dangerous even before the Hunts themselves arrive in full."
        avatarName="Dungeon Navigation"
        avatarAppearance={getRoomAvatarAppearance(character)}
        sceneClassName="room-scene--dungeon room-scene--full"
        showHud={false}
        defaultSelectedHotspotId="combat-door"
        hotspots={[
          {
            id: "house-door",
            label: "House Door",
            flavor: "Return to your House and regroup before descending further.",
            kind: "door",
            tone: "warm",
            x: 8,
            y: 66,
            width: 14,
            height: 18,
            href: "/app",
            stats: [
              { label: "Destination", value: "House" },
              { label: "Purpose", value: "Regroup" },
            ],
          },
          ...TRIBE_NAMES.map((tribe, index) => ({
            id: `${TRIBE_DETAILS[tribe].slug}-door`,
            label: `${tribe} Door`,
            flavor: `${TRIBE_DETAILS[tribe].summary} Open this chamber to inspect the Tribe board and stage future Hunts there.`,
            kind: "door" as const,
            tone: TRIBE_DETAILS[tribe].tone,
            x: 22 + (index % 4) * 17,
            y: index < 4 ? 26 : 54,
            width: 12,
            height: 14,
            href: `/app/dungeon/${TRIBE_DETAILS[tribe].slug}`,
            actionLabel: `Enter ${tribe} Chamber`,
            stats: [
              { label: FANTASY_TERMS.type, value: tribe },
              { label: "Teams", value: String(TRIBE_DETAILS[tribe].teams.length) },
              { label: "Staged", value: String(stagedCountByTribe[tribe] ?? 0) },
            ],
          })),
          {
            id: "guild-door",
            label: "Guild Door",
            flavor: "Step back toward the Guild Hall to review Draft state, membership, and broader Guild affairs.",
            kind: "door",
            tone: "forest",
            x: 78,
            y: 66,
            width: 14,
            height: 18,
            href: "/app/guild",
            stats: [
              { label: "Destination", value: "Guild Hall" },
              { label: "Purpose", value: "Draft + Notices" },
            ],
          },
        ]}
      />

      <div className="mt-8">
        <Panel title="Staged Dungeon Party" description="These fighters come directly from the Dungeon assignments saved in the Party Chest. Empty slots are allowed while Dungeon rules are still being shaped.">
          {stagedFighters.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {stagedFighters.map((fighter) => (
                <div key={fighter.slotKey} className="rounded-[1.4rem] border border-[#7a8d80]/22 bg-black/20 px-4 py-4">
                  <p className="fantasy-kicker text-[0.68rem] text-[#9ec2af]">{fighter.slotKey.replace("-", " ")}</p>
                  <TribePill tribe={fighter.tribe} />
                  <p className="mt-2 text-lg font-semibold text-[#f7efd5]">{fighter.name}</p>
                  <p className="mt-2 text-sm text-[#d8d4c8]">
                    {fighter.position} | {fighter.nflTeam}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#7a8d80]/28 bg-black/15 px-5 py-8 text-sm text-[#efe2c9]">
              No Dungeon fighters are staged yet. Open the Party Chest and assign players to Dungeon slots when you are ready.
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-8">
        <Panel title="Tribe Legend" description="The Dungeon doors above are the real navigation. This legend stays only to remind the House what each Tribe chamber represents.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TRIBE_NAMES.map((tribe) => (
              <div key={tribe} className="rounded-[1.4rem] border border-[#7a8d80]/22 bg-black/20 px-4 py-4">
                <p className="fantasy-kicker text-[0.68rem] text-[#9ec2af]">Tribe</p>
                <div className="mt-2">
                  <TribePill tribe={tribe} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#d8d4c8]">{TRIBE_DETAILS[tribe].summary}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function TribePill({ tribe }: { tribe: TribeName | "Unclaimed" }) {
  const colors = tribe === "Unclaimed" ? null : TRIBE_COLORS[tribe];

  return (
    <span
      className="dungeon-tribe-pill"
      style={{
        backgroundColor: colors?.background ?? "#5f5549",
        color: colors?.text ?? "#f7efd5",
      }}
    >
      {tribe}
    </span>
  );
}

import { FANTASY_TERMS, TRIBE_COLORS, TRIBE_DETAILS, TRIBE_NAMES, type TribeName } from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { RoomScene } from "@/components/room-scene";
import { createClient } from "@/lib/supabase/server";
import { getRoomAvatarAppearance, normalizeCharacter } from "../house/wardrobe/wardrobe-model";

type HuntQueueEntry = {
  target_tribe: TribeName;
};

const DUNGEON_DOOR_LAYOUT: Record<TribeName, { x: number; y: number }> = {
  Prowl: { x: 13, y: 13 },
  Combat: { x: 33, y: 13 },
  Shroud: { x: 53, y: 13 },
  Halo: { x: 73, y: 13 },
  Tundra: { x: 13, y: 43 },
  Forge: { x: 73, y: 43 },
  Blaze: { x: 35, y: 70 },
  Storm: { x: 55, y: 70 },
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
  const { data: huntQueueRows } = participant?.id && currentGuild?.id
    ? await supabase
        .from("hunt_queue_entries")
        .select("target_tribe")
        .eq("league_id", currentGuild.id)
        .eq("participant_id", participant.id)
    : { data: [] };
  const queuedCountByTribe = ((huntQueueRows ?? []) as HuntQueueEntry[]).reduce<Record<string, number>>((acc, entry) => {
    acc[entry.target_tribe] = (acc[entry.target_tribe] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell
      eyebrow="Dungeon / Hub"
      title="Dungeon Gate"
    >
      <RoomScene
        roomName="Dungeon Gate"
        roomMood="Wet stone, torch smoke, and sealed archways make the Dungeon feel dangerous even before the Hunts themselves arrive in full."
        avatarName="Dungeon Navigation"
        avatarAppearance={getRoomAvatarAppearance(character)}
        sceneClassName="room-scene--dungeon room-scene--dungeon-gate room-scene--full"
        showHud={false}
        defaultSelectedHotspotId="hunt-slate-portal"
        hotspots={[
          {
            id: "house-door",
            label: "House Door",
            displayLabel: "House",
            flavor: "Return to your House and regroup before descending further.",
            kind: "door",
            tone: "warm",
            x: 5,
            y: 72,
            width: 11,
            height: 18,
            href: "/app",
            interactionMode: "direct",
            stats: [
              { label: "Destination", value: "House" },
              { label: "Purpose", value: "Regroup" },
            ],
          },
          {
            id: "hunt-slate-portal",
            label: "Hunt Slate",
            displayLabel: "Hunt Slate",
            flavor: "A central portal where every queued Hunt is gathered for battler assignments, Battle Keys, and score tracking.",
            kind: "object",
            tone: "stone",
            displayStyle: "portal",
            x: 42,
            y: 38,
            width: 16,
            height: 18,
            href: "/app/dungeon/hunts",
            interactionMode: "direct",
            actionLabel: "Open Hunt Slate",
            stats: [
              { label: "Purpose", value: "Assignments" },
              { label: "Queued Hunts", value: String(Object.values(queuedCountByTribe).reduce((total, count) => total + count, 0)) },
            ],
          },
          ...TRIBE_NAMES.map((tribe) => ({
            id: `${TRIBE_DETAILS[tribe].slug}-door`,
            label: `${tribe} Door`,
            displayLabel: tribe,
            flavor: `${TRIBE_DETAILS[tribe].summary} Open this chamber to inspect the Tribe board and stage future Hunts there.`,
            kind: "door" as const,
            tone: TRIBE_DETAILS[tribe].tone,
            displayStyle: "dungeon-door" as const,
            accentColor: TRIBE_COLORS[tribe].background,
            accentTextColor: TRIBE_COLORS[tribe].text,
            x: DUNGEON_DOOR_LAYOUT[tribe].x,
            y: DUNGEON_DOOR_LAYOUT[tribe].y,
            width: 13,
            height: 16,
            href: `/app/dungeon/${TRIBE_DETAILS[tribe].slug}`,
            actionLabel: `Enter ${tribe} Chamber`,
            stats: [
              { label: FANTASY_TERMS.type, value: tribe },
              { label: "Teams", value: String(TRIBE_DETAILS[tribe].teams.length) },
              { label: "Queued", value: String(queuedCountByTribe[tribe] ?? 0) },
            ],
          })),
        ]}
      />

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

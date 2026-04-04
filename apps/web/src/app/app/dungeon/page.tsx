import { TRIBE_NAMES } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { RoomScene } from "@/components/room-scene";

const tribeTones: Record<(typeof TRIBE_NAMES)[number], "warm" | "stone" | "ember" | "forest"> = {
  Combat: "ember",
  Forge: "warm",
  Storm: "stone",
  Tundra: "stone",
  Halo: "warm",
  Blaze: "ember",
  Shroud: "forest",
  Prowl: "forest",
};

export default function DungeonPage() {
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
        sceneClassName="room-scene--dungeon"
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
          },
          ...TRIBE_NAMES.map((tribe, index) => ({
            id: `${tribe.toLowerCase()}-door`,
            label: `${tribe} Door`,
            flavor: `${tribe} is one of the eight Tribes. This chamber will hold Wild Player discovery, Hunt targeting, and tribe-facing strategy when capture systems land in the themed shell.`,
            kind: "door" as const,
            tone: tribeTones[tribe],
            x: 22 + (index % 4) * 17,
            y: index < 4 ? 26 : 54,
            width: 12,
            height: 14,
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
          },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel title="Tribe Doors" description="The first Dungeon pass emphasizes the room structure now so Hunts can drop into the right shape later.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TRIBE_NAMES.map((tribe) => (
              <div key={tribe} className="rounded-[1.4rem] border border-[#7a8d80]/22 bg-black/20 px-4 py-4">
                <p className="fantasy-kicker text-[0.68rem] text-[#9ec2af]">Tribe Door</p>
                <p className="mt-2 text-lg font-semibold text-[#f7efd5]">{tribe}</p>
                <p className="mt-2 text-sm leading-6 text-[#d8d4c8]">Wild Player targeting for this Tribe will appear here as the Hunt loop lands.</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Dungeon Links" description="Until the Hunt systems arrive, use the shell to establish the right navigation mental model.">
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app">Return Home</HeroLink>
            <HeroLink href="/app/guild" tone="secondary">Enter Guild</HeroLink>
            <HeroLink href="/app/arena" tone="secondary">Enter Arena</HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

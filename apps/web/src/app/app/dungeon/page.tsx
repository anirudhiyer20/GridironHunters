import { FANTASY_TERMS, TRIBE_DETAILS, TRIBE_NAMES } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { RoomScene } from "@/components/room-scene";

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

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel title="Tribe Doors" description="The Dungeon hub now routes into actual Tribe chambers, so the Hunt branch has the right structure before real Wild Player boards land.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TRIBE_NAMES.map((tribe) => (
              <div key={tribe} className="rounded-[1.4rem] border border-[#7a8d80]/22 bg-black/20 px-4 py-4">
                <p className="fantasy-kicker text-[0.68rem] text-[#9ec2af]">Tribe Chamber</p>
                <p className="mt-2 text-lg font-semibold text-[#f7efd5]">{tribe}</p>
                <p className="mt-2 text-sm leading-6 text-[#d8d4c8]">{TRIBE_DETAILS[tribe].summary}</p>
                <div className="mt-4">
                  <HeroLink href={`/app/dungeon/${TRIBE_DETAILS[tribe].slug}`} tone="secondary">Open Chamber</HeroLink>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Dungeon Links" description="The shell now supports the Hunt branch more explicitly: hub first, then chamber, then future target boards and Wild Player actions.">
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

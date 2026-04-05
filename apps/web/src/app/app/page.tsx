import { FANTASY_TERMS } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { LogoutButton } from "@/components/logout-button";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { RoomScene } from "@/components/room-scene";
import { createClient } from "@/lib/supabase/server";

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

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, role")
    .eq("user_id", user?.id ?? "");

  const houseName = houseNameFromEmail(user?.email);
  const guildCount = memberships?.length ?? 0;
  const guildRole = memberships?.find((membership) => membership.role === "commissioner")
    ? FANTASY_TERMS.commissioner
    : guildCount > 0
      ? FANTASY_TERMS.member
      : "Free Wanderer";

  return (
    <PageShell
      eyebrow="House / Home Base"
      title={houseName}
      description="Your House is the warm hearth at the center of the season. Walk between your Party Chest, the Guild Board, and the doors that lead toward the Dungeon and Arena."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-[#9e8455]/18 bg-black/20 px-6 py-5">
        <div>
          <p className="fantasy-kicker text-[0.68rem] text-[#d9bc83]">Housebound</p>
          <p className="mt-2 text-base text-[#f7ecd2]">{user?.email ?? "Authenticated user"}</p>
        </div>
        <LogoutButton />
      </div>

      <RoomScene
        roomName="The House"
        roomMood="A lantern-lit home where your House gathers, checks the Guild Board, and sets out for the next chamber."
        avatarName={houseName}
        sceneClassName="room-scene--house"
        defaultSelectedHotspotId="blackboard"
        hotspots={[
          {
            id: "wardrobe",
            label: "Wardrobe",
            flavor: "A carved oak wardrobe for House identity, visual kits, and the longer-term avatar system that will grow out of this chamber.",
            kind: "object",
            tone: "warm",
            x: 12,
            y: 28,
            width: 16,
            height: 20,
            href: "/app/house/wardrobe",
            actionLabel: "Open Wardrobe",
            stats: [
              { label: "House Style", value: "Lantern Warden" },
              { label: "Customization", value: "Early Access" },
            ],
            notes: [
              "Use this room to define how a House looks and feels before multiplayer or cosmetic systems deepen.",
              "The first pass favors readable silhouettes over dense customization menus.",
            ],
          },
          {
            id: "blackboard",
            label: "Guild Board",
            flavor: "The blackboard tracks Guild activity, Draft timing, and the next meaningful route for your House.",
            kind: "object",
            tone: "warm",
            x: 40,
            y: 24,
            width: 20,
            height: 16,
            href: "/app/house/board",
            actionLabel: "Read Guild Board",
            stats: [
              { label: "Guilds", value: String(guildCount) },
              { label: "House Role", value: guildRole },
            ],
            notes: [
              "The Guild Board is the lightweight activity surface of the House.",
              "The deeper communal systems still live beyond the Guild Door.",
            ],
          },
          {
            id: "chest",
            label: "Party Chest",
            flavor: "Your Party lives here. Open the chest to inspect the House roster, check Draft gains, and eventually manage creature loadouts.",
            kind: "object",
            tone: "warm",
            x: 66,
            y: 60,
            width: 16,
            height: 14,
            href: "/app/house/party",
            actionLabel: "Open Party Chest",
            stats: [
              { label: "Party State", value: "Gathering" },
              { label: "Guild Count", value: String(guildCount) },
            ],
            notes: [
              "The first Party Chest reads from Draft results in the active Guild.",
              "Later it can absorb loadout, drops, and creature management without changing the House fantasy.",
            ],
          },
          {
            id: "guild-door",
            label: "Guild Door",
            flavor: "Beyond this door lies the Guild Hall, where Houses gather, Draft plans are made, and Guild affairs are settled.",
            kind: "door",
            tone: "forest",
            x: 18,
            y: 66,
            width: 16,
            height: 18,
            href: "/app/guild",
            stats: [
              { label: "Destination", value: "Guild Hall" },
              { label: "Purpose", value: "Draft + Guilds" },
            ],
          },
          {
            id: "dungeon-door",
            label: "Dungeon Door",
            flavor: "The Dungeon waits below the stone stairs. Step through to choose a Tribe chamber and begin your next Hunt.",
            kind: "door",
            tone: "stone",
            x: 43,
            y: 66,
            width: 16,
            height: 18,
            href: "/app/dungeon",
            stats: [
              { label: "Destination", value: "Dungeon" },
              { label: "Purpose", value: "Hunts" },
            ],
          },
          {
            id: "arena-door",
            label: "Arena Door",
            flavor: "The Arena is where Houses test their Parties in duels, standings, and the season's fiercest competitive moments.",
            kind: "door",
            tone: "ember",
            x: 68,
            y: 66,
            width: 16,
            height: 18,
            href: "/app/arena",
            stats: [
              { label: "Destination", value: "Arena" },
              { label: "Purpose", value: "Duels + Results" },
            ],
          },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Panel title="House Ledger" description="A quick pulse on where your House currently stands.">
          <div className="grid gap-3">
            <StatusCard label="Guilds" value={String(guildCount)} />
            <StatusCard label="House Role" value={guildRole} />
            <StatusCard label="Party State" value="Gathering" />
          </div>
        </Panel>

        <Panel title="House Objects" description="These are now real House surfaces instead of only decorative props.">
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/house/party">Open Party Chest</HeroLink>
            <HeroLink href="/app/house/board" tone="secondary">Read Guild Board</HeroLink>
            <HeroLink href="/app/house/wardrobe" tone="secondary">Visit Wardrobe</HeroLink>
          </div>
        </Panel>

        <Panel title="Fast Travel" description="If you want to move without walking the room first, use these direct entries.">
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/guild">Enter Guild</HeroLink>
            <HeroLink href="/app/dungeon" tone="secondary">Enter Dungeon</HeroLink>
            <HeroLink href="/app/arena" tone="secondary">Enter Arena</HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.7rem] text-[#c6ad7d]">{label}</p>
      <p className="mt-2 break-all text-base font-medium text-[#fff4d8]">{value}</p>
    </div>
  );
}

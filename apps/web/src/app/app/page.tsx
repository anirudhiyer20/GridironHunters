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

function prettifyStatus(status: string | null | undefined) {
  if (!status) return "Unclaimed";
  return status.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("role, joined_at, leagues!inner(id, name, slug, season, status, draft_starts_at)")
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const activeGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;

  const houseName = houseNameFromEmail(user?.email);
  const guildCount = memberships?.length ?? 0;
  const guildRole = memberships?.find((membership) => membership.role === "commissioner")
    ? FANTASY_TERMS.commissioner
    : guildCount > 0
      ? FANTASY_TERMS.member
      : "Free Wanderer";
  const nextRoute = activeGuild
    ? activeGuild.status === "pre_draft"
      ? "Gather in the Guild Hall and shape the next Draft."
      : activeGuild.status === "draft_ready" || activeGuild.status === "draft_live" || activeGuild.status === "draft_paused"
        ? "The Draft Room is alive. Step through the Guild Hall to command it."
        : "The Arena and Dungeon are the strongest next routes for this House."
    : "Found or join a Guild to give this House a banner to fight under.";

  return (
    <PageShell
      eyebrow="House / Home Base"
      title={houseName}
      description="Your House should feel like a real home base: a warm room with meaningful objects, quick weekly information, and clear doors into the Guild, Dungeon, and Arena."
    >
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.9rem] border border-[#9e8455]/18 bg-black/20 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="fantasy-kicker text-[0.68rem] text-[#d9bc83]">House Hearth</p>
              <p className="mt-2 text-base text-[#f7ecd2]">{user?.email ?? "Authenticated user"}</p>
            </div>
            <LogoutButton />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatusCard label="House Role" value={guildRole} />
            <StatusCard label="Active Guild" value={activeGuild?.name ?? "No Banner Yet"} />
            <StatusCard label="House State" value={activeGuild ? prettifyStatus(activeGuild.status) : "Gathering"} />
          </div>
        </div>

        <div className="rounded-[1.9rem] border border-[#9e8455]/18 bg-black/20 px-6 py-5">
          <p className="fantasy-kicker text-[0.68rem] text-[#d9bc83]">Next Route</p>
          <p className="mt-3 text-base leading-7 text-[#f2e5c7]">{nextRoute}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <HeroLink href="/app/house/board">Open Strategy Center</HeroLink>
            <HeroLink href="/app/guild" tone="secondary">Enter Guild</HeroLink>
          </div>
        </div>
      </div>

      <RoomScene
        roomName="The House"
        roomMood="A lantern-lit home where your House gathers, checks the Strategy Center, and decides whether the next route belongs to the Guild, Dungeon, or Arena."
        avatarName={houseName}
        sceneClassName="room-scene--house"
        defaultSelectedHotspotId="blackboard"
        hotspots={[
          {
            id: "wardrobe",
            label: "Wardrobe",
            flavor: "A stout wooden wardrobe for House identity, starter outfits, and the future avatar system that will grow from this chamber.",
            kind: "object",
            tone: "warm",
            displayStyle: "wardrobe",
            x: 10,
            y: 25,
            width: 15,
            height: 24,
            href: "/app/house/wardrobe",
            actionLabel: "Open Wardrobe",
            stats: [
              { label: "House Style", value: "Lantern Warden" },
              { label: "Material", value: "Oak + Brass" },
            ],
            notes: [
              "The Wardrobe should read like furniture first and a UI surface second.",
              "The MVP focus is strong visual identity without overcomplicating the controls.",
            ],
          },
          {
            id: "blackboard",
            label: "Strategy Center",
            flavor: "A wooden planning board covered in pinned papers, match notes, and Guild scraps. This is the House hub for current-week activity.",
            kind: "object",
            tone: "warm",
            displayStyle: "board",
            x: 36,
            y: 21,
            width: 24,
            height: 18,
            href: "/app/house/board",
            actionLabel: "Open Strategy Center",
            stats: [
              { label: "Guilds", value: String(guildCount) },
              { label: "Weekly Hub", value: "Active" },
            ],
            notes: [
              "This board replaces the simpler Guild Board as the House-facing weekly surface.",
              "A stronger mythic alternate name for it is War Table if you want a more dramatic tone later.",
            ],
          },
          {
            id: "trophies",
            label: "Trophy Cabinet",
            flavor: "A glass-front cabinet for rival-duel achievements, rare captures, and old Guild championships.",
            kind: "object",
            tone: "warm",
            displayStyle: "cabinet",
            x: 67,
            y: 22,
            width: 15,
            height: 23,
            href: "/app/house/trophies",
            actionLabel: "Open Trophy Cabinet",
            stats: [
              { label: "Cabinet State", value: "Awaiting Honors" },
              { label: "Legacy", value: "In Progress" },
            ],
            notes: [
              "This object gives the House long-term memory instead of making achievement history feel abstract.",
              "It can hold both achievement-style honors and full Guild trophies over time.",
            ],
          },
          {
            id: "chest",
            label: "Party Chest",
            flavor: "Your Party lives here. Open the chest to inspect the House roster, check Draft gains, and manage lineup readiness.",
            kind: "object",
            tone: "warm",
            displayStyle: "chest",
            x: 63,
            y: 60,
            width: 18,
            height: 14,
            href: "/app/house/party",
            actionLabel: "Open Party Chest",
            stats: [
              { label: "Party State", value: activeGuild ? "Active Banner" : "Gathering" },
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
            displayStyle: "door",
            x: 14,
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
            displayStyle: "door",
            x: 39,
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
            displayStyle: "door",
            x: 64,
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr_1fr]">
        <Panel title="House Ledger" description="A quick pulse on where this House stands before the deeper creature-management systems arrive.">
          <div className="grid gap-3">
            <StatusCard label="Guilds" value={String(guildCount)} />
            <StatusCard label="House Role" value={guildRole} />
            <StatusCard label="Season" value={activeGuild ? String(activeGuild.season) : "Unclaimed"} />
          </div>
        </Panel>

        <Panel title="House Objects" description="The House should now feel like a loop of real objects, not just room dressing.">
          <div className="grid gap-3">
            <ObjectRouteCard title="Strategy Center" body="Use the wooden planning board as the current-week hub for lineups, score awareness, and Guild signals." href="/app/house/board" />
            <ObjectRouteCard title="Trophy Cabinet" body="Track old honors, achievement-style milestones, and future championship trophies." href="/app/house/trophies" />
            <ObjectRouteCard title="Wardrobe" body="Shape House identity through a more tactile pixel-wood wardrobe and starter fits." href="/app/house/wardrobe" />
            <ObjectRouteCard title="Party Chest" body="Inspect the current Party, see what Draft has already yielded, and prepare weekly assignments." href="/app/house/party" />
          </div>
        </Panel>

        <Panel title="Travel Doors" description="Use these direct entries if you want to move fast without walking the room first.">
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

function ObjectRouteCard({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-title text-xl text-[#fff4d8]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#e9dbbd]">{body}</p>
      <div className="mt-4">
        <HeroLink href={href} tone="secondary">Open {title}</HeroLink>
      </div>
    </div>
  );
}

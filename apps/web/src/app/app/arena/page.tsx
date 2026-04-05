import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { RoomScene } from "@/components/room-scene";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("role, leagues!inner(name, slug, season, status)")
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const activeGuild = memberships?.[0];
  const guild = activeGuild ? (Array.isArray(activeGuild.leagues) ? activeGuild.leagues[0] : activeGuild.leagues) : null;

  return (
    <PageShell
      eyebrow="Arena / Competitive Wing"
      title="Arena Gate"
      description="The Arena frames duels, standings, and results as the competitive wing of the world shell."
    >
      <RoomScene
        roomName="Arena Gate"
        roomMood="This stone court leads toward duels, records, and the score-driven pulse of the Guild season."
        avatarName="Arena Navigation"
        sceneClassName="room-scene--arena"
        defaultSelectedHotspotId="duel-dais"
        hotspots={[
          {
            id: "duel-dais",
            label: "Duel Dais",
            flavor: "The central dais is where Houses should step when they want the most immediate competitive view: live duels, matchup pressure, and weekly conflict.",
            kind: "object",
            tone: "ember",
            x: 40,
            y: 28,
            width: 18,
            height: 14,
            href: "/app/arena/duels",
            actionLabel: "Enter Duel Grounds",
            stats: [
              { label: "Current Guild", value: guild?.name ?? "No Guild Yet" },
              { label: "Focus", value: "Weekly Duels" },
            ],
          },
          {
            id: "standings-plaque",
            label: "Standings Plaque",
            flavor: "The plaque tracks the long season: rank, pressure, and how close each House is to climbing into a stronger postseason position.",
            kind: "object",
            tone: "warm",
            x: 18,
            y: 20,
            width: 16,
            height: 18,
            href: "/app/arena/standings",
            actionLabel: "Open Standings Hall",
            stats: [
              { label: "Season", value: guild ? String(guild.season) : "Unclaimed" },
              { label: "State", value: guild?.status?.replaceAll("_", " ") ?? "Awaiting Guild" },
            ],
          },
          {
            id: "results-board",
            label: "Results Board",
            flavor: "The results board is where the Arena becomes memory instead of tension: weekly outcomes, recap value, and the running story of the season.",
            kind: "object",
            tone: "stone",
            x: 68,
            y: 18,
            width: 16,
            height: 18,
            href: "/app/arena/results",
            actionLabel: "Open Results Archive",
            stats: [
              { label: "Archive", value: "Weekly Outcomes" },
              { label: "Purpose", value: "Recall + Review" },
            ],
          },
          {
            id: "guild-door",
            label: "Guild Door",
            flavor: "Return to the Guild Hall when you want Draft tools, membership controls, and broader Guild planning.",
            kind: "door",
            tone: "forest",
            x: 18,
            y: 66,
            width: 16,
            height: 18,
            href: "/app/guild",
            stats: [
              { label: "Destination", value: "Guild Hall" },
              { label: "Purpose", value: "Planning" },
            ],
          },
          {
            id: "house-door",
            label: "House Door",
            flavor: "Head back to your House to check the Party Chest or reset your route through the world.",
            kind: "door",
            tone: "warm",
            x: 68,
            y: 66,
            width: 16,
            height: 18,
            href: "/app",
            stats: [
              { label: "Destination", value: "House" },
              { label: "Purpose", value: "Reset Route" },
            ],
          },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel title="Arena Focus" description="The Arena now has distinct competitive surfaces instead of a single holding room. Each object maps to a different way a House reads the season."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-[#a86a56]/24 bg-black/20 px-4 py-4">
              <p className="fantasy-kicker text-[0.68rem] text-[#d0a697]">Current Guild</p>
              <p className="mt-2 text-lg font-semibold text-[#fff4d8]">{guild?.name ?? "No Guild Yet"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-[#a86a56]/24 bg-black/20 px-4 py-4">
              <p className="fantasy-kicker text-[0.68rem] text-[#d0a697]">Season State</p>
              <p className="mt-2 text-lg font-semibold text-[#fff4d8]">{guild?.status?.replaceAll("_", " ") ?? "Awaiting Guild"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-[#a86a56]/24 bg-black/20 px-4 py-4">
              <p className="fantasy-kicker text-[0.68rem] text-[#d0a697]">Wing Focus</p>
              <p className="mt-2 text-lg font-semibold text-[#fff4d8]">Duels + Results</p>
            </div>
          </div>
        </Panel>

        <Panel title="Arena Routes" description="Use the object you need in the gate itself, or quick-jump here if you already know which competitive view you want.">
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/arena/duels">Enter Duel Grounds</HeroLink>
            <HeroLink href="/app/arena/standings" tone="secondary">Open Standings Hall</HeroLink>
            <HeroLink href="/app/arena/results" tone="secondary">Open Results Archive</HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

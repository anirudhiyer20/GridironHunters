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
      description="The Arena frames matchups, standings, and season results as the competitive wing of the world shell."
    >
      <RoomScene
        roomName="Arena Gate"
        roomMood="This stone court leads toward duels, records, and the score-driven pulse of the Guild season."
        avatarName="Arena Navigation"
        sceneClassName="room-scene--arena"
        defaultSelectedHotspotId="results-board"
        hotspots={[
          {
            id: "results-board",
            label: "Results Board",
            flavor: "The results board will become the clearest single place to understand Arena outcomes, standings, and championship movement.",
            kind: "object",
            tone: "ember",
            x: 38,
            y: 26,
            width: 24,
            height: 16,
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
          },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel title="Arena Focus" description="The Arena is now the long-term home for matchups, results, and standings even before every competitive system is fully implemented.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-[#a86a56]/24 bg-black/20 px-4 py-4">
              <p className="fantasy-kicker text-[0.68rem] text-[#d0a697]">Current Guild</p>
              <p className="mt-2 text-lg font-semibold text-[#fff4d8]">{guild?.name ?? "No Guild Yet"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-[#a86a56]/24 bg-black/20 px-4 py-4">
              <p className="fantasy-kicker text-[0.68rem] text-[#d0a697]">Season State</p>
              <p className="mt-2 text-lg font-semibold text-[#fff4d8]">{guild?.status?.replaceAll("_", " ") ?? "Awaiting Guild"}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Arena Links" description="Arena-specific competitive screens will land here as gauntlet and playoff systems deepen. For now, use the shell to establish the right home for those views.">
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/guild">Open Guild Hall</HeroLink>
            <HeroLink href="/app/leagues" tone="secondary">View Guild Ledger</HeroLink>
            <HeroLink href="/app" tone="secondary">Return Home</HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaStandingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("joined_at, leagues!inner(id, name, slug, season, status)")
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const guilds = (memberships ?? []).map((membership) =>
    Array.isArray(membership.leagues) ? membership.leagues[0] : membership.leagues,
  );

  return (
    <PageShell
      eyebrow="Arena / Standings"
      title="Standings Hall"
      description="The Standings Hall is the record room of the Arena: ranking, pressure, and momentum should eventually feel visible here at a glance."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
        <Panel title="Guild Ranking Boards" description="Until the full gauntlet standings system lands, this room establishes where long-season competitive posture belongs.">
          {guilds.length > 0 ? (
            <div className="grid gap-4">
              {guilds.map((guild, index) => (
                <div key={guild.id} className="rounded-[1.5rem] border border-[#a86a56]/24 bg-black/20 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="fantasy-kicker text-[0.68rem] text-[#d0a697]">Rank Placeholder</p>
                      <h2 className="mt-2 text-xl font-semibold text-[#fff4d8]">{guild.name}</h2>
                      <p className="mt-2 text-sm text-[#efe2c9]">Season {guild.season} | {guild.status.replaceAll("_", " ")}</p>
                    </div>
                    <p className="fantasy-title text-3xl text-[#f4d28d]">#{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#a86a56]/20 bg-black/15 px-5 py-8 text-sm text-[#efe2c9]">
              Your House needs a Guild before standings can mean anything.
            </div>
          )}
        </Panel>

        <Panel title="Standings Notes" description="This room should eventually become the cleanest way to understand seasonal positioning, playoff pressure, and tie-break stakes.">
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/arena">Return to Arena</HeroLink>
            <HeroLink href="/app/arena/duels" tone="secondary">Open Duel Grounds</HeroLink>
            <HeroLink href="/app/arena/results" tone="secondary">Open Results Archive</HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

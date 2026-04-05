import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaDuelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return (
    <PageShell
      eyebrow="Arena / Duels"
      title="Duel Grounds"
      description="The Duel Grounds are the first real home for weekly competitive matchups. This chamber gives the Arena a clear route for head-to-head conflict before the full PvP screens are rebuilt into the shell."
    >
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Current Duel State" description="This room is where live matchup and duel breakdowns will eventually surface most directly.">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Current Guild" value={currentGuild?.name ?? "No Guild Yet"} />
            <InfoCard label="Season" value={currentGuild ? String(currentGuild.season) : "Unclaimed"} />
            <InfoCard label="Arena State" value={currentGuild?.status?.replaceAll("_", " ") ?? "Awaiting Guild"} />
            <InfoCard label="Focus" value="Weekly Duels" />
          </div>
        </Panel>

        <Panel title="Duel Notes" description="The Duel Grounds should eventually host transparent matchup breakdowns, point swings, and tribe/sigil modifiers without pushing players back into generic dashboard views.">
          <ul className="grid gap-3 text-sm leading-7 text-[#efe2c9]">
            <li>Weekly matchup cards will live here.</li>
            <li>Transparent score breakdowns should be the crown jewel of the Arena branch.</li>
            <li>This chamber should feel dramatic but still easy to scan on a busy week.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <HeroLink href="/app/arena">Return to Arena</HeroLink>
            <HeroLink href="/app/arena/standings" tone="secondary">Open Standings Hall</HeroLink>
            <HeroLink href="/app/arena/results" tone="secondary">Open Results Archive</HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#a86a56]/24 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.68rem] text-[#d0a697]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#fff4d8]">{value}</p>
    </div>
  );
}

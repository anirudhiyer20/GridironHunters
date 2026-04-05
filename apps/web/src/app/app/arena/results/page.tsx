import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaResultsPage() {
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
      eyebrow="Arena / Results"
      title="Results Archive"
      description="The Results Archive is where Houses should revisit what happened, why it happened, and how the Arena shifted from one week to the next."
    >
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Archive Focus" description="This room exists so weekly outcomes eventually feel historical and readable, not just ephemeral tiles that vanish after the next screen refresh.">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Current Guild" value={currentGuild?.name ?? "No Guild Yet"} />
            <InfoCard label="Archive State" value={currentGuild ? "Waiting on Arena Results" : "No Guild Yet"} />
          </div>
        </Panel>

        <Panel title="Results Notes" description="This room should later absorb weekly recaps, score explanations, and matchup memory in a way that feels durable.">
          <ul className="grid gap-3 text-sm leading-7 text-[#efe2c9]">
            <li>Weekly result summaries should land here.</li>
            <li>Transparent breakdowns and corrections should eventually be reviewable from this archive.</li>
            <li>The archive should feel calmer and more retrospective than the Duel Grounds.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <HeroLink href="/app/arena">Return to Arena</HeroLink>
            <HeroLink href="/app/arena/duels" tone="secondary">Open Duel Grounds</HeroLink>
            <HeroLink href="/app/arena/standings" tone="secondary">Open Standings Hall</HeroLink>
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

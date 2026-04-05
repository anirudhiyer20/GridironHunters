import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
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
      <section className="fantasy-panel fantasy-panel--arena rounded-[1.9rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="fantasy-kicker text-[0.68rem] text-[#d0a697]">Archive Focus</p>
            <h2 className="fantasy-title mt-2 text-3xl text-[#fff4d8]">Results Archive</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/arena">Return to Arena</HeroLink>
            <HeroLink href="/app/arena/duels" tone="secondary">Open Duel Grounds</HeroLink>
            <HeroLink href="/app/arena/standings" tone="secondary">Open Standings Hall</HeroLink>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoCard label="Current Guild" value={currentGuild?.name ?? "No Guild Yet"} />
          <InfoCard label="Archive State" value={currentGuild ? "Waiting on Arena Results" : "No Guild Yet"} />
        </div>
      </section>
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

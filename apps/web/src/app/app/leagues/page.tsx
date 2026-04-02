import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { leagueSummaryCards, sampleLeague } from "@/lib/mock-data";

export default function LeaguesPage() {
  return (
    <PageShell
      eyebrow="App / Leagues"
      title="League hub"
      description="Sprint 1 starts here: creating a league, joining with an invite code, and enforcing pre-draft membership rules before we move into the draft flow."
    >
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title={sampleLeague.name}
          description="A sample league card helps anchor the shape of the UI while we wire the real data flow from Supabase."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {leagueSummaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4"
              >
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                  {card.label}
                </p>
                <p className="mt-2 text-lg font-medium text-stone-100">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 text-sm leading-6 text-stone-300">
            <p>Invite code: {sampleLeague.inviteCode}</p>
            <p>Draft lock: {sampleLeague.draftDateLabel}</p>
            <p>League slug: {sampleLeague.slug}</p>
          </div>
        </Panel>

        <Panel
          title="League actions"
          description="These routes are the first real Sprint 1 product flows."
        >
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/leagues/create">Create league</HeroLink>
            <HeroLink href="/app/leagues/join" tone="secondary">
              Join with code
            </HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

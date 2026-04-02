import Link from "next/link";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

export default async function LeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: memberships, error } = await supabase
    .from("league_members")
    .select(
      "role, joined_at, leagues!inner(id, name, slug, season, status, draft_starts_at, max_members)",
    )
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  return (
    <PageShell
      eyebrow="App / Leagues"
      title="League hub"
      description="Sprint 1 starts here: creating a league, joining with an invite code, and enforcing pre-draft membership rules before we move into the draft flow."
    >
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Your leagues"
          description="This list is now backed by the database for the signed-in user."
        >
          {message ? (
            <p className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Unable to load leagues: {error.message}
            </p>
          ) : memberships && memberships.length > 0 ? (
            <div className="grid gap-4">
              {memberships.map((membership) => {
                const league = Array.isArray(membership.leagues)
                  ? membership.leagues[0]
                  : membership.leagues;

                return (
                  <Link
                    key={league.id}
                    href={`/app/leagues/${league.slug}`}
                    className="rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5 transition-colors hover:bg-white/10"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                          {membership.role}
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-stone-100">
                          {league.name}
                        </h2>
                        <p className="mt-2 text-sm text-stone-300">
                          Season {league.season} | {league.status.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-right text-sm text-stone-400">
                        <p>{league.slug}</p>
                        <p className="mt-1">
                          Draft:{" "}
                          {league.draft_starts_at
                            ? new Date(league.draft_starts_at).toLocaleString()
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-black/15 px-5 py-8 text-sm text-stone-300">
              You are not in a league yet. Create one or join with an invite code
              to start your season loop.
            </div>
          )}
        </Panel>

        <Panel
          title="League actions"
          description="These are the first fully wired Sprint 1 product flows."
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

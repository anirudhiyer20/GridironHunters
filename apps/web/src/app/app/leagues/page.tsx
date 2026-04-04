import { FANTASY_TERMS } from "@gridiron/shared";
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
      eyebrow="Guild / Ledger"
      title="Guild Ledger"
      description="The Guild Ledger keeps the underlying guild records visible while the hall, House, Dungeon, and Arena start taking over the world-facing navigation."
    >
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Your Guilds"
          description="These are the Guilds your House currently belongs to. Open one to manage pre-Draft membership, invites, and the existing Draft flow."
        >
          {message ? (
            <p className="mb-5 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-[1.4rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Unable to load guilds: {error.message}
            </p>
          ) : memberships && memberships.length > 0 ? (
            <div className="grid gap-4">
              {memberships.map((membership) => {
                const guild = Array.isArray(membership.leagues)
                  ? membership.leagues[0]
                  : membership.leagues;
                const roleName = membership.role === "commissioner" ? FANTASY_TERMS.commissioner : FANTASY_TERMS.member;

                return (
                  <Link
                    key={guild.id}
                    href={`/app/leagues/${guild.slug}`}
                    className="rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-5 py-5 transition-colors hover:bg-white/8"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="fantasy-kicker text-[0.7rem] text-[#c6ad7d]">{roleName}</p>
                        <h2 className="mt-2 text-xl font-semibold text-[#fff4d8]">{guild.name}</h2>
                        <p className="mt-2 text-sm text-[#efe2c9]">
                          Season {guild.season} | {guild.status.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-right text-sm text-[#d8c6a7]">
                        <p>{guild.slug}</p>
                        <p className="mt-1">
                          Draft: {guild.draft_starts_at ? new Date(guild.draft_starts_at).toLocaleString() : "Not set"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#9e8455]/20 bg-black/15 px-5 py-8 text-sm text-[#efe2c9]">
              Your House is not in a Guild yet. Found one or join with a code to begin the season loop.
            </div>
          )}
        </Panel>

        <Panel
          title="Guild Actions"
          description="These are still the same account-backed flows, now framed as Guild actions in the medieval shell."
        >
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/leagues/create">Found a Guild</HeroLink>
            <HeroLink href="/app/leagues/join" tone="secondary">
              Join with Code
            </HeroLink>
            <HeroLink href="/app/guild" tone="secondary">
              Return to Guild Hall
            </HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

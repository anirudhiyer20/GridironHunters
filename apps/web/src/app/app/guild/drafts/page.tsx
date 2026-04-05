import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

export default async function GuildDraftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select(
      "role, joined_at, leagues!inner(id, name, slug, season, status, draft_starts_at)",
    )
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const guilds = (memberships ?? []).map((membership) => ({
    role: membership.role,
    guild: Array.isArray(membership.leagues) ? membership.leagues[0] : membership.leagues,
  }));

  return (
    <PageShell
      eyebrow="Guild / Draft Command"
      title="Draft Command"
      description="This chamber is where the Guild Hall points Houses when they want the strategic side of Draft access rather than the broader Guild ledger."
    >
      <section className="fantasy-panel fantasy-panel--stone rounded-[1.9rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="fantasy-kicker text-[0.68rem] text-[#d1b481]">Draft Routes</p>
            <h2 className="fantasy-title mt-2 text-3xl text-[#fff4d8]">Guild Draft Access</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/guild">Return to Guild Hall</HeroLink>
            <HeroLink href="/app/guild/ledger" tone="secondary">Open Guild Ledger</HeroLink>
          </div>
        </div>

        <div className="mt-5">
          {guilds.length > 0 ? (
            <div className="grid gap-4">
              {guilds.map(({ role, guild }) => (
                <div key={guild.id} className="rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="fantasy-kicker text-[0.7rem] text-[#c6ad7d]">{role}</p>
                      <h2 className="mt-2 text-xl font-semibold text-[#fff4d8]">{guild.name}</h2>
                      <p className="mt-2 text-sm text-[#efe2c9]">Status: {guild.status.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-[#d8c6a7]">
                        Draft: {guild.draft_starts_at ? new Date(guild.draft_starts_at).toLocaleString() : "Not set"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <HeroLink href={`/app/leagues/${guild.slug}`}>Open Guild Draft</HeroLink>
                      <HeroLink href={`/app/leagues/${guild.slug}/draft`} tone="secondary">Open Draft Room</HeroLink>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#9e8455]/20 bg-black/15 px-5 py-8 text-sm text-[#efe2c9]">
              Your House needs a Guild before the Draft chamber can do anything useful.
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

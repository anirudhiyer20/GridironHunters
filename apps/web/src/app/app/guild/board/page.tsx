import { FANTASY_TERMS } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

export default async function GuildBoardPage() {
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

  const currentGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;

  return (
    <PageShell
      eyebrow="Guild / Board"
      title="Guild Board"
      description="The Guild Board is the communal layer of the hall: notices, season state, and the quickest explanation of what the Guild should care about right now."
    >
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Current Notices" description="This starts simple, but it gives the hall a meaningful board object now instead of forcing all information through the same ledger route.">
          <div className="grid gap-4">
            <NoticeCard
              title="Guild State"
              body={currentGuild ? `${currentGuild.name} is currently ${currentGuild.status.replaceAll("_", " ")}.` : "No Guild notice is posted because your House has not joined a Guild yet."}
            />
            <NoticeCard
              title="Draft Readiness"
              body={currentGuild?.draft_starts_at ? `Draft is scheduled for ${new Date(currentGuild.draft_starts_at).toLocaleString()}.` : "No Draft time is posted yet for the current Guild."}
            />
            <NoticeCard
              title="Hall Purpose"
              body={`Use the ${FANTASY_TERMS.league} Hall for membership, invites, and Draft routes. Use the House Board for the more personal House-facing summary.`}
            />
          </div>
        </Panel>

        <Panel title="Guild Routes" description="The board now acts as a clean orientation surface for the hall.">
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/guild/ledger">Open Guild Ledger</HeroLink>
            <HeroLink href="/app/guild/drafts" tone="secondary">Open Draft Command</HeroLink>
            <HeroLink href="/app/guild" tone="secondary">Return to Guild Hall</HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function NoticeCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-title text-xl text-[#fff4d8]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#efe2c9]">{body}</p>
    </div>
  );
}

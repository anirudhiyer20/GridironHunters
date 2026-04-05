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

  const guildRole = memberships?.[0]?.role === "commissioner" ? FANTASY_TERMS.commissioner : FANTASY_TERMS.member;

  return (
    <PageShell
      eyebrow="House / Guild Board"
      title="Guild Board"
      description="The blackboard is the House-facing summary of Guild movement: who you belong to, where Draft stands, and which chamber matters next."
    >
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Current Guild" description="This is the first useful version of the blackboard: short, readable, and clearly tied to the House rather than buried inside a generic dashboard.">
          <div className="grid gap-3">
            <InfoCard label={FANTASY_TERMS.league} value={currentGuild?.name ?? "No Guild Yet"} />
            <InfoCard label="House Role" value={guildRole ?? "Free Wanderer"} />
            <InfoCard label="Season" value={currentGuild ? String(currentGuild.season) : "Unclaimed"} />
            <InfoCard label="State" value={currentGuild?.status?.replaceAll("_", " ") ?? "No Guild Yet"} />
          </div>
        </Panel>

        <Panel title="Board Notices" description="This is where House-facing activity can grow into a richer log later. For now it gives the House the most important current truths.">
          <div className="grid gap-4">
            <NoticeCard
              title="Draft Clock"
              body={currentGuild?.draft_starts_at ? `Draft is set for ${new Date(currentGuild.draft_starts_at).toLocaleString()}.` : "Draft time has not been set yet."}
            />
            <NoticeCard
              title="Guild Route"
              body={currentGuild ? `Open ${currentGuild.name} to manage Guildmates, invite codes, and the current Draft flow.` : "Found or join a Guild to unlock the Draft and season loop."}
            />
            <NoticeCard
              title="World Shell"
              body="The House Board now acts as the lightweight activity surface while the Guild Hall, Dungeon, and Arena take over the larger feature spaces."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <HeroLink href="/app/guild">Enter Guild Hall</HeroLink>
            <HeroLink href="/app/leagues" tone="secondary">Open Guild Ledger</HeroLink>
            <HeroLink href="/app" tone="secondary">Return Home</HeroLink>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.68rem] text-[#c6ad7d]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#fff4d8]">{value}</p>
    </div>
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

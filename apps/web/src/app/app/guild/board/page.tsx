import { FANTASY_TERMS } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
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
    >
      <section className="rounded-[2rem] border border-[#7c5229] bg-[linear-gradient(180deg,#6a4321_0%,#4e3018_100%)] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.28),inset_0_0_0_2px_rgba(243,214,158,0.06)]">
        <div className="rounded-[1.6rem] border border-[#8f6437] bg-[repeating-linear-gradient(90deg,rgba(168,116,63,0.18)_0_26px,rgba(118,76,38,0.18)_26px_52px),linear-gradient(180deg,#5b381c_0%,#3f2613_100%)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="fantasy-kicker text-[0.68rem] text-[#f0d39b]">Hall Notices</p>
              <h2 className="fantasy-title mt-2 text-3xl text-[#fff2d2]">Current Notices</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <HeroLink href="/app/guild/ledger">Open Guild Ledger</HeroLink>
              <HeroLink href="/app/guild/drafts" tone="secondary">Open Draft Command</HeroLink>
              <HeroLink href="/app/guild" tone="secondary">Return to Guild Hall</HeroLink>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
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
        </div>
      </section>
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

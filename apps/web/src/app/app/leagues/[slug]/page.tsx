import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

export default async function LeagueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { slug } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();

  const { data: league, error } = await supabase
    .from("leagues")
    .select("id, name, slug, season, status, draft_starts_at, max_members")
    .eq("slug", slug)
    .single();

  if (error || !league) {
    notFound();
  }

  const [{ data: inviteCodes }] = await Promise.all([
    supabase
      .from("invite_codes")
      .select("code, expires_at, disabled_at, created_at")
      .eq("league_id", league.id)
      .is("disabled_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const activeInvite = inviteCodes?.[0];

  return (
    <PageShell
      eyebrow="App / Leagues"
      title={league.name}
      description="This is the first real league detail page. It is intentionally simple, but it already reads from the shared backend state."
    >
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="League overview"
          description="More commissioner controls and membership management will land here as Sprint 1 continues."
        >
          {message ? (
            <p className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Slug" value={league.slug} />
            <InfoRow label="Season" value={String(league.season)} />
            <InfoRow label="Status" value={league.status.replace("_", " ")} />
            <InfoRow
              label="Draft"
              value={
                league.draft_starts_at
                  ? new Date(league.draft_starts_at).toLocaleString()
                  : "Not set"
              }
            />
            <InfoRow label="League Size" value={String(league.max_members)} />
          </div>
        </Panel>

        <Panel
          title="Invite status"
          description="MVP invite codes are reusable until the draft starts or the league fills."
        >
          {activeInvite ? (
            <div className="grid gap-3">
              <InfoRow label="Code" value={activeInvite.code} />
              <InfoRow
                label="Expires"
                value={new Date(activeInvite.expires_at).toLocaleString()}
              />
            </div>
          ) : (
            <p className="text-sm text-stone-300">
              No active invite code is available yet.
            </p>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-medium text-stone-100">
        {value}
      </p>
    </div>
  );
}

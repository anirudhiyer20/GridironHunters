import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

import {
  pauseDraft,
  prepareDraft,
  regenerateInvite,
  removeMember,
  startDraft,
  updateLeagueSettings,
} from "./actions";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: league, error } = await supabase
    .from("leagues")
    .select("id, name, slug, season, status, draft_starts_at, max_members")
    .eq("slug", slug)
    .single();

  if (error || !league) {
    notFound();
  }

  const [{ data: inviteCodes }, { data: members }, { data: currentMembership }, { data: draft }] =
    await Promise.all([
      supabase
        .from("invite_codes")
        .select("code, expires_at, disabled_at, created_at")
        .eq("league_id", league.id)
        .is("disabled_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("league_members")
        .select("user_id, role, joined_at, profiles(display_name, email)")
        .eq("league_id", league.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("league_members")
        .select("role")
        .eq("league_id", league.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle(),
      supabase
        .from("drafts")
        .select("id, status, scheduled_start_at, actual_started_at, paused_at, current_round, current_pick_number, pick_time_seconds")
        .eq("league_id", league.id)
        .maybeSingle(),
    ]);

  const activeInvite = inviteCodes?.[0];
  const isCommissioner = currentMembership?.role === "commissioner";
  const canManageLeague = isCommissioner && league.status === "pre_draft";
  const canManageDraft = isCommissioner;

  return (
    <PageShell
      eyebrow="App / Leagues"
      title={league.name}
      description="This league page now supports the first commissioner controls for Sprint 1: durable invite-code management and pre-draft member removal."
    >
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="League overview"
          description="More commissioner controls and pre-draft settings will continue to land here as Sprint 1 progresses."
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
            <InfoRow
              label="Your Role"
              value={currentMembership?.role ?? "member"}
            />
          </div>

          {canManageLeague ? (
            <form action={updateLeagueSettings} className="mt-6 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="league_id" value={league.id} />
              <input type="hidden" name="league_slug" value={league.slug} />
              <label className="grid gap-2 text-sm text-stone-200">
                League name
                <input
                  type="text"
                  name="name"
                  defaultValue={league.name}
                  className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-stone-200">
                Slug
                <input
                  type="text"
                  value={league.slug}
                  disabled
                  className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-stone-500 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-stone-200 md:col-span-2">
                Draft datetime
                <input
                  type="datetime-local"
                  name="draft_starts_at"
                  defaultValue={toDateTimeLocalValue(league.draft_starts_at)}
                  className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none"
                />
              </label>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
                >
                  Save pre-draft settings
                </button>
                <p className="self-center text-sm text-stone-400">
                  Slug stays fixed after creation. Settings lock once the draft begins.
                </p>
              </div>
            </form>
          ) : null}
        </Panel>

        <Panel
          title="Invite status"
          description="MVP uses one active reusable invite code per league. It stays valid until the draft begins."
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

          {canManageLeague ? (
            <form action={regenerateInvite} className="mt-5">
              <input type="hidden" name="league_id" value={league.id} />
              <input type="hidden" name="league_slug" value={league.slug} />
              <button
                type="submit"
                className="rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
              >
                Regenerate invite code
              </button>
            </form>
          ) : null}
        </Panel>
      </div>

      <div className="mt-8">
        <Panel
          title="Draft lifecycle"
          description="This is the first draft control layer. It separates pre-draft setup from draft-ready, draft-live, and paused states so commissioners can handle delays more safely."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoRow label="League State" value={league.status.replaceAll("_", " ")} />
            <InfoRow
              label="Draft Status"
              value={draft?.status?.replaceAll("_", " ") ?? "not prepared"}
            />
            <InfoRow
              label="Scheduled Start"
              value={
                draft?.scheduled_start_at
                  ? new Date(draft.scheduled_start_at).toLocaleString()
                  : league.draft_starts_at
                    ? new Date(league.draft_starts_at).toLocaleString()
                    : "Not set"
              }
            />
            <InfoRow
              label="Current Pick"
              value={
                draft
                  ? `Round ${draft.current_round}, Pick ${draft.current_pick_number}`
                  : "Not started"
              }
            />
          </div>

          {canManageDraft ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {league.status === "pre_draft" ? (
                <form action={prepareDraft}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <button
                    type="submit"
                    className="rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
                  >
                    Prepare draft room
                  </button>
                </form>
              ) : null}

              {(league.status === "draft_ready" || league.status === "draft_paused") ? (
                <form action={startDraft}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <button
                    type="submit"
                    className="rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
                  >
                    {league.status === "draft_paused" ? "Resume draft" : "Start draft now"}
                  </button>
                </form>
              ) : null}

              {league.status === "draft_live" ? (
                <form action={pauseDraft}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <button
                    type="submit"
                    className="rounded-full border border-amber-300/25 bg-amber-400/10 px-5 py-3 text-sm text-amber-100"
                  >
                    Pause draft
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </div>

      <div className="mt-8">
        <Panel
          title="League members"
          description="Commissioners can remove non-commissioner members only before the league leaves pre-draft."
        >
          <div className="grid gap-4">
            {members?.map((member) => {
              const profile = Array.isArray(member.profiles)
                ? member.profiles[0]
                : member.profiles;
              const canRemove =
                canManageLeague &&
                member.role !== "commissioner" &&
                member.user_id !== user?.id;

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold text-stone-100">
                      {profile?.display_name ?? "Unnamed player"}
                    </p>
                    <p className="mt-1 text-sm text-stone-400">
                      {profile?.email ?? "No email available"}
                    </p>
                    <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                      {member.role}
                    </p>
                  </div>

                  {canRemove ? (
                    <form action={removeMember}>
                      <input type="hidden" name="league_id" value={league.id} />
                      <input type="hidden" name="league_slug" value={league.slug} />
                      <input
                        type="hidden"
                        name="member_user_id"
                        value={member.user_id}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-sm text-rose-100"
                      >
                        Remove member
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
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

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

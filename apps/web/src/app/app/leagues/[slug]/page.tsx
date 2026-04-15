import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

import {
  fillWithBots,
  pauseDraft,
  prepareDraft,
  regenerateInvite,
  removeParticipant,
  startDraft,
  updateLeagueSettings,
} from "./actions";

type LeagueParticipant = {
  id: string;
  user_id: string | null;
  participant_type: "human" | "bot";
  role: "commissioner" | "member";
  display_name: string;
  email: string | null;
  joined_at: string;
};

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

  const [
    { data: inviteCodes },
    { data: participants, error: participantsError },
    { data: currentParticipant },
    { data: draft },
  ] = await Promise.all([
    supabase
      .from("invite_codes")
      .select("code, expires_at, disabled_at, created_at")
      .eq("league_id", league.id)
      .is("disabled_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("league_participants")
      .select("id, user_id, participant_type, role, display_name, email, joined_at")
      .eq("league_id", league.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("league_participants")
      .select("id, user_id, participant_type, role, display_name, email, joined_at")
      .eq("league_id", league.id)
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("drafts")
      .select(
        "id, status, scheduled_start_at, actual_started_at, paused_at, current_round, current_pick_number, pick_time_seconds",
      )
      .eq("league_id", league.id)
      .maybeSingle(),
  ]);

  const myDraftPicks =
    currentParticipant?.id
      ? (
          await supabase
            .from("draft_picks")
            .select("pick_number, round_number, slot_number")
            .eq("league_id", league.id)
            .eq("participant_id", currentParticipant.id)
            .order("pick_number", { ascending: true })
        ).data
      : [];

  const activeInvite = inviteCodes?.[0];
  const isCommissioner = currentParticipant?.role === "commissioner";
  const canManageLeague = isCommissioner && league.status === "pre_draft";
  const canManageDraft = isCommissioner;
  const visibleParticipants = (participants ?? []) as LeagueParticipant[];
  const totalParticipants = visibleParticipants.length;
  const openSpots = Math.max(league.max_members - totalParticipants, 0);
  const hasBotParticipants = visibleParticipants.some(
    (participant) => participant.participant_type === "bot",
  );

  return (
    <PageShell
      eyebrow="App / Leagues"
      title={league.name}
    >
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="League overview"
          description="Commissioner controls, participant management, and pre-draft settings all live here while the league remains editable."
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
            <InfoRow
              label="Participants"
              value={`${totalParticipants} / ${league.max_members}`}
            />
            <InfoRow
              label="Your Role"
              value={currentParticipant?.role ?? "member"}
            />
          </div>

          {canManageLeague ? (
            <form
              action={updateLeagueSettings}
              className="mt-6 grid gap-4 md:grid-cols-2"
            >
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
            <div className="mt-5 flex flex-wrap gap-3">
              <form action={regenerateInvite}>
                <input type="hidden" name="league_id" value={league.id} />
                <input type="hidden" name="league_slug" value={league.slug} />
                <button
                  type="submit"
                  className="rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
                >
                  Regenerate invite code
                </button>
              </form>

              {openSpots > 0 ? (
                <form action={fillWithBots}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <button
                    type="submit"
                    className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-5 py-3 text-sm text-emerald-100"
                  >
                    Fill remaining spots with bots
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          <p className="mt-4 text-sm text-stone-400">
            {openSpots > 0
              ? `${openSpots} open spot${openSpots === 1 ? "" : "s"} remain before the league is full.`
              : hasBotParticipants
                ? "League is full, including bot participants added for testing."
                : "League is full."}
          </p>
        </Panel>
      </div>

      <div className="mt-8">
        <Panel
          title="Draft lifecycle"
          description="This separates pre-draft setup from draft-ready, draft-live, and paused states so commissioners can handle delays more safely."
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

          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                  Draft summary
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  For testing, draft order is generated when the commissioner prepares the room. The participant layer lets us support both humans and bots without fake auth accounts.
                </p>
              </div>
              <Link
                href={`/app/leagues/${league.slug}/draft`}
                className="rounded-full border border-white/14 bg-white/6 px-5 py-3 text-sm font-medium text-stone-100 transition-colors hover:bg-white/10"
              >
                Open draft room
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <InfoRow
                label="Your Slot"
                value={
                  myDraftPicks?.[0]?.slot_number
                    ? String(myDraftPicks[0].slot_number)
                    : "Not published"
                }
              />
              <InfoRow
                label="Next Picks"
                value={
                  myDraftPicks && myDraftPicks.length > 0
                    ? myDraftPicks
                        .slice(0, 3)
                        .map((pick) => `#${pick.pick_number}`)
                        .join(", ")
                    : "Not published"
                }
              />
              <InfoRow label="Format" value="Snake draft, 8 rounds" />
            </div>
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

              {(league.status === "draft_ready" ||
                league.status === "draft_paused") ? (
                <form action={startDraft}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <button
                    type="submit"
                    className="rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
                  >
                    {league.status === "draft_paused"
                      ? "Resume draft"
                      : "Start draft now"}
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
          title="League participants"
          description="Participants are now the draft-facing source of truth. Humans and bots both live here so the room can behave consistently."
        >
          {participantsError ? (
            <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Unable to load participants: {participantsError.message}
            </p>
          ) : visibleParticipants.length > 0 ? (
            <div className="grid gap-4">
              {visibleParticipants.map((participant) => {
                const canRemove =
                  canManageLeague &&
                  participant.role !== "commissioner" &&
                  participant.id !== currentParticipant?.id;

                return (
                  <div
                    key={participant.id}
                    className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-lg font-semibold text-stone-100">
                        {participant.display_name}
                      </p>
                      <p className="mt-1 text-sm text-stone-400">
                        {participant.email ??
                          (participant.participant_type === "bot"
                            ? "Bot participant"
                            : "No email available")}
                      </p>
                      <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                        {participant.participant_type} | {participant.role}
                      </p>
                    </div>

                    {canRemove ? (
                      <form action={removeParticipant}>
                        <input type="hidden" name="league_id" value={league.id} />
                        <input type="hidden" name="league_slug" value={league.slug} />
                        <input
                          type="hidden"
                          name="participant_id"
                          value={participant.id}
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-sm text-rose-100"
                        >
                          Remove participant
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-300">
              No participants are visible yet for this league.
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

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

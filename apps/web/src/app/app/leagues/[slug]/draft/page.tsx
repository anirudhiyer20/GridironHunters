import { notFound } from "next/navigation";

import {
  DRAFT_POSITIONS,
  MVP_DRAFT_ROSTER_SIZE,
  MVP_MAX_POSITION_COUNTS,
  MVP_REQUIRED_POSITION_COUNTS,
  type DraftPosition,
} from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

import {
  forceAutopickCurrentPick,
  pauseDraft,
  resolveTimedOutPick,
  setDraftControlMode,
} from "../actions";
import { DraftClock } from "./draft-clock";
import { DraftLiveClient } from "./draft-live-client";
import { DraftPlayerBrowser } from "./draft-player-browser";

type DraftRoomPick = {
  id: string;
  participant_id: string;
  pick_number: number;
  round_number: number;
  slot_number: number;
  status: string;
  picked_player_id: string | null;
  picked_player_key: string | null;
  picked_player_name: string | null;
  picked_position: string | null;
};

type LeagueParticipant = {
  id: string;
  user_id: string | null;
  participant_type: "human" | "bot";
  display_name: string;
  role?: "commissioner" | "member";
  draft_control_mode: "manual" | "autopick";
  draft_control_reason: string | null;
};

type DraftablePlayer = {
  id: string;
  key: string;
  fullName: string;
  shortName: string | null;
  position: DraftPosition;
  nflTeam: string;
  byeWeek: number | null;
  yearsExperience: number;
  age: number | null;
  college: string | null;
  fantasyPointsPpr: number;
  gamesPlayed: number;
  passingYards: number;
  passingTds: number;
  rushingYards: number;
  rushingTds: number;
  receptions: number;
  receivingYards: number;
  receivingTds: number;
};

type QueuedPlayer = DraftablePlayer & {
  queueRank: number;
};

type RosterCounts = Record<DraftPosition, number>;

export default async function DraftRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: league, error } = await supabase
    .from("leagues")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .single();

  if (error || !league) {
    notFound();
  }

  const { data: initialDraft } = await supabase
    .from("drafts")
    .select("status")
    .eq("league_id", league.id)
    .maybeSingle();

  if (initialDraft?.status === "live") {
    await supabase.rpc("process_live_draft_queue", {
      p_league_id: league.id,
    });
  }

  const [draftResult, picksResult, participantsResult, myParticipantResult, availablePlayersResult, queuedPlayersResult] =
    await Promise.all([
      supabase
        .from("drafts")
        .select(
          "id, status, current_round, current_pick_number, current_pick_started_at, pick_time_seconds, scheduled_start_at",
        )
        .eq("league_id", league.id)
        .maybeSingle(),
      supabase
        .from("draft_picks")
        .select(
          "id, participant_id, pick_number, round_number, slot_number, status, picked_player_id, picked_player_key, picked_player_name, picked_position",
        )
        .eq("league_id", league.id)
        .order("pick_number", { ascending: true }),
      supabase
        .from("league_participants")
        .select(
          "id, user_id, participant_type, display_name, role, draft_control_mode, draft_control_reason",
        )
        .eq("league_id", league.id),
      supabase
        .from("league_participants")
        .select(
          "id, user_id, participant_type, display_name, role, draft_control_mode, draft_control_reason",
        )
        .eq("league_id", league.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle(),
      supabase.rpc("list_available_draft_players", {
        p_league_id: league.id,
        p_position: null,
      }),
      supabase.rpc("list_my_draft_queue", {
        p_league_id: league.id,
      }),
    ]);

  const draft = draftResult.data;
  const draftPicks = (picksResult.data ?? []) as DraftRoomPick[];
  const participantList = (participantsResult.data ?? []) as LeagueParticipant[];
  const myParticipant = myParticipantResult.data as LeagueParticipant | null;
  const availablePlayers = mapDraftablePlayers(
    (availablePlayersResult.data ?? []) as PlayerRpcRow[],
  );
  const queuedPlayers = mapQueuedPlayers(
    (queuedPlayersResult.data ?? []) as QueueRpcRow[],
  );

  const participantsById = new Map(
    participantList.map((participant) => [participant.id, participant]),
  );
  const groupedPicks = groupPicksByRound(draftPicks);

  const currentPick = draft
    ? draftPicks.find((pick) => pick.pick_number === draft.current_pick_number)
    : undefined;
  const currentParticipant = currentPick
    ? participantsById.get(currentPick.participant_id)
    : undefined;
  const isMyTurn = Boolean(
    draft?.status === "live" && currentPick?.participant_id === myParticipant?.id,
  );
  const canResolveTimeout =
    draft?.status === "live" &&
    currentParticipant?.participant_type === "human" &&
    myParticipant?.role === "commissioner";
  const canForceAutopick =
    canResolveTimeout && currentParticipant?.draft_control_mode === "manual";
  const canPauseDraft =
    draft?.status === "live" && myParticipant?.role === "commissioner";
  const canToggleMode = Boolean(myParticipant?.participant_type === "human");
  const currentMode = myParticipant?.draft_control_mode ?? "manual";
  const nextMode = currentMode === "manual" ? "autopick" : "manual";
  const canQueue = myParticipant?.participant_type === "human";

  const myRoster = myParticipant
    ? draftPicks.filter(
        (pick) =>
          pick.participant_id === myParticipant.id &&
          (pick.status === "made" || pick.status === "autopicked"),
      )
    : [];
  const recentPicks = draftPicks
    .filter((pick) => pick.status === "made" || pick.status === "autopicked")
    .slice(-6)
    .reverse();
  const rosterCounts = buildRosterCounts(myRoster);
  const rosterSlotsRemaining = Math.max(0, MVP_DRAFT_ROSTER_SIZE - myRoster.length);
  const missingRequiredPositions = DRAFT_POSITIONS.filter(
    (position) => rosterCounts[position] < MVP_REQUIRED_POSITION_COUNTS[position],
  );
  const hasAdminControls = Boolean(canPauseDraft || canResolveTimeout || canForceAutopick);

  return (
    <PageShell
      eyebrow="App / Leagues / Draft"
      title={`${league.name} Draft Room`}
      description="Live draft command center for tracking the board, your roster build, and the player pool without burying the important information."
    >
      <div className="draft-console-shell p-4 sm:p-6">
        <div className="draft-console-inner p-4 sm:p-6 lg:p-8">
          <div className="mb-6 border-b border-[#6e95ff]/20 pb-5">
            <p className="draft-console-kicker text-xs text-[#7ca2ff]">Draft Command Center</p>
          </div>

          <Panel
            title="Live Draft Flow"
            className="draft-console-panel draft-console-outline"
            titleClassName="draft-console-title text-2xl"
          >
            <div className="flex flex-wrap items-center gap-3">
              <DraftClock
                isLive={draft?.status === "live"}
                currentPickStartedAt={draft?.current_pick_started_at ?? null}
                pickTimeSeconds={draft?.pick_time_seconds ?? null}
                isUsersPick={isMyTurn}
              />
              <ConsoleStat
                label="On The Clock"
                value={currentParticipant?.display_name ?? "Waiting"}
                accent={currentParticipant ? "blue" : "neutral"}
              />
              {canToggleMode ? (
                <form action={setDraftControlMode}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <input type="hidden" name="next_mode" value={nextMode} />
                  <button
                    type="submit"
                    className={`inline-flex h-14 min-w-[10rem] flex-col justify-center rounded-[1.25rem] border bg-[#0b1129]/75 px-4 text-left shadow-[inset_0_0_0_1px_rgba(142,171,255,0.06)] transition-colors hover:bg-[#111938] ${
                      currentMode === "autopick"
                        ? "border-fuchsia-400/30"
                        : "border-[#f2bf5e]/28"
                    }`}
                  >
                    <span className="draft-console-kicker text-[0.68rem] text-stone-500">Your</span>
                    <span className="mt-1 text-base font-semibold text-stone-100">
                      {toTitleCase(currentMode)}
                    </span>
                  </button>
                </form>
              ) : null}
              <DraftLiveClient
                isLive={draft?.status === "live"}
                leagueId={league.id}
                className="inline-flex h-14 items-center rounded-[1.25rem] border border-white/10 bg-black/20 px-5 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"
              />
            </div>
            {hasAdminControls ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#6e95ff]/12 pt-4">
                {canPauseDraft ? (
                  <form action={pauseDraft}>
                    <input type="hidden" name="league_id" value={league.id} />
                    <input type="hidden" name="league_slug" value={league.slug} />
                    <button type="submit" className="rounded-full border border-violet-300/25 bg-violet-400/10 px-5 py-3 text-sm uppercase tracking-[0.2em] text-violet-100 transition-colors hover:bg-violet-400/15">
                      Pause Draft
                    </button>
                  </form>
                ) : null}
                {canResolveTimeout ? (
                  <form action={resolveTimedOutPick}>
                    <input type="hidden" name="league_id" value={league.id} />
                    <input type="hidden" name="league_slug" value={league.slug} />
                    <button type="submit" className="rounded-full border border-amber-300/25 bg-amber-400/10 px-5 py-3 text-sm uppercase tracking-[0.2em] text-amber-100 transition-colors hover:bg-amber-400/15">
                      Resolve Timeout
                    </button>
                  </form>
                ) : null}
                {canForceAutopick ? (
                  <form action={forceAutopickCurrentPick}>
                    <input type="hidden" name="league_id" value={league.id} />
                    <input type="hidden" name="league_slug" value={league.slug} />
                    <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-5 py-3 text-sm uppercase tracking-[0.2em] text-rose-100 transition-colors hover:bg-rose-400/15">
                      Force Autopick
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </Panel>

          <div className="mt-8 grid gap-8 xl:grid-cols-[0.88fr_1.12fr]">
            <Panel
              title="Roster"
              className="draft-console-panel draft-console-outline"
              titleClassName="draft-console-title text-2xl"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ConsoleStat label="Roster Spots" value={String(rosterSlotsRemaining)} accent="gold" />
                <ConsoleStat
                  label="Needs"
                  value={missingRequiredPositions.length > 0 ? missingRequiredPositions.join(", ") : "Covered"}
                  accent={missingRequiredPositions.length > 0 ? "pink" : "blue"}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {DRAFT_POSITIONS.map((position) => {
                  const currentCount = rosterCounts[position];
                  const requiredCount = MVP_REQUIRED_POSITION_COUNTS[position];
                  const maxCount = MVP_MAX_POSITION_COUNTS[position];
                  const remainingNeed = Math.max(0, requiredCount - currentCount);

                  return (
                    <div key={position} className="rounded-[1.2rem] border border-[#6e95ff]/15 bg-[#0b1129]/70 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="draft-console-kicker text-[0.68rem] text-[#8eb0ff]">{position}</p>
                        <span className={`rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] ${remainingNeed > 0 ? "border-[#f2bf5e]/30 bg-[#f2bf5e]/10 text-[#f2bf5e]" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"}`}>
                          {remainingNeed > 0 ? `${remainingNeed} Needed` : "Covered"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-stone-300">
                        {currentCount} rostered | min {requiredCount}{maxCount ? ` | max ${maxCount}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-1">
                <section>
                  <p className="draft-console-kicker text-[0.68rem] text-[#8eb0ff]">Recent Picks</p>
                  {recentPicks.length > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {recentPicks.map((pick) => {
                        const participant = participantsById.get(pick.participant_id);

                        return (
                          <div key={pick.id} className="rounded-[1.2rem] border border-[#6e95ff]/15 bg-[#0b1129]/70 px-4 py-4">
                            <p className="draft-console-kicker text-[0.68rem] text-stone-500">Pick {pick.pick_number}</p>
                            <p className="mt-2 text-base font-semibold text-stone-100">{pick.picked_player_name}</p>
                            <p className="mt-1 text-sm text-stone-400">
                              {participant?.display_name ?? "Unknown participant"} | {pick.picked_position}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-300">
                      No picks yet.
                    </p>
                  )}
                </section>

                <section>
                  <p className="draft-console-kicker text-[0.68rem] text-[#8eb0ff]">Your Roster</p>
                  {myRoster.length > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {myRoster.map((pick) => (
                        <div key={pick.id} className="rounded-[1.2rem] border border-[#6e95ff]/15 bg-[#0b1129]/70 px-4 py-4">
                          <p className="draft-console-kicker text-[0.68rem] text-stone-500">Pick {pick.pick_number}</p>
                          <p className="mt-2 text-base font-semibold text-stone-100">{pick.picked_player_name}</p>
                          <p className="mt-1 text-sm text-stone-400">{pick.picked_position}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-300">
                      No rostered players yet.
                    </p>
                  )}
                </section>
              </div>
            </Panel>

            <Panel
              title="Player Intelligence"
              className="draft-console-panel draft-console-outline"
              titleClassName="draft-console-title text-2xl"
            >
              <DraftPlayerBrowser
                leagueId={league.id}
                leagueSlug={league.slug}
                draftStatus={draft?.status ?? null}
                isMyTurn={isMyTurn}
                isMyAutopickMode={currentMode === "autopick"}
                canQueue={Boolean(canQueue)}
                availablePlayers={availablePlayers}
                queuedPlayers={queuedPlayers}
                rosterCounts={rosterCounts}
              />
            </Panel>
          </div>

          <div className="mt-8">
            <Panel
              title="Snake Board"
              className="draft-console-panel draft-console-outline"
              titleClassName="draft-console-title text-2xl"
            >
              {groupedPicks.length > 0 ? (
                <div className="grid gap-5">
                  {groupedPicks.map(([roundNumber, roundPicks]) => (
                    <section key={roundNumber} className="rounded-[1.5rem] border border-[#6e95ff]/18 bg-[#0b1129]/70 px-5 py-5 shadow-[inset_0_0_0_1px_rgba(142,171,255,0.06)]">
                      <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#6e95ff]/16 pb-3">
                        <h2 className="draft-console-title text-xl text-white">Round {roundNumber}</h2>
                        <span className="draft-console-kicker text-[0.68rem] text-[#8eb0ff]">Snake Lane</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
                        {roundPicks.map((pick) => {
                          const participant = participantsById.get(pick.participant_id);
                          const isCurrentPick = draft?.current_pick_number === pick.pick_number && pick.status === "pending";
                          const isMyPick = pick.participant_id === myParticipant?.id;

                          return (
                            <div
                              key={pick.pick_number}
                              className={`rounded-[1.25rem] border px-3 py-3 transition-colors ${
                                isCurrentPick
                                  ? "border-[#f2bf5e]/50 bg-[#f2bf5e]/12 shadow-[0_0_24px_rgba(242,191,94,0.12)]"
                                  : isMyPick
                                    ? "border-emerald-300/25 bg-emerald-400/10"
                                    : "border-[#6e95ff]/14 bg-black/25"
                              }`}
                            >
                              <p className="draft-console-kicker text-[0.62rem] text-stone-500">{pick.pick_number}</p>
                              <p className="mt-2 text-sm font-semibold leading-5 text-stone-100">
                                {participant?.display_name ?? "Unknown"}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-stone-400">
                                {pick.picked_player_name ? pick.picked_player_name : "Pending"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-300">
                  Draft order has not been published yet.
                </p>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

type PlayerRpcRow = {
  player_id: string;
  player_key: string;
  full_name: string;
  short_name: string | null;
  picked_position: string;
  nfl_team: string;
  bye_week: number | null;
  years_experience: number;
  age: number | null;
  college: string | null;
  fantasy_points_ppr: number;
  games_played: number;
  passing_yards: number;
  passing_tds: number;
  rushing_yards: number;
  rushing_tds: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
};

type QueueRpcRow = PlayerRpcRow & {
  queue_rank: number;
};

function mapDraftablePlayers(players: PlayerRpcRow[]): DraftablePlayer[] {
  return players.map((player) => ({
    id: player.player_id,
    key: player.player_key,
    fullName: player.full_name,
    shortName: player.short_name,
    position: player.picked_position as DraftPosition,
    nflTeam: player.nfl_team,
    byeWeek: player.bye_week,
    yearsExperience: Number(player.years_experience ?? 0),
    age: player.age,
    college: player.college,
    fantasyPointsPpr: Number(player.fantasy_points_ppr ?? 0),
    gamesPlayed: Number(player.games_played ?? 0),
    passingYards: Number(player.passing_yards ?? 0),
    passingTds: Number(player.passing_tds ?? 0),
    rushingYards: Number(player.rushing_yards ?? 0),
    rushingTds: Number(player.rushing_tds ?? 0),
    receptions: Number(player.receptions ?? 0),
    receivingYards: Number(player.receiving_yards ?? 0),
    receivingTds: Number(player.receiving_tds ?? 0),
  }));
}

function mapQueuedPlayers(players: QueueRpcRow[]): QueuedPlayer[] {
  return players.map((player) => ({
    queueRank: Number(player.queue_rank),
    ...mapDraftablePlayers([player])[0],
  }));
}

function buildRosterCounts(picks: DraftRoomPick[]): RosterCounts {
  return DRAFT_POSITIONS.reduce(
    (counts, position) => ({
      ...counts,
      [position]: picks.filter((pick) => pick.picked_position === position).length,
    }),
    {} as RosterCounts,
  );
}

function groupPicksByRound(picks: DraftRoomPick[]) {
  const grouped = new Map<number, DraftRoomPick[]>();

  for (const pick of picks) {
    const round = grouped.get(pick.round_number) ?? [];
    round.push(pick);
    grouped.set(pick.round_number, round);
  }

  return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function ConsoleStat({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: string;
  accent?: "neutral" | "blue" | "gold" | "pink";
}) {
  const accentClass =
    accent === "blue"
      ? "border-[#6e95ff]/28"
      : accent === "gold"
        ? "border-[#f2bf5e]/28"
        : accent === "pink"
          ? "border-fuchsia-400/25"
          : "border-white/10";

  return (
    <div className={`inline-flex h-14 min-w-[10rem] flex-col justify-center rounded-[1.25rem] bg-[#0b1129]/70 px-4 shadow-[inset_0_0_0_1px_rgba(142,171,255,0.06)] ${accentClass} border`}>
      <p className="draft-console-kicker text-[0.68rem] text-stone-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-stone-100">{value}</p>
    </div>
  );
}

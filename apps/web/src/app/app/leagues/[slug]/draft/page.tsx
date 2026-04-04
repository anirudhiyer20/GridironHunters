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
  reclaimManualControl,
  resolveTimedOutPick,
} from "../actions";
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
  const isMyTurn =
    draft?.status === "live" &&
    Boolean(currentPick) &&
    currentPick?.participant_id === myParticipant?.id;
  const canResolveTimeout =
    draft?.status === "live" &&
    currentParticipant?.participant_type === "human" &&
    myParticipant?.role === "commissioner";
  const canForceAutopick =
    canResolveTimeout && currentParticipant?.draft_control_mode === "manual";
  const isMyAutopickMode = myParticipant?.draft_control_mode === "autopick";
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
    .slice(-8)
    .reverse();
  const rosterCounts = buildRosterCounts(myRoster);
  const rosterSlotsRemaining = Math.max(
    0,
    MVP_DRAFT_ROSTER_SIZE - myRoster.length,
  );
  const missingRequiredPositions = DRAFT_POSITIONS.filter(
    (position) => rosterCounts[position] < MVP_REQUIRED_POSITION_COUNTS[position],
  );

  return (
    <PageShell
      eyebrow="App / Leagues / Draft"
      title={`${league.name} draft room`}
      description="The draft room now keeps the live player pool visible at all times, lets users queue targets while others pick, and adds first-pass rules-based draft guidance without relying on projections yet."
    >
      <div className="grid gap-8">
        <Panel
          title="Draft status"
          description="Order is published when the commissioner prepares the room, and the live draft loop now runs against actual player records."
        >
          <DraftLiveClient
            isLive={draft?.status === "live"}
            leagueId={league.id}
            currentPickStartedAt={draft?.current_pick_started_at ?? null}
            pickTimeSeconds={draft?.pick_time_seconds ?? null}
            onTheClockName={currentParticipant?.display_name ?? null}
          />
          {message ? (
            <p className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-5">
            <InfoRow label="League State" value={league.status.replaceAll("_", " ")} />
            <InfoRow label="Draft State" value={draft?.status?.replaceAll("_", " ") ?? "not prepared"} />
            <InfoRow
              label="Current Pick"
              value={draft ? `Round ${draft.current_round}, Pick ${draft.current_pick_number}` : "Not started"}
            />
            <InfoRow label="On The Clock" value={currentParticipant?.display_name ?? "Waiting"} />
            <InfoRow label="Current Control" value={currentParticipant?.draft_control_mode ?? "n/a"} />
          </div>

          {isMyAutopickMode ? (
            <div className="mt-5 rounded-[1.5rem] border border-sky-300/25 bg-sky-400/10 px-5 py-5">
              <p className="text-sm text-sky-100">
                You are currently in autopick mode{myParticipant?.draft_control_reason ? ` because of ${myParticipant.draft_control_reason.replaceAll("_", " ")}` : ""}. Reclaim manual control whenever you are ready, and you will keep it unless you time out again.
              </p>
              <div className="mt-4">
                <form action={reclaimManualControl}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <button type="submit" className="rounded-full border border-sky-300/30 bg-sky-400/15 px-5 py-3 text-sm text-sky-100">
                    Reclaim manual control
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {canResolveTimeout ? (
            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5">
              <p className="text-sm text-stone-300">
                Once the pick clock reaches 00:00, the room should auto-advance on its own. If someone is clearly unavailable or stuck, you can still force autopick early and they will stay on autopick until they reclaim control.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={resolveTimedOutPick}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <button type="submit" className="rounded-full border border-amber-300/25 bg-amber-400/10 px-5 py-3 text-sm text-amber-100">
                    Resolve timed out pick
                  </button>
                </form>
                {canForceAutopick ? (
                  <form action={forceAutopickCurrentPick}>
                    <input type="hidden" name="league_id" value={league.id} />
                    <input type="hidden" name="league_slug" value={league.slug} />
                    <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-5 py-3 text-sm text-rose-100">
                      Force autopick now
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel
            title="Draft board"
            description="Inside the room, we show the full snake order grouped by round and now mark completed picks with the drafted player."
          >
            {groupedPicks.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {groupedPicks.map(([roundNumber, roundPicks]) => (
                  <section key={roundNumber} className="rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5">
                    <h2 className="text-lg font-semibold text-stone-100">Round {roundNumber}</h2>
                    <div className="mt-4 grid gap-3">
                      {roundPicks.map((pick) => {
                        const participant = participantsById.get(pick.participant_id);
                        const isCurrentPick = draft?.current_pick_number === pick.pick_number && pick.status === "pending";
                        const isMyPick = pick.participant_id === myParticipant?.id;

                        return (
                          <div
                            key={pick.pick_number}
                            className={`rounded-2xl border px-4 py-4 ${
                              isCurrentPick
                                ? "border-[#f2bf5e]/45 bg-[#f2bf5e]/10"
                                : isMyPick
                                  ? "border-emerald-300/25 bg-emerald-400/10"
                                  : "border-white/10 bg-black/15"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                                  Pick {pick.pick_number} | Slot {pick.slot_number}
                                </p>
                                <p className="mt-2 text-base font-medium text-stone-100">
                                  {participant?.display_name ?? "Unknown participant"}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-stone-500">
                                  {participant?.participant_type ?? "unknown"} | {participant?.draft_control_mode ?? "manual"}
                                </p>
                                <p className="mt-3 text-sm text-stone-300">
                                  {pick.picked_player_name
                                    ? `${pick.picked_player_name} (${pick.picked_position})`
                                    : "No player selected yet"}
                                </p>
                              </div>
                              <div className="text-right text-xs uppercase tracking-[0.24em] text-stone-400">
                                {isCurrentPick ? "On the clock" : isMyPick ? "Your pick" : pick.status}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-300">
                Draft order has not been published yet. Fill the league and prepare the room first.
              </p>
            )}
          </Panel>

          <div className="grid gap-8">
            <Panel
              title="Your roster"
              description="This panel now shows what you still need to satisfy MVP roster rules, not just who you already drafted."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Roster Spots Left" value={String(rosterSlotsRemaining)} />
                <InfoRow
                  label="Required Needs"
                  value={missingRequiredPositions.length > 0 ? missingRequiredPositions.join(", ") : "All minimums covered"}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {DRAFT_POSITIONS.map((position) => {
                  const currentCount = rosterCounts[position];
                  const requiredCount = MVP_REQUIRED_POSITION_COUNTS[position];
                  const maxCount = MVP_MAX_POSITION_COUNTS[position];
                  const remainingNeed = Math.max(0, requiredCount - currentCount);

                  return (
                    <div key={position} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">{position}</p>
                        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em] ${remainingNeed > 0 ? "border-[#f2bf5e]/30 bg-[#f2bf5e]/10 text-[#f2bf5e]" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"}`}>
                          {remainingNeed > 0 ? `${remainingNeed} needed` : "Covered"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-stone-300">
                        {currentCount} rostered | minimum {requiredCount}{maxCount ? ` | max ${maxCount}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
              {myRoster.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {myRoster.map((pick) => (
                    <div key={pick.id} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                        Pick {pick.pick_number} | {pick.status}
                      </p>
                      <p className="mt-2 text-base font-medium text-stone-100">{pick.picked_player_name}</p>
                      <p className="mt-1 text-sm text-stone-400">{pick.picked_position}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-300">
                  You have not drafted anyone yet.
                </p>
              )}
            </Panel>

            <Panel
              title="Player pool and queue"
              description="Scout the live pool while others pick, build your queue ahead of time, and still draft directly from the same cards when your turn arrives."
            >
              {isMyTurn && isMyAutopickMode ? (
                <p className="mb-5 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                  It is your turn, but you are currently in autopick mode. Reclaim manual control first if you want to choose this pick yourself. Your queue will still guide autopick until you take control back.
                </p>
              ) : null}

              <DraftPlayerBrowser
                leagueId={league.id}
                leagueSlug={league.slug}
                draftStatus={draft?.status ?? null}
                isMyTurn={Boolean(isMyTurn)}
                isMyAutopickMode={Boolean(isMyAutopickMode)}
                canQueue={Boolean(canQueue)}
                availablePlayers={availablePlayers}
                queuedPlayers={queuedPlayers}
                rosterCounts={rosterCounts}
              />
            </Panel>

            <Panel
              title="Recent picks"
              description="This gives you a quick pulse on what just happened without scanning the whole board."
            >
              {recentPicks.length > 0 ? (
                <div className="grid gap-3">
                  {recentPicks.map((pick) => {
                    const participant = participantsById.get(pick.participant_id);

                    return (
                      <div key={pick.id} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                        <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">Pick {pick.pick_number}</p>
                        <p className="mt-2 text-base font-medium text-stone-100">{pick.picked_player_name}</p>
                        <p className="mt-1 text-sm text-stone-400">
                          {participant?.display_name ?? "Unknown participant"} | {pick.picked_position}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-300">
                  No picks have been made yet.
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
      <p className="mt-2 break-words text-base font-medium text-stone-100">{value}</p>
    </div>
  );
}

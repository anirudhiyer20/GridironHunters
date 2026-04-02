import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

import { resolveTimedOutPick, submitDraftPick } from "../actions";
import { DraftLiveClient } from "./draft-live-client";

type DraftRoomPick = {
  id: string;
  participant_id: string;
  pick_number: number;
  round_number: number;
  slot_number: number;
  status: string;
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
};

type TestDraftPlayer = {
  key: string;
  name: string;
  position: "QB" | "RB" | "WR" | "TE";
};

const TEST_DRAFT_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

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

  const [{ data: draft }, { data: picks }, { data: participants }, { data: myParticipant }] =
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
          "id, participant_id, pick_number, round_number, slot_number, status, picked_player_key, picked_player_name, picked_position",
        )
        .eq("league_id", league.id)
        .order("pick_number", { ascending: true }),
      supabase
        .from("league_participants")
        .select("id, user_id, participant_type, display_name, role")
        .eq("league_id", league.id),
      supabase
        .from("league_participants")
        .select("id, user_id, participant_type, display_name, role")
        .eq("league_id", league.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle(),
    ]);

  const participantList = (participants ?? []) as LeagueParticipant[];
  const draftPicks = (picks ?? []) as DraftRoomPick[];
  const participantsById = new Map(
    participantList.map((participant) => [participant.id, participant]),
  );
  const groupedPicks = groupPicksByRound(draftPicks);
  const draftedKeys = new Set(
    draftPicks
      .map((pick) => pick.picked_player_key)
      .filter((value): value is string => Boolean(value)),
  );
  const availablePlayers = buildTestDraftPool().filter(
    (player) => !draftedKeys.has(player.key),
  );
  const availablePlayersByPosition = new Map(
    TEST_DRAFT_POSITIONS.map((position) => [
      position,
      availablePlayers.filter((player) => player.position === position),
    ]),
  );

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

  const pickStartedAt = draft?.current_pick_started_at
    ? new Date(draft.current_pick_started_at)
    : null;
  const timeoutAt =
    pickStartedAt && draft?.pick_time_seconds
      ? new Date(pickStartedAt.getTime() + draft.pick_time_seconds * 1000)
      : null;

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

  return (
    <PageShell
      eyebrow="App / Leagues / Draft"
      title={`${league.name} draft room`}
      description="This room now supports the first real pick flow: humans make live picks, bots auto-advance during testing, and roster rules are enforced at the database layer."
    >
      <div className="grid gap-8">
        <Panel
          title="Draft status"
          description="For now, order is published when the commissioner prepares the draft room. The same participant model now supports both humans and test bots in a single draft loop."
        >
          <DraftLiveClient isLive={draft?.status === "live"} />
          {message ? (
            <p className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-5">
            <InfoRow
              label="League State"
              value={league.status.replaceAll("_", " ")}
            />
            <InfoRow
              label="Draft State"
              value={draft?.status?.replaceAll("_", " ") ?? "not prepared"}
            />
            <InfoRow
              label="Current Pick"
              value={
                draft
                  ? `Round ${draft.current_round}, Pick ${draft.current_pick_number}`
                  : "Not started"
              }
            />
            <InfoRow
              label="On The Clock"
              value={currentParticipant?.display_name ?? "Waiting"}
            />
            <InfoRow
              label="Timeout"
              value={timeoutAt ? timeoutAt.toLocaleTimeString() : "Not running"}
            />
          </div>

          {canResolveTimeout ? (
            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5">
              <p className="text-sm text-stone-300">
                {timeoutAt
                  ? `If ${currentParticipant?.display_name} has exceeded the pick clock, you can resolve this turn at or after ${timeoutAt.toLocaleTimeString()}.`
                  : `${currentParticipant?.display_name} is currently on the clock.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={resolveTimedOutPick}>
                  <input type="hidden" name="league_id" value={league.id} />
                  <input type="hidden" name="league_slug" value={league.slug} />
                  <button
                    type="submit"
                    className="rounded-full border border-amber-300/25 bg-amber-400/10 px-5 py-3 text-sm text-amber-100"
                  >
                    Resolve timed out pick
                  </button>
                </form>
                <p className="self-center text-sm text-stone-400">
                  The database will reject this if the timer has not actually expired yet.
                </p>
              </div>
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel
            title="Draft board"
            description="Inside the room, we show the full snake order grouped by round and now mark completed picks with the drafted player."
          >
            {groupedPicks.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {groupedPicks.map(([roundNumber, roundPicks]) => (
                  <section
                    key={roundNumber}
                    className="rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5"
                  >
                    <h2 className="text-lg font-semibold text-stone-100">
                      Round {roundNumber}
                    </h2>
                    <div className="mt-4 grid gap-3">
                      {roundPicks.map((pick) => {
                        const participant = participantsById.get(pick.participant_id);
                        const isCurrentPick =
                          draft?.current_pick_number === pick.pick_number &&
                          pick.status === "pending";
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
                                  {participant?.participant_type ?? "unknown"}
                                </p>
                                <p className="mt-3 text-sm text-stone-300">
                                  {pick.picked_player_name
                                    ? `${pick.picked_player_name} (${pick.picked_position})`
                                    : "No player selected yet"}
                                </p>
                              </div>
                              <div className="text-right text-xs uppercase tracking-[0.24em] text-stone-400">
                                {isCurrentPick
                                  ? "On the clock"
                                  : isMyPick
                                    ? "Your pick"
                                    : pick.status}
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
              description="Roster-rule enforcement starts now: 8 total picks, minimum 1 QB / RB / WR / TE, and a maximum of 2 QBs."
            >
              {myRoster.length > 0 ? (
                <div className="grid gap-3">
                  {myRoster.map((pick) => (
                    <div
                      key={pick.id}
                      className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4"
                    >
                      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                        Pick {pick.pick_number} | {pick.status}
                      </p>
                      <p className="mt-2 text-base font-medium text-stone-100">
                        {pick.picked_player_name}
                      </p>
                      <p className="mt-1 text-sm text-stone-400">
                        {pick.picked_position}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-300">
                  You have not drafted anyone yet.
                </p>
              )}
            </Panel>

            <Panel
              title="Pick center"
              description="Only the current on-the-clock human participant can submit a pick. Bot turns resolve automatically while the draft is live."
            >
              {isMyTurn ? (
                <div className="grid gap-5">
                  <p className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-300">
                    This list refreshes during the live draft, but the database still has the final say. If another participant grabs a player first, your submission will be rejected and the room will refresh.
                  </p>
                  {TEST_DRAFT_POSITIONS.map((position) => {
                    const options = availablePlayersByPosition.get(position) ?? [];

                    return (
                      <section key={position} className="grid gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-stone-100">
                            {position}
                          </h3>
                          <p className="text-sm text-stone-400">
                            Test pool options for this position. The database will reject picks that would break roster rules.
                          </p>
                        </div>
                        <div className="grid gap-2">
                          {options.length > 0 ? (
                            options.map((player) => (
                              <form key={player.key} action={submitDraftPick}>
                                <input type="hidden" name="league_id" value={league.id} />
                                <input type="hidden" name="league_slug" value={league.slug} />
                                <input type="hidden" name="player_key" value={player.key} />
                                <input type="hidden" name="player_name" value={player.name} />
                                <input type="hidden" name="position" value={player.position} />
                                <button
                                  type="submit"
                                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-left transition-colors hover:bg-white/10"
                                >
                                  <span>
                                    <span className="block text-sm font-medium text-stone-100">
                                      {player.name}
                                    </span>
                                    <span className="mt-1 block font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                                      {player.key}
                                    </span>
                                  </span>
                                  <span className="text-xs uppercase tracking-[0.24em] text-stone-400">
                                    Draft
                                  </span>
                                </button>
                              </form>
                            ))
                          ) : (
                            <p className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-stone-400">
                              No currently available {position} options remain in the live pool.
                            </p>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-300">
                  {draft?.status !== "live"
                    ? "The draft must be live before picks can be submitted."
                    : currentParticipant?.participant_type === "bot"
                      ? `${currentParticipant.display_name} is a bot. Its pick will resolve automatically.`
                      : currentParticipant
                        ? `${currentParticipant.display_name} is currently on the clock.`
                        : "Waiting for the current pick to load."}
                </p>
              )}
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
                      <div
                        key={pick.id}
                        className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4"
                      >
                        <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                          Pick {pick.pick_number}
                        </p>
                        <p className="mt-2 text-base font-medium text-stone-100">
                          {pick.picked_player_name}
                        </p>
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

function buildTestDraftPool(): TestDraftPlayer[] {
  return TEST_DRAFT_POSITIONS.flatMap((position) =>
    Array.from({ length: 20 }, (_, index) => ({
      key: `${position}${String(index + 1).padStart(2, "0")}`,
      name: `Test ${position} ${index + 1}`,
      position,
    })),
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
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-medium text-stone-100">
        {value}
      </p>
    </div>
  );
}

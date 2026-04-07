"use client";

import { type ReactNode, useDeferredValue, useMemo, useState } from "react";

import {
  DRAFT_POSITIONS,
  MVP_DRAFT_ROSTER_SIZE,
  MVP_MAX_POSITION_COUNTS,
  MVP_REQUIRED_POSITION_COUNTS,
  type DraftPosition,
} from "@gridiron/shared";

import {
  clearDraftQueue,
  queueDraftPlayer,
  submitDraftPick,
  unqueueDraftPlayer,
} from "../actions";

type DraftablePlayer = {
  id: string;
  source: string;
  key: string;
  fullName: string;
  shortName: string | null;
  position: DraftPosition;
  nflTeam: string;
  byeWeek: number | null;
  yearsExperience: number;
  age: number | null;
  college: string | null;
  providerValue: number | null;
  providerOverallRank: number | null;
  providerPositionRank: number | null;
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

type DraftPlayerBrowserProps = {
  leagueId: string;
  leagueSlug: string;
  draftStatus: string | null;
  isMyTurn: boolean;
  isMyAutopickMode: boolean;
  canQueue: boolean;
  availablePlayers: DraftablePlayer[];
  queuedPlayers: QueuedPlayer[];
  rosterCounts: RosterCounts;
};

const POSITION_OPTIONS = ["ALL", ...DRAFT_POSITIONS] as const;
type SortOption = "recommended" | "best" | "alphabetical" | "bye" | "age";
type SourceOption = "ALL" | "seed" | "fantasycalc";

type PlayerInsight = {
  score: number;
  isLegalNow: boolean;
  recommendationLabel: string;
  reason: string;
};

export function DraftPlayerBrowser({
  leagueId,
  leagueSlug,
  draftStatus,
  isMyTurn,
  isMyAutopickMode,
  canQueue,
  availablePlayers,
  queuedPlayers,
  rosterCounts,
}: DraftPlayerBrowserProps) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<(typeof POSITION_OPTIONS)[number]>("ALL");
  const [source, setSource] = useState<SourceOption>("ALL");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState<SortOption>("recommended");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const queuedPlayerIds = new Set(queuedPlayers.map((player) => player.id));
  const nflTeams = Array.from(new Set(availablePlayers.map((player) => player.nflTeam))).sort();
  const totalRostered = DRAFT_POSITIONS.reduce(
    (sum, draftPosition) => sum + rosterCounts[draftPosition],
    0,
  );
  const rosterSlotsRemaining = Math.max(0, MVP_DRAFT_ROSTER_SIZE - totalRostered);

  const playerInsights = useMemo(
    () =>
      new Map(
        availablePlayers.map((player) => [
          player.id,
          evaluatePlayer(player, rosterCounts, rosterSlotsRemaining),
        ]),
      ),
    [availablePlayers, rosterCounts, rosterSlotsRemaining],
  );

  const filteredPlayers = [...availablePlayers]
    .filter((player) => {
      if (position !== "ALL" && player.position !== position) {
        return false;
      }

      if (team !== "ALL" && player.nflTeam !== team) {
        return false;
      }

      if (source !== "ALL" && player.source !== source) {
        return false;
      }

      if (!deferredSearch) {
        return true;
      }

      const haystack = [
        player.fullName,
        player.shortName ?? "",
        player.key,
        player.position,
        player.nflTeam,
        player.college ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearch);
    })
    .sort((a, b) => {
      const aInsight = playerInsights.get(a.id)!;
      const bInsight = playerInsights.get(b.id)!;

      if (sort === "recommended") {
        return (
          bInsight.score - aInsight.score ||
          getPlayerBoardScore(b) - getPlayerBoardScore(a) ||
          a.fullName.localeCompare(b.fullName)
        );
      }

      if (sort === "alphabetical") {
        return a.fullName.localeCompare(b.fullName);
      }

      if (sort === "bye") {
        return (
          (a.byeWeek ?? 99) - (b.byeWeek ?? 99) ||
          getPlayerBoardScore(b) - getPlayerBoardScore(a)
        );
      }

      if (sort === "age") {
        return (
          (a.age ?? 99) - (b.age ?? 99) ||
          getPlayerBoardScore(b) - getPlayerBoardScore(a)
        );
      }

      return getPlayerBoardScore(b) - getPlayerBoardScore(a) || a.fullName.localeCompare(b.fullName);
    });

  const topRecommendations = filteredPlayers.slice(0, 3);

  return (
    <div className="grid gap-6">
      {canQueue ? (
        <section className="draft-console-outline rounded-[1.65rem] border border-[#6e95ff]/18 bg-[#091228]/82 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#6e95ff]/14 pb-4">
            <div>
              <p className="draft-console-kicker text-[0.68rem] text-[#8eb0ff]">Priority queue</p>
              <h3 className="draft-console-title mt-2 text-xl text-white">Your queue</h3>
              <p className="mt-2 max-w-xl text-sm leading-7 text-stone-300">
                Queue players while others are on the clock. If you time out or stay on autopick, the system will try your queued players first.
              </p>
            </div>
            {queuedPlayers.length > 0 ? (
              <form action={clearDraftQueue}>
                <input type="hidden" name="league_id" value={leagueId} />
                <input type="hidden" name="league_slug" value={leagueSlug} />
                <button
                  type="submit"
                  className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"
                >
                  Clear queue
                </button>
              </form>
            ) : null}
          </div>

          {queuedPlayers.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {queuedPlayers.map((player) => (
                <div key={player.id} className="rounded-[1.2rem] border border-[#6e95ff]/14 bg-black/25 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="draft-console-kicker text-[0.68rem] text-stone-500">Queue #{player.queueRank}</p>
                      <p className="mt-2 text-base font-semibold text-stone-100">{player.fullName}</p>
                      <p className="mt-1 text-sm text-stone-400">
                        {player.position} | {player.nflTeam} | Bye {player.byeWeek ?? "-"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isMyTurn && !isMyAutopickMode && draftStatus === "live" ? (
                        <form action={submitDraftPick}>
                          <input type="hidden" name="league_id" value={leagueId} />
                          <input type="hidden" name="league_slug" value={leagueSlug} />
                          <input type="hidden" name="player_id" value={player.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-100 transition-colors hover:bg-emerald-400/15"
                          >
                            Draft now
                          </button>
                        </form>
                      ) : null}
                      <form action={unqueueDraftPlayer}>
                        <input type="hidden" name="league_id" value={leagueId} />
                        <input type="hidden" name="league_slug" value={leagueSlug} />
                        <input type="hidden" name="player_id" value={player.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <StatChip label="Draft Value" value={formatDraftValue(player)} />
                    <StatChip label="Age" value={player.age ? String(player.age) : "-"} />
                    <StatChip label="Exp" value={String(player.yearsExperience)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-400">
              Your queue is empty. Add players below so you have a plan ready before your next turn.
            </p>
          )}
        </section>
      ) : null}

      <section className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="draft-console-kicker text-[0.68rem] text-[#8eb0ff]">Player intelligence</p>
            <h3 className="draft-console-title mt-2 text-2xl text-white">Available player pool</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-300">
              The pool stays visible throughout the live draft, with enough structure to browse comfortably even while other teams are making decisions.
            </p>
          </div>
          <div className="draft-console-chip rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-300">
            {filteredPlayers.length} available
          </div>
        </div>

        <div className="draft-console-outline rounded-[1.65rem] border border-[#f2bf5e]/18 bg-[#120f22]/78 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f2bf5e]/14 pb-4">
            <div>
              <p className="draft-console-kicker text-[0.68rem] text-[#f2bf5e]">Guidance layer</p>
              <h4 className="draft-console-title mt-2 text-xl text-white">Recommendation snapshot</h4>
              <p className="mt-2 max-w-xl text-sm leading-7 text-stone-300">
                This first-pass guidance is rules-based: it weights roster needs against imported market value, then falls back to last season&apos;s production when needed.
              </p>
            </div>
            <div className="draft-console-chip rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-300">
              {rosterSlotsRemaining} slots left
            </div>
          </div>
          {topRecommendations.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {topRecommendations.map((player, index) => {
                const insight = playerInsights.get(player.id)!;

                return (
                  <div key={player.id} className="rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-4">
                    <p className="draft-console-kicker text-[0.68rem] text-stone-500">Recommendation #{index + 1}</p>
                    <p className="mt-2 text-base font-semibold text-stone-100">{player.fullName}</p>
                    <p className="mt-1 text-sm text-stone-400">{player.position} | {player.nflTeam}</p>
                    <p className="mt-3 text-sm leading-7 text-stone-300">{insight.reason}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr]">
          <label className="grid gap-2 text-sm text-stone-300">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by player, school, team, or key"
              className="rounded-[1.15rem] border border-[#6e95ff]/16 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#f2bf5e]/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-300">
            Position
            <select
              value={position}
              onChange={(event) => setPosition(event.target.value as (typeof POSITION_OPTIONS)[number])}
              className="rounded-[1.15rem] border border-[#6e95ff]/16 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#f2bf5e]/40"
            >
              {POSITION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-stone-300">
            Source
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as SourceOption)}
              className="rounded-[1.15rem] border border-[#6e95ff]/16 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#f2bf5e]/40"
            >
              <option value="ALL">ALL</option>
              <option value="seed">Seed</option>
              <option value="fantasycalc">FantasyCalc</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-stone-300">
            NFL Team
            <select
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              className="rounded-[1.15rem] border border-[#6e95ff]/16 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#f2bf5e]/40"
            >
              <option value="ALL">ALL</option>
              {nflTeams.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-stone-300">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="rounded-[1.15rem] border border-[#6e95ff]/16 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#f2bf5e]/40"
            >
              <option value="recommended">Recommended</option>
              <option value="best">Best available</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="bye">Bye week</option>
              <option value="age">Youngest first</option>
            </select>
          </label>
        </div>

        {filteredPlayers.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {filteredPlayers.map((player) => {
              const isQueued = queuedPlayerIds.has(player.id);
              const insight = playerInsights.get(player.id)!;

              return (
                <div
                  key={player.id}
                  className={`draft-console-glow grid gap-4 rounded-[1.4rem] border px-4 py-4 transition-colors ${
                    isQueued
                      ? "border-sky-300/25 bg-sky-400/10"
                      : "border-[#6e95ff]/16 bg-[#0a1127]/84"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-stone-100">{player.fullName}</p>
                      <p className="mt-1 text-sm text-stone-400">
                        {player.position} | {player.nflTeam} | Bye {player.byeWeek ?? "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="draft-console-kicker text-[0.68rem] text-stone-500">Draft Value</p>
                      <p className="mt-1 text-xl font-semibold text-stone-100">{formatDraftValue(player)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <TagChip tone={insight.isLegalNow ? "emerald" : "stone"}>{insight.recommendationLabel}</TagChip>
                    {isQueued ? <TagChip tone="sky">Queued</TagChip> : null}
                    <TagChip tone="stone">{formatSourceLabel(player.source)}</TagChip>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-4">
                    <StatChip
                      label="Rank"
                      value={player.providerOverallRank ? `#${player.providerOverallRank}` : "-"}
                    />
                    <StatChip label="Age" value={player.age ? String(player.age) : "-"} />
                    <StatChip label="Exp" value={String(player.yearsExperience)} />
                    <StatChip label="Fit" value={insight.isLegalNow ? "Legal" : "Blocked"} />
                  </div>

                  <p className="text-sm text-stone-300">{formatStatSummary(player)}</p>
                  <p className="text-sm leading-7 text-stone-400">{insight.reason}</p>
                  <p className="draft-console-kicker text-[0.68rem] text-stone-500">
                    {player.key}{player.college ? ` | ${player.college}` : ""}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {isMyTurn && !isMyAutopickMode && draftStatus === "live" ? (
                      <form action={submitDraftPick}>
                        <input type="hidden" name="league_id" value={leagueId} />
                        <input type="hidden" name="league_slug" value={leagueSlug} />
                        <input type="hidden" name="player_id" value={player.id} />
                        <button
                          type="submit"
                          disabled={!insight.isLegalNow}
                          className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] transition-colors ${
                            insight.isLegalNow
                              ? "border border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                              : "cursor-not-allowed border border-white/10 bg-black/20 text-stone-500"
                          }`}
                        >
                          Draft player
                        </button>
                      </form>
                    ) : null}
                    {canQueue ? (
                      isQueued ? (
                        <form action={unqueueDraftPlayer}>
                          <input type="hidden" name="league_id" value={leagueId} />
                          <input type="hidden" name="league_slug" value={leagueSlug} />
                          <input type="hidden" name="player_id" value={player.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-sky-100 transition-colors hover:bg-sky-400/15"
                          >
                            Remove from queue
                          </button>
                        </form>
                      ) : (
                        <form action={queueDraftPlayer}>
                          <input type="hidden" name="league_id" value={leagueId} />
                          <input type="hidden" name="league_slug" value={leagueSlug} />
                          <input type="hidden" name="player_id" value={player.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"
                          >
                            Add to queue
                          </button>
                        </form>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-400">
            No players match the current filters. Try clearing search or switching the sort and position filters.
          </p>
        )}
      </section>
    </div>
  );
}

function evaluatePlayer(
  player: DraftablePlayer,
  rosterCounts: RosterCounts,
  rosterSlotsRemaining: number,
): PlayerInsight {
  const totalRostered = DRAFT_POSITIONS.reduce(
    (sum, draftPosition) => sum + rosterCounts[draftPosition],
    0,
  );
  const nextCounts = {
    ...rosterCounts,
    [player.position]: rosterCounts[player.position] + 1,
  };
  const slotsAfterPick = Math.max(0, MVP_DRAFT_ROSTER_SIZE - (totalRostered + 1));
  const missingAfterPick = DRAFT_POSITIONS.reduce(
    (sum, draftPosition) =>
      sum + Math.max(0, MVP_REQUIRED_POSITION_COUNTS[draftPosition] - nextCounts[draftPosition]),
    0,
  );
  const maxCount = MVP_MAX_POSITION_COUNTS[player.position];
  const isOverMax = typeof maxCount === "number" && nextCounts[player.position] > maxCount;
  const strandsRequiredSlots = missingAfterPick > slotsAfterPick;
  const isLegalNow = !isOverMax && !strandsRequiredSlots && totalRostered < MVP_DRAFT_ROSTER_SIZE;
  const neededNow = rosterCounts[player.position] < MVP_REQUIRED_POSITION_COUNTS[player.position];
  const wouldFinishRequirement =
    neededNow && nextCounts[player.position] >= MVP_REQUIRED_POSITION_COUNTS[player.position];

  let score = getPlayerBoardScore(player);
  if (neededNow) score += 120;
  if (wouldFinishRequirement) score += 40;
  if (player.position === "QB" && rosterCounts.QB === 1) score += 10;
  if (!isLegalNow) score -= 10000;

  if (!isLegalNow) {
    if (isOverMax) {
      return {
        score,
        isLegalNow,
        recommendationLabel: "Blocked now",
        reason: `${player.position} is already at the current roster limit. Draft a different position first.`,
      };
    }

    return {
      score,
      isLegalNow,
      recommendationLabel: "Blocked now",
      reason: `Taking another ${player.position} here would leave too few picks to satisfy the remaining required positions.`,
    };
  }

  if (neededNow) {
    return {
      score,
      isLegalNow,
      recommendationLabel: "Need pick",
      reason: `${player.position} is still a required roster need, so this pick helps lock in your legal build while keeping strong production on the board.`,
    };
  }

  if (player.providerOverallRank !== null && player.providerOverallRank <= 24) {
    return {
      score,
      isLegalNow,
      recommendationLabel: "Power pick",
      reason: `Your required slots are covered enough to chase raw value here, and ${player.fullName} is one of the strongest remaining players on the imported board.`,
    };
  }

  return {
    score,
    isLegalNow,
    recommendationLabel: "Depth fit",
    reason: `${player.fullName} fits the current roster rules cleanly and gives you optionality for the remaining ${rosterSlotsRemaining - 1} picks after this one.`,
  };
}

function formatStatSummary(player: DraftablePlayer) {
  if (player.gamesPlayed === 0 && player.providerOverallRank !== null) {
    return `Overall rank #${player.providerOverallRank}, position rank #${player.providerPositionRank ?? "-"}, imported from FantasyCalc market data.`;
  }

  if (player.position === "QB") {
    return `${player.passingYards.toLocaleString()} pass yds, ${player.passingTds} pass TD, ${player.rushingYards.toLocaleString()} rush yds`;
  }

  if (player.position === "RB") {
    return `${player.rushingYards.toLocaleString()} rush yds, ${player.rushingTds} rush TD, ${player.receptions} rec`;
  }

  return `${player.receptions} rec, ${player.receivingYards.toLocaleString()} rec yds, ${player.receivingTds} rec TD`;
}

function getPlayerBoardScore(player: DraftablePlayer) {
  if (player.providerValue !== null && player.providerValue > 0) {
    return player.providerValue;
  }

  return player.fantasyPointsPpr;
}

function formatDraftValue(player: DraftablePlayer) {
  if (player.providerValue !== null && player.providerValue > 0) {
    return player.providerValue.toLocaleString();
  }

  return player.fantasyPointsPpr.toFixed(1);
}

function formatSourceLabel(source: string) {
  if (source === "fantasycalc") {
    return "FantasyCalc";
  }

  if (source === "seed") {
    return "Seed";
  }

  return source;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="draft-console-chip rounded-full px-3 py-2 text-xs uppercase tracking-[0.24em] text-stone-300">
      {label}: {value}
    </div>
  );
}

function TagChip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "emerald" | "sky" | "stone";
}) {
  const className =
    tone === "emerald"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
      : tone === "sky"
        ? "border-sky-300/25 bg-sky-400/10 text-sky-100"
        : "border-white/10 bg-black/20 text-stone-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em] ${className}`}>
      {children}
    </span>
  );
}

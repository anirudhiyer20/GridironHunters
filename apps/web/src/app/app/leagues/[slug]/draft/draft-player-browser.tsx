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
import {
  evaluateDraftPlayer,
  formatByeWeek,
  formatDraftValue,
  formatSyncAge,
  getLatestProviderSync,
  getMarketSortValue,
  getPlayerBoardScore,
  getPlayerRankLabel,
  getValueLabel,
} from "./draft-room-rules";

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
  providerLastSyncedAt: string | null;
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
  view?: "available" | "queue";
  availablePlayers: DraftablePlayer[];
  queuedPlayers: QueuedPlayer[];
  rosterCounts: RosterCounts;
};

const POSITION_OPTIONS = ["ALL", ...DRAFT_POSITIONS] as const;
type SortOption = "recommended" | "market" | "best" | "positionRank" | "alphabetical" | "bye" | "age";
type SourceOption = "ALL" | string;

export function DraftPlayerBrowser({
  leagueId,
  leagueSlug,
  draftStatus,
  isMyTurn,
  isMyAutopickMode,
  canQueue,
  view = "available",
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
  const sourceOptions = Array.from(new Set(availablePlayers.map((player) => player.source))).sort();
  const latestProviderSync = getLatestProviderSync(availablePlayers);
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
          evaluateDraftPlayer(player, rosterCounts, rosterSlotsRemaining, {
            positions: DRAFT_POSITIONS,
            rosterSize: MVP_DRAFT_ROSTER_SIZE,
            requiredCounts: MVP_REQUIRED_POSITION_COUNTS,
            maxCounts: MVP_MAX_POSITION_COUNTS,
          }),
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

      if (sort === "market") {
        return getMarketSortValue(b) - getMarketSortValue(a) || a.fullName.localeCompare(b.fullName);
      }

      if (sort === "positionRank") {
        return (
          (a.providerPositionRank ?? 9999) - (b.providerPositionRank ?? 9999) ||
          getPlayerBoardScore(b) - getPlayerBoardScore(a) ||
          a.fullName.localeCompare(b.fullName)
        );
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
      {view === "queue" && canQueue ? (
        <section className="draft-console-outline rounded-[1.65rem] border border-[#6e95ff]/18 bg-[#091228]/82 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#6e95ff]/14 pb-4">
            <div>
              <p className="draft-console-kicker text-[0.68rem] text-[#8eb0ff]">Priority queue</p>
              <h3 className="draft-console-title mt-2 text-xl text-white">Your queue</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="draft-console-chip rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-300">
                {queuedPlayers.length} queued
              </span>
              {queuedPlayers.length > 0 ? (
                <form action={clearDraftQueue}>
                  <input type="hidden" name="league_id" value={leagueId} />
                  <input type="hidden" name="league_slug" value={leagueSlug} />
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"
                  >
                    Clear
                  </button>
                </form>
              ) : null}
            </div>
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
                        {player.position} | {player.nflTeam} | Bye {formatByeWeek(player.byeWeek)}
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
                    <StatChip label={getValueLabel(player)} value={formatDraftValue(player)} />
                    <StatChip label="Rank" value={getPlayerRankLabel(player)} />
                    <StatChip label="Synced" value={formatSyncAge(player.providerLastSyncedAt)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-400">
              Your queue is empty. Add players from the Available Players tab so you have a plan ready before your next turn.
            </p>
          )}
        </section>
      ) : null}

      {view === "queue" && !canQueue ? (
        <p className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-400">
          Queue controls are available for human draft participants.
        </p>
      ) : null}

      {view === "available" ? (
      <section className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="draft-console-title text-2xl text-white">Available Player Pool</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="draft-console-chip rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-300">
              {filteredPlayers.length} available
            </div>
            <div className="draft-console-chip rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-300">
              Synced {formatSyncAge(latestProviderSync)}
            </div>
          </div>
        </div>

        <div className="draft-console-outline rounded-[1.65rem] border border-[#f2bf5e]/18 bg-[#120f22]/78 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f2bf5e]/14 pb-4">
            <div>
              <p className="draft-console-kicker text-[0.68rem] text-[#f2bf5e]">Guidance layer</p>
              <h4 className="draft-console-title mt-2 text-xl text-white">Recommended</h4>
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
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-stone-100">{player.fullName}</p>
                        <p className="mt-1 text-sm text-stone-400">{player.position} | {player.nflTeam}</p>
                      </div>
                      <p className="text-right text-sm font-semibold text-[#f2bf5e]">{formatDraftValue(player)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <TagChip tone={insight.isLegalNow ? "emerald" : "stone"}>{insight.recommendationLabel}</TagChip>
                      <TagChip tone="stone">{getPlayerRankLabel(player)}</TagChip>
                    </div>
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
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {formatSourceLabel(option)}
                </option>
              ))}
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
              <option value="market">Market value</option>
              <option value="best">Best available</option>
              <option value="positionRank">Position rank</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="bye">Bye week</option>
              <option value="age">Youngest first</option>
            </select>
          </label>
        </div>

        {filteredPlayers.length > 0 ? (
          <div className="overflow-hidden rounded-[1.45rem] border border-[#6e95ff]/16 bg-[#0a1127]/84">
            <div className="hidden grid-cols-[minmax(13rem,1.5fr)_4.2rem_4.2rem_5rem_5rem_8rem] gap-3 border-b border-[#6e95ff]/14 px-4 py-3 text-[0.68rem] uppercase tracking-[0.22em] text-stone-500 lg:grid">
              <span>Player</span>
              <span>Pos</span>
              <span>Team</span>
              <span>Value</span>
              <span>Rank</span>
              <span className="text-right">Action</span>
            </div>
            {filteredPlayers.map((player) => {
              const isQueued = queuedPlayerIds.has(player.id);
              const insight = playerInsights.get(player.id)!;

              return (
                <div
                  key={player.id}
                  className={`grid gap-3 border-b border-[#6e95ff]/10 px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(13rem,1.5fr)_4.2rem_4.2rem_5rem_5rem_8rem] lg:items-center ${
                    isQueued
                      ? "bg-sky-400/10"
                      : insight.isLegalNow
                        ? "bg-transparent"
                        : "bg-black/20 opacity-70"
                  }`}
                >
                  <div>
                    <p className="text-base font-semibold text-stone-100">{player.fullName}</p>
                    <div className="mt-2 flex flex-wrap gap-2 lg:mt-1">
                      {isQueued ? <TagChip tone="sky">Queued</TagChip> : null}
                      <TagChip tone="stone">{formatSourceLabel(player.source)}</TagChip>
                      {insight.isLegalNow ? (
                        <TagChip tone="emerald">{insight.recommendationLabel}</TagChip>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm lg:contents">
                    <MobileColumn label="Pos" value={player.position} />
                    <MobileColumn label="Team" value={player.nflTeam} />
                    <MobileColumn label="Bye" value={String(formatByeWeek(player.byeWeek))} />
                  </div>

                  <p className="hidden text-sm font-semibold text-stone-100 lg:block">{player.position}</p>
                  <p className="hidden text-sm text-stone-300 lg:block">{player.nflTeam}</p>
                  <div>
                    <p className="lg:hidden draft-console-kicker text-[0.62rem] text-stone-500">{getValueLabel(player)}</p>
                    <p className="text-base font-semibold text-stone-100">{formatDraftValue(player)}</p>
                  </div>
                  <div>
                    <p className="lg:hidden draft-console-kicker text-[0.62rem] text-stone-500">Rank</p>
                    <p className="text-sm text-stone-300">{getPlayerRankLabel(player)}</p>
                  </div>

                  <div className="grid gap-2">
                    {isMyTurn && !isMyAutopickMode && draftStatus === "live" ? (
                      <form action={submitDraftPick}>
                        <input type="hidden" name="league_id" value={leagueId} />
                        <input type="hidden" name="league_slug" value={leagueSlug} />
                        <input type="hidden" name="player_id" value={player.id} />
                        <button
                          type="submit"
                          disabled={!insight.isLegalNow}
                          className={`w-full rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
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
                            className="w-full rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-sky-100 transition-colors hover:bg-sky-400/15"
                          >
                            Remove
                          </button>
                        </form>
                      ) : (
                        <form action={queueDraftPlayer}>
                          <input type="hidden" name="league_id" value={leagueId} />
                          <input type="hidden" name="league_slug" value={leagueSlug} />
                          <input type="hidden" name="player_id" value={player.id} />
                          <button
                            type="submit"
                            disabled={!insight.isLegalNow}
                            className={`w-full rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
                              insight.isLegalNow
                                ? "border-white/10 bg-black/20 text-stone-200 hover:bg-white/10"
                                : "cursor-not-allowed border-white/5 bg-black/10 text-stone-600"
                            }`}
                          >
                            Queue
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
      ) : null}
    </div>
  );
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

function MobileColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-white/10 bg-black/20 px-3 py-2 lg:hidden">
      <p className="draft-console-kicker text-[0.6rem] text-stone-500">{label}</p>
      <p className="mt-1 font-semibold text-stone-100">{value}</p>
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

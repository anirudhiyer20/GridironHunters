"use client";

import { useDeferredValue, useState } from "react";

import {
  clearDraftQueue,
  queueDraftPlayer,
  submitDraftPick,
  unqueueDraftPlayer,
} from "../actions";

type DraftablePlayer = {
  id: string;
  key: string;
  fullName: string;
  shortName: string | null;
  position: "QB" | "RB" | "WR" | "TE";
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

type DraftPlayerBrowserProps = {
  leagueId: string;
  leagueSlug: string;
  draftStatus: string | null;
  isMyTurn: boolean;
  isMyAutopickMode: boolean;
  canQueue: boolean;
  availablePlayers: DraftablePlayer[];
  queuedPlayers: QueuedPlayer[];
};

const POSITION_OPTIONS = ["ALL", "QB", "RB", "WR", "TE"] as const;
type SortOption = "best" | "alphabetical" | "bye" | "age";


export function DraftPlayerBrowser({
  leagueId,
  leagueSlug,
  draftStatus,
  isMyTurn,
  isMyAutopickMode,
  canQueue,
  availablePlayers,
  queuedPlayers,
}: DraftPlayerBrowserProps) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<(typeof POSITION_OPTIONS)[number]>("ALL");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState<SortOption>("best");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const queuedPlayerIds = new Set(queuedPlayers.map((player) => player.id));
  const nflTeams = Array.from(new Set(availablePlayers.map((player) => player.nflTeam))).sort();

  const filteredPlayers = [...availablePlayers]
    .filter((player) => {
      if (position !== "ALL" && player.position !== position) {
        return false;
      }

      if (team !== "ALL" && player.nflTeam !== team) {
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
      if (sort === "alphabetical") {
        return a.fullName.localeCompare(b.fullName);
      }

      if (sort === "bye") {
        return (a.byeWeek ?? 99) - (b.byeWeek ?? 99) || b.fantasyPointsPpr - a.fantasyPointsPpr;
      }

      if (sort === "age") {
        return (a.age ?? 99) - (b.age ?? 99) || b.fantasyPointsPpr - a.fantasyPointsPpr;
      }

      return b.fantasyPointsPpr - a.fantasyPointsPpr || a.fullName.localeCompare(b.fullName);
    });

  return (
    <div className="grid gap-6">
      {canQueue ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-stone-100">Your queue</h3>
              <p className="mt-1 text-sm text-stone-400">
                Queue players while others are on the clock. If you time out or stay on autopick, the system will try your queued players first.
              </p>
            </div>
            {queuedPlayers.length > 0 ? (
              <form action={clearDraftQueue}>
                <input type="hidden" name="league_id" value={leagueId} />
                <input type="hidden" name="league_slug" value={leagueSlug} />
                <button
                  type="submit"
                  className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"
                >
                  Clear queue
                </button>
              </form>
            ) : null}
          </div>

          {queuedPlayers.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {queuedPlayers.map((player) => (
                <div key={player.id} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                        Queue #{player.queueRank}
                      </p>
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
                    <StatChip label="2025 PPR" value={player.fantasyPointsPpr.toFixed(1)} />
                    <StatChip label="Age" value={player.age ? String(player.age) : "-"} />
                    <StatChip label="Exp" value={String(player.yearsExperience)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-stone-400">
              Your queue is empty. Add players below so you have a plan ready before your next turn.
            </p>
          )}
        </section>
      ) : null}

      <section className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-stone-100">Available player pool</h3>
            <p className="mt-1 text-sm text-stone-400">
              The pool stays visible throughout the live draft now, so you can scout, sort, and queue players while other teams are picking.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-300">
            {filteredPlayers.length} available
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <label className="grid gap-2 text-sm text-stone-300">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by player, school, team, or key"
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#f2bf5e]/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-300">
            Position
            <select
              value={position}
              onChange={(event) => setPosition(event.target.value as (typeof POSITION_OPTIONS)[number])}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#f2bf5e]/40"
            >
              {POSITION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-stone-300">
            NFL Team
            <select
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#f2bf5e]/40"
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
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#f2bf5e]/40"
            >
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

              return (
                <div
                  key={player.id}
                  className={`grid gap-4 rounded-[1.35rem] border px-4 py-4 ${
                    isQueued
                      ? "border-sky-300/25 bg-sky-400/10"
                      : "border-white/10 bg-white/6"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-stone-100">{player.fullName}</p>
                      <p className="mt-1 text-sm text-stone-400">
                        {player.position} | {player.nflTeam} | Bye {player.byeWeek ?? "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                        2025 PPR
                      </p>
                      <p className="mt-1 text-lg font-semibold text-stone-100">{player.fantasyPointsPpr.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-4">
                    <StatChip label="Games" value={String(player.gamesPlayed)} />
                    <StatChip label="Age" value={player.age ? String(player.age) : "-"} />
                    <StatChip label="Exp" value={String(player.yearsExperience)} />
                    <StatChip label="Queue" value={isQueued ? "Queued" : "Open"} />
                  </div>

                  <p className="text-sm text-stone-300">{formatStatSummary(player)}</p>
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
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
                          className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-100 transition-colors hover:bg-emerald-400/15"
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
          <p className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-stone-400">
            No players match the current filters. Try clearing search or switching the sort and position filters.
          </p>
        )}
      </section>
    </div>
  );
}

function formatStatSummary(player: DraftablePlayer) {
  if (player.position === "QB") {
    return `${player.passingYards.toLocaleString()} pass yds, ${player.passingTds} pass TD, ${player.rushingYards.toLocaleString()} rush yds`;
  }

  if (player.position === "RB") {
    return `${player.rushingYards.toLocaleString()} rush yds, ${player.rushingTds} rush TD, ${player.receptions} rec`;
  }

  return `${player.receptions} rec, ${player.receivingYards.toLocaleString()} rec yds, ${player.receivingTds} rec TD`;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs uppercase tracking-[0.24em] text-stone-300">
      {label}: {value}
    </div>
  );
}

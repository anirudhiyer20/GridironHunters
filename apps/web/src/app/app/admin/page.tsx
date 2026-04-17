import { grantWeeklyBattleKeys, importFantasyCalcPlayers, resolveSubmittedHunts } from "./actions";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

type PlayerPoolRow = {
  source: string;
  position: string;
  is_active: boolean;
  provider_last_synced_at: string | null;
  full_name: string | null;
  source_player_id: string | null;
  nfl_team: string | null;
};

type LeagueOption = {
  id: string;
  name: string;
  season: number;
  status: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = resolvedSearchParams?.message;
  const supabase = await createClient();
  const { data: leagueRows } = await supabase
    .from("leagues")
    .select("id, name, season, status")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: playerPoolRows } = await supabase
    .from("players")
    .select("source, position, is_active, provider_last_synced_at, full_name, source_player_id, nfl_team");
  const playerPoolSummary = summarizePlayerPool((playerPoolRows ?? []) as PlayerPoolRow[]);
  const leagueOptions = (leagueRows ?? []) as LeagueOption[];
  const readinessChecks = buildDraftReadinessChecks((playerPoolRows ?? []) as PlayerPoolRow[]);
  const failingReadinessChecks = readinessChecks.filter((check) => check.status !== "ready");

  return (
    <PageShell
      eyebrow="Admin / Steward Tools"
      title="Steward Console"
    >
      <Panel
        title="Player Import"
        description="Run a manual sync from FantasyCalc and write normalized player records into Supabase."
      >
        {message ? (
          <p className="rounded-[1.15rem] border border-[#c6ad7d]/30 bg-[#201913] px-4 py-3 text-sm leading-6 text-[#efe2c9]">
            {message}
          </p>
        ) : null}
        <form action={importFantasyCalcPlayers} className="grid gap-4">
          <p className="max-w-2xl text-sm leading-7 text-[#efe2c9]">
            This fetches the current dynasty values endpoint once, upserts QB/RB/WR/TE players, deactivates the old seed pool, and keeps the app reading from Supabase afterward.
          </p>
          <p className="max-w-2xl rounded-[1.15rem] border border-[#c6ad7d]/20 bg-[#201913] px-4 py-3 text-sm leading-6 text-[#efe2c9]">
            Seed players are kept in the database for historical safety, but they are marked inactive after a successful real-player import.
          </p>
          <button
            type="submit"
            className="w-fit rounded-full border border-[#c6ad7d]/35 bg-[#2e2419] px-5 py-3 text-sm uppercase tracking-[0.2em] text-[#fff4d8] transition-colors hover:bg-[#3a2e21]"
          >
            Import FantasyCalc Players
          </button>
        </form>
      </Panel>

      <Panel
        title="Player Pool Status"
        description="A quick read on the active draft pool after imports."
      >
        {playerPoolSummary.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {playerPoolSummary.map((summary) => (
              <div
                key={summary.source}
                className="rounded-[1.2rem] border border-[#c6ad7d]/20 bg-[#201913] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="fantasy-kicker text-[0.68rem] text-[#d6bf90]">
                      {formatSourceLabel(summary.source)}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#fff4d8]">
                      {summary.activeCount} active
                    </p>
                  </div>
                  <p className="rounded-full border border-[#c6ad7d]/20 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#efe2c9]">
                    {summary.totalCount} total
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#efe2c9]">
                  {summary.positionCounts}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#bca478]">
                  Last Sync: {summary.lastSyncedAt ? formatDateTime(summary.lastSyncedAt) : "Not synced"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[1.15rem] border border-[#c6ad7d]/20 bg-[#201913] px-4 py-3 text-sm leading-6 text-[#efe2c9]">
            No players are currently available in Supabase.
          </p>
        )}
      </Panel>

      <Panel
        title="Battle Key Grants"
        description="Issue weekly Battle Keys to every human House in a Guild and send mailbox notices."
      >
        <form action={grantWeeklyBattleKeys} className="grid gap-4 rounded-[1.2rem] border border-[#c6ad7d]/20 bg-[#201913] p-4">
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[#d6bf90]">
            Guild
            <select
              name="league_id"
              required
              className="rounded-[0.8rem] border border-[#c6ad7d]/30 bg-[#130f0b] px-3 py-2 text-sm normal-case tracking-normal text-[#fff4d8]"
            >
              <option value="">Select a Guild</option>
              {leagueOptions.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name} ({league.season}) - {league.status}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[#d6bf90]">
              Week
              <input
                type="number"
                name="week_number"
                min={1}
                max={18}
                defaultValue={1}
                required
                className="rounded-[0.8rem] border border-[#c6ad7d]/30 bg-[#130f0b] px-3 py-2 text-sm tracking-normal text-[#fff4d8]"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[#d6bf90]">
              Keys Granted
              <input
                type="number"
                name="keys_granted"
                min={1}
                max={50}
                defaultValue={12}
                required
                className="rounded-[0.8rem] border border-[#c6ad7d]/30 bg-[#130f0b] px-3 py-2 text-sm tracking-normal text-[#fff4d8]"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-fit rounded-full border border-[#c6ad7d]/35 bg-[#2e2419] px-5 py-3 text-sm uppercase tracking-[0.2em] text-[#fff4d8] transition-colors hover:bg-[#3a2e21]"
          >
            Grant Weekly Battle Keys
          </button>
        </form>
      </Panel>

      <Panel
        title="Hunt Resolution"
        description="Resolve submitted Hunt slates for a Guild week using the MVP score engine and trigger Hunt report scrolls."
      >
        <form action={resolveSubmittedHunts} className="grid gap-4 rounded-[1.2rem] border border-[#c6ad7d]/20 bg-[#201913] p-4">
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[#d6bf90]">
            Guild
            <select
              name="league_id"
              required
              className="rounded-[0.8rem] border border-[#c6ad7d]/30 bg-[#130f0b] px-3 py-2 text-sm normal-case tracking-normal text-[#fff4d8]"
            >
              <option value="">Select a Guild</option>
              {leagueOptions.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name} ({league.season}) - {league.status}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[#d6bf90]">
              Week
              <input
                type="number"
                name="week_number"
                min={1}
                max={18}
                defaultValue={1}
                required
                className="rounded-[0.8rem] border border-[#c6ad7d]/30 bg-[#130f0b] px-3 py-2 text-sm tracking-normal text-[#fff4d8]"
              />
            </label>
            <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-[#d6bf90]">
              Resolve Limit
              <input
                type="number"
                name="resolve_limit"
                min={1}
                max={500}
                defaultValue={200}
                required
                className="rounded-[0.8rem] border border-[#c6ad7d]/30 bg-[#130f0b] px-3 py-2 text-sm tracking-normal text-[#fff4d8]"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-fit rounded-full border border-[#c6ad7d]/35 bg-[#2e2419] px-5 py-3 text-sm uppercase tracking-[0.2em] text-[#fff4d8] transition-colors hover:bg-[#3a2e21]"
          >
            Resolve Submitted Hunts
          </button>
        </form>
      </Panel>

      <Panel
        title="Draft Readiness"
        description="Pre-flight checks for whether the current player pool is safe to use in real draft testing."
      >
        <div className="mb-4 rounded-[1.15rem] border border-[#c6ad7d]/20 bg-[#201913] px-4 py-3 text-sm leading-6 text-[#efe2c9]">
          {failingReadinessChecks.length === 0
            ? "Player data looks draft-ready."
            : `${failingReadinessChecks.length} player-data issue(s) should be reviewed before a serious test draft.`}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {readinessChecks.map((check) => (
            <div
              key={check.label}
              className={`rounded-[1.2rem] border px-4 py-4 ${
                check.status === "ready"
                  ? "border-emerald-300/20 bg-emerald-400/8"
                  : check.status === "warning"
                    ? "border-amber-300/25 bg-amber-400/10"
                    : "border-rose-300/25 bg-rose-400/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="fantasy-kicker text-[0.68rem] text-[#d6bf90]">{check.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#fff4d8]">
                  {check.status}
                </span>
              </div>
              <p className="mt-3 text-base font-semibold text-[#fff4d8]">{check.value}</p>
              <p className="mt-2 text-sm leading-6 text-[#efe2c9]">{check.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Planned Admin Capabilities"
        description="These deepen through later sprints once the Guild, Draft, Hunt, and Arena loops are fully in place."
      >
        <ul className="grid gap-3 text-sm leading-6 text-[#efe2c9]">
          <li>Guild testing across multiple Guilds</li>
          <li>Draft pool and mythic override controls</li>
          <li>Score correction approvals and audit review</li>
          <li>Impersonation support for closed-beta operations</li>
        </ul>
      </Panel>
    </PageShell>
  );
}

type ReadinessCheck = {
  label: string;
  value: string;
  detail: string;
  status: "ready" | "warning" | "blocked";
};

function buildDraftReadinessChecks(rows: PlayerPoolRow[]): ReadinessCheck[] {
  const activeRows = rows.filter((row) => row.is_active);
  const fantasyCalcRows = activeRows.filter((row) => row.source === "fantasycalc");
  const activeSeedRows = activeRows.filter((row) => row.source === "seed");
  const activePositionCounts = countByPosition(activeRows);
  const fantasyCalcPositionCounts = countByPosition(fantasyCalcRows);
  const missingIdentityCount = activeRows.filter(
    (row) => !row.full_name || !row.position || !row.source_player_id,
  ).length;
  const missingTeamCount = activeRows.filter((row) => !row.nfl_team).length;
  const latestSync = fantasyCalcRows.reduce<string | null>((latest, row) => {
    if (!row.provider_last_synced_at) return latest;
    if (!latest) return row.provider_last_synced_at;
    return new Date(row.provider_last_synced_at).getTime() > new Date(latest).getTime()
      ? row.provider_last_synced_at
      : latest;
  }, null);
  const syncAgeHours = latestSync
    ? Math.floor((Date.now() - new Date(latestSync).getTime()) / (1000 * 60 * 60))
    : null;
  const minimumPerPosition = 20;
  const thinPositions = ["QB", "RB", "WR", "TE"].filter(
    (position) => (activePositionCounts.get(position) ?? 0) < minimumPerPosition,
  );
  const fantasyCalcMissingPositions = ["QB", "RB", "WR", "TE"].filter(
    (position) => (fantasyCalcPositionCounts.get(position) ?? 0) === 0,
  );

  return [
    {
      label: "Real Player Source",
      value: `${fantasyCalcRows.length} FantasyCalc active`,
      detail:
        fantasyCalcRows.length > 0
          ? "Real-player data is present in the active pool."
          : "No active FantasyCalc players found. Import real players before draft testing.",
      status: fantasyCalcRows.length > 0 ? "ready" : "blocked",
    },
    {
      label: "Seed Pool",
      value: `${activeSeedRows.length} seed active`,
      detail:
        activeSeedRows.length === 0
          ? "Seed players are inactive, which is the intended MVP direction."
          : "Seed players are still active. Re-run the FantasyCalc import or review seed cleanup.",
      status: activeSeedRows.length === 0 ? "ready" : "warning",
    },
    {
      label: "Position Depth",
      value: thinPositions.length === 0 ? "QB/RB/WR/TE covered" : `${thinPositions.join(", ")} thin`,
      detail:
        thinPositions.length === 0
          ? `Each draft position has at least ${minimumPerPosition} active players.`
          : `Each position should have at least ${minimumPerPosition} active players for comfortable draft testing.`,
      status: thinPositions.length === 0 ? "ready" : "warning",
    },
    {
      label: "FantasyCalc Coverage",
      value:
        fantasyCalcMissingPositions.length === 0
          ? "All positions imported"
          : `${fantasyCalcMissingPositions.join(", ")} missing`,
      detail:
        fantasyCalcMissingPositions.length === 0
          ? "FantasyCalc currently covers all MVP draft positions."
          : "One or more MVP positions has no active FantasyCalc players.",
      status: fantasyCalcMissingPositions.length === 0 ? "ready" : "blocked",
    },
    {
      label: "Data Freshness",
      value: syncAgeHours === null ? "No sync found" : formatSyncAge(syncAgeHours),
      detail:
        syncAgeHours === null
          ? "No FantasyCalc sync timestamp is available yet."
          : "Latest FantasyCalc player sync timestamp from active players.",
      status: syncAgeHours === null ? "blocked" : syncAgeHours <= 72 ? "ready" : "warning",
    },
    {
      label: "Required Fields",
      value: `${missingIdentityCount + missingTeamCount} issue(s)`,
      detail:
        missingIdentityCount + missingTeamCount === 0
          ? "Active players have the required identity and team fields."
          : `${missingIdentityCount} identity issue(s), ${missingTeamCount} team issue(s) found in active players.`,
      status: missingIdentityCount + missingTeamCount === 0 ? "ready" : "blocked",
    },
  ];
}

function countByPosition(rows: PlayerPoolRow[]) {
  return rows.reduce((counts, row) => {
    counts.set(row.position, (counts.get(row.position) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function formatSyncAge(hours: number) {
  if (hours < 1) return "<1h old";
  if (hours < 24) return `${hours}h old`;
  return `${Math.floor(hours / 24)}d old`;
}

function summarizePlayerPool(rows: PlayerPoolRow[]) {
  const summaries = new Map<
    string,
    {
      source: string;
      activeCount: number;
      totalCount: number;
      lastSyncedAt: string | null;
      positions: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const summary =
      summaries.get(row.source) ??
      {
        source: row.source,
        activeCount: 0,
        totalCount: 0,
        lastSyncedAt: null,
        positions: new Map<string, number>(),
      };

    summary.totalCount += 1;

    if (row.is_active) {
      summary.activeCount += 1;
      summary.positions.set(row.position, (summary.positions.get(row.position) ?? 0) + 1);
    }

    if (
      row.provider_last_synced_at &&
      (!summary.lastSyncedAt ||
        new Date(row.provider_last_synced_at).getTime() > new Date(summary.lastSyncedAt).getTime())
    ) {
      summary.lastSyncedAt = row.provider_last_synced_at;
    }

    summaries.set(row.source, summary);
  }

  return Array.from(summaries.values())
    .sort((a, b) => a.source.localeCompare(b.source))
    .map((summary) => ({
      ...summary,
      positionCounts: ["QB", "RB", "WR", "TE"]
        .map((position) => `${position} ${summary.positions.get(position) ?? 0}`)
        .join(" | "),
    }));
}

function formatSourceLabel(source: string) {
  if (source === "fantasycalc") return "FantasyCalc";
  if (source === "seed") return "Seed Pool";
  return source;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

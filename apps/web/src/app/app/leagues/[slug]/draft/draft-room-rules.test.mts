import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateDraftPlayer,
  formatByeWeek,
  formatDraftValue,
  formatSyncAge,
  getLatestProviderSync,
  getMarketSortValue,
  getPlayerRankLabel,
  getValueLabel,
  type DraftRoomPlayer,
  type DraftRoomRosterCounts,
  type DraftRoomRules,
} from "./draft-room-rules.ts";

const rules: DraftRoomRules = {
  positions: ["QB", "RB", "WR", "TE"],
  rosterSize: 8,
  requiredCounts: {
    QB: 1,
    RB: 1,
    WR: 1,
    TE: 1,
  },
  maxCounts: {
    QB: 2,
  },
};

const emptyRoster: DraftRoomRosterCounts = {
  QB: 0,
  RB: 0,
  WR: 0,
  TE: 0,
};

function player(overrides: Partial<DraftRoomPlayer> = {}): DraftRoomPlayer {
  return {
    fullName: "Test Player",
    position: "RB",
    providerValue: 5000,
    providerOverallRank: 50,
    providerPositionRank: 12,
    providerLastSyncedAt: "2026-04-14T12:00:00.000Z",
    fantasyPointsPpr: 200,
    ...overrides,
  };
}

test("marks a required empty roster position as a need pick", () => {
  const insight = evaluateDraftPlayer(player({ position: "RB" }), emptyRoster, 8, rules);

  assert.equal(insight.isLegalNow, true);
  assert.equal(insight.recommendationLabel, "Need pick");
  assert.ok(insight.score > player().providerValue!);
});

test("blocks a pick that would exceed the QB max", () => {
  const rosterCounts: DraftRoomRosterCounts = {
    QB: 2,
    RB: 1,
    WR: 1,
    TE: 1,
  };

  const insight = evaluateDraftPlayer(player({ position: "QB" }), rosterCounts, 3, rules);

  assert.equal(insight.isLegalNow, false);
  assert.equal(insight.recommendationLabel, "Blocked now");
  assert.match(insight.reason, /current roster limit/);
});

test("blocks a luxury pick that would strand required positions", () => {
  const rosterCounts: DraftRoomRosterCounts = {
    QB: 0,
    RB: 3,
    WR: 3,
    TE: 0,
  };

  const insight = evaluateDraftPlayer(player({ position: "WR" }), rosterCounts, 2, rules);

  assert.equal(insight.isLegalNow, false);
  assert.equal(insight.recommendationLabel, "Blocked now");
  assert.match(insight.reason, /too few picks/);
});

test("marks a high imported rank as a power pick once needs are covered", () => {
  const rosterCounts: DraftRoomRosterCounts = {
    QB: 1,
    RB: 1,
    WR: 1,
    TE: 1,
  };

  const insight = evaluateDraftPlayer(
    player({ fullName: "Elite WR", position: "WR", providerOverallRank: 12 }),
    rosterCounts,
    4,
    rules,
  );

  assert.equal(insight.isLegalNow, true);
  assert.equal(insight.recommendationLabel, "Power pick");
});

test("uses provider value first, then imported rank, then fantasy points for market sorting", () => {
  assert.equal(getMarketSortValue(player({ providerValue: 7000, providerOverallRank: 100 })), 7000);
  assert.equal(getMarketSortValue(player({ providerValue: null, providerOverallRank: 10 })), 99990);
  assert.equal(getMarketSortValue(player({ providerValue: null, providerOverallRank: null, fantasyPointsPpr: 123 })), 123);
});

test("formats draft metadata for cards and rows", () => {
  assert.equal(formatDraftValue(player({ providerValue: 12345 })), "12,345");
  assert.equal(formatDraftValue(player({ providerValue: null, fantasyPointsPpr: 88.234 })), "88.2");
  assert.equal(getValueLabel(player({ providerValue: null, providerOverallRank: null, providerPositionRank: null })), "Fantasy Pts");
  assert.equal(getPlayerRankLabel(player({ position: "TE", providerOverallRank: 20, providerPositionRank: 3 })), "#20 / TE #3");
  assert.equal(formatByeWeek(null), "TBD");
});

test("finds the latest provider sync timestamp", () => {
  assert.equal(
    getLatestProviderSync([
      player({ providerLastSyncedAt: "2026-04-14T10:00:00.000Z" }),
      player({ providerLastSyncedAt: "2026-04-14T13:00:00.000Z" }),
      player({ providerLastSyncedAt: null }),
    ]),
    "2026-04-14T13:00:00.000Z",
  );
});

test("formats provider sync age in useful buckets", () => {
  const now = new Date("2026-04-14T14:30:00.000Z");

  assert.equal(formatSyncAge(null, now), "-");
  assert.equal(formatSyncAge("2026-04-14T14:00:00.000Z", now), "<1h");
  assert.equal(formatSyncAge("2026-04-14T11:00:00.000Z", now), "3h");
  assert.equal(formatSyncAge("2026-04-12T14:00:00.000Z", now), "2d");
});

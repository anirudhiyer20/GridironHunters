export type DraftRoomPosition = "QB" | "RB" | "WR" | "TE";

export type DraftRoomPlayer = {
  fullName: string;
  position: DraftRoomPosition;
  providerValue: number | null;
  providerOverallRank: number | null;
  providerPositionRank: number | null;
  providerLastSyncedAt: string | null;
  fantasyPointsPpr: number;
};

export type DraftRoomRosterCounts = Record<DraftRoomPosition, number>;

export type DraftRoomRules = {
  positions: readonly DraftRoomPosition[];
  rosterSize: number;
  requiredCounts: DraftRoomRosterCounts;
  maxCounts: Partial<Record<DraftRoomPosition, number>>;
};

export type PlayerInsight = {
  score: number;
  isLegalNow: boolean;
  recommendationLabel: string;
  reason: string;
};

export function evaluateDraftPlayer(
  player: DraftRoomPlayer,
  rosterCounts: DraftRoomRosterCounts,
  rosterSlotsRemaining: number,
  rules: DraftRoomRules,
): PlayerInsight {
  const totalRostered = rules.positions.reduce(
    (sum, draftPosition) => sum + rosterCounts[draftPosition],
    0,
  );
  const nextCounts = {
    ...rosterCounts,
    [player.position]: rosterCounts[player.position] + 1,
  };
  const slotsAfterPick = Math.max(0, rules.rosterSize - (totalRostered + 1));
  const missingAfterPick = rules.positions.reduce(
    (sum, draftPosition) =>
      sum + Math.max(0, rules.requiredCounts[draftPosition] - nextCounts[draftPosition]),
    0,
  );
  const maxCount = rules.maxCounts[player.position];
  const isOverMax = typeof maxCount === "number" && nextCounts[player.position] > maxCount;
  const strandsRequiredSlots = missingAfterPick > slotsAfterPick;
  const isLegalNow = !isOverMax && !strandsRequiredSlots && totalRostered < rules.rosterSize;
  const neededNow = rosterCounts[player.position] < rules.requiredCounts[player.position];
  const wouldFinishRequirement =
    neededNow && nextCounts[player.position] >= rules.requiredCounts[player.position];

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
      reason: `Your required slots are covered enough to chase raw value here, and ${player.fullName} is one of the strongest remaining players by imported market rank.`,
    };
  }

  return {
    score,
    isLegalNow,
    recommendationLabel: "Depth fit",
    reason: `${player.fullName} fits the current roster rules cleanly and gives you optionality for the remaining ${rosterSlotsRemaining - 1} picks after this one.`,
  };
}

export function hasProviderData(player: DraftRoomPlayer) {
  return player.providerValue !== null || player.providerOverallRank !== null || player.providerPositionRank !== null;
}

export function getPlayerBoardScore(player: DraftRoomPlayer) {
  if (player.providerValue !== null && player.providerValue > 0) {
    return player.providerValue;
  }

  return player.fantasyPointsPpr;
}

export function getMarketSortValue(player: DraftRoomPlayer) {
  if (player.providerValue !== null && player.providerValue > 0) {
    return player.providerValue;
  }

  if (player.providerOverallRank !== null && player.providerOverallRank > 0) {
    return 100000 - player.providerOverallRank;
  }

  return player.fantasyPointsPpr;
}

export function formatDraftValue(player: DraftRoomPlayer) {
  if (player.providerValue !== null && player.providerValue > 0) {
    return player.providerValue.toLocaleString();
  }

  return player.fantasyPointsPpr.toFixed(1);
}

export function getValueLabel(player: DraftRoomPlayer) {
  return hasProviderData(player) ? "Market Value" : "Fantasy Pts";
}

export function getPlayerRankLabel(player: DraftRoomPlayer) {
  const overall = player.providerOverallRank ? `#${player.providerOverallRank}` : null;
  const position = player.providerPositionRank ? `${player.position} #${player.providerPositionRank}` : null;

  if (overall && position) {
    return `${overall} / ${position}`;
  }

  return overall ?? position ?? "-";
}

export function formatByeWeek(byeWeek: number | null) {
  return byeWeek ?? "TBD";
}

export function getLatestProviderSync(players: DraftRoomPlayer[]) {
  return players.reduce<string | null>((latest, player) => {
    if (!player.providerLastSyncedAt) {
      return latest;
    }

    if (!latest) {
      return player.providerLastSyncedAt;
    }

    return new Date(player.providerLastSyncedAt).getTime() > new Date(latest).getTime()
      ? player.providerLastSyncedAt
      : latest;
  }, null);
}

export function formatSyncAge(value: string | null, now = new Date()) {
  if (!value) {
    return "-";
  }

  const syncedAt = new Date(value);
  if (Number.isNaN(syncedAt.getTime())) {
    return "-";
  }

  const diffMs = now.getTime() - syncedAt.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 1) {
    return "<1h";
  }

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.floor(diffHours / 24)}d`;
}

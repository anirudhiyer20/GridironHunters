export type HuntScoreInput = {
  targetScore: number | null;
  challengerScores: Array<number | null>;
};

export type HuntOutcome = {
  status: "submitted" | "resolved";
  result: "captured" | "escaped" | null;
  bestChallengerScore: number | null;
};

export function countBattleKeys(challengerCount: number) {
  return Math.min(Math.max(challengerCount, 0), 2);
}

export function calculateHuntOutcome({ targetScore, challengerScores }: HuntScoreInput): HuntOutcome {
  const validChallengerScores = challengerScores.filter((score): score is number => typeof score === "number");

  if (typeof targetScore !== "number" || validChallengerScores.length === 0) {
    return {
      status: "submitted",
      result: null,
      bestChallengerScore: validChallengerScores.length ? Math.max(...validChallengerScores) : null,
    };
  }

  const bestChallengerScore = Math.max(...validChallengerScores);

  return {
    status: "resolved",
    result: bestChallengerScore > targetScore ? "captured" : "escaped",
    bestChallengerScore,
  };
}

import assert from "node:assert/strict";
import test from "node:test";

import { calculateHuntOutcome, countBattleKeys } from "./hunt-rules.ts";

test("counts one Battle Key per assigned challenger up to the MVP limit", () => {
  assert.equal(countBattleKeys(0), 0);
  assert.equal(countBattleKeys(1), 1);
  assert.equal(countBattleKeys(2), 2);
  assert.equal(countBattleKeys(3), 2);
});

test("keeps Hunts submitted until target and challenger scores exist", () => {
  assert.deepEqual(calculateHuntOutcome({ targetScore: null, challengerScores: [12.5, null] }), {
    status: "submitted",
    result: null,
    bestChallengerScore: 12.5,
  });
});

test("captures when the best challenger score beats the target", () => {
  assert.deepEqual(calculateHuntOutcome({ targetScore: 14.2, challengerScores: [11.1, 15] }), {
    status: "resolved",
    result: "captured",
    bestChallengerScore: 15,
  });
});

test("escapes when the best challenger score ties or trails the target", () => {
  assert.deepEqual(calculateHuntOutcome({ targetScore: 15, challengerScores: [14.9, 15] }), {
    status: "resolved",
    result: "escaped",
    bestChallengerScore: 15,
  });
});

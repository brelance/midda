/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm by Piotr Woźniak.
 * Grade scale: 0-5
 *   0 – Complete blackout
 *   1 – Incorrect; correct answer seems familiar on reveal
 *   2 – Incorrect; correct answer easy to recall on reveal
 *   3 – Correct with serious difficulty
 *   4 – Correct with some hesitation
 *   5 – Perfect response
 */

export interface SM2Input {
  grade: number;         // 0-5
  easeFactor: number;    // current EF (≥ 1.3)
  intervalDays: number;  // current interval in days
  reviewCount: number;   // number of consecutive correct reviews
}

export interface SM2Result {
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  nextReviewAt: Date;
}

/**
 * Compute next review schedule using SM-2 algorithm.
 *
 * @param input Current card state + user grade
 * @returns New card state with next review date
 */
export function sm2(input: SM2Input): SM2Result {
  const { grade, easeFactor: currentEF, intervalDays, reviewCount } = input;

  // Clamp grade to [0, 5]
  const g = Math.max(0, Math.min(5, Math.round(grade)));

  // Calculate new ease factor
  // EF' = EF + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02))
  let newEF =
    currentEF + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02));
  // EF must never drop below 1.3
  newEF = Math.max(1.3, newEF);

  let newInterval: number;
  let newReviewCount: number;

  if (g < 3) {
    // Failed: reset interval to 1 day, restart review count
    newInterval = 1;
    newReviewCount = 0;
  } else {
    // Passed: increase interval
    newReviewCount = reviewCount + 1;

    if (newReviewCount === 1) {
      newInterval = 1;
    } else if (newReviewCount === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * newEF);
    }
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    intervalDays: newInterval,
    reviewCount: newReviewCount,
    nextReviewAt,
  };
}

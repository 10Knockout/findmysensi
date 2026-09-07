import type { PracticeSummaryRecord } from "./results.js";

/**
 * Profile achievements: real, deterministic progression markers computed
 * from a player's actual practice history. No random unlocks, no
 * time-gated "daily" mechanics, no fabricated milestones -- every
 * definition below checks a condition against real recorded runs.
 */
/**
 * Uncapped running totals, tracked independently of the (capped, most-recent
 * N) practice history array. Volume achievements ("200 sessions", "25,000
 * shots") must read from these, not from history.length/history-derived
 * sums -- otherwise they'd be structurally unreachable once history rolls
 * old records out.
 */
export interface LifetimeStats {
  readonly totalSessions: number;
  readonly totalShots: number;
  readonly totalPracticeSeconds: number;
}

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: "volume" | "accuracy" | "coverage" | "tracking" | "rank";
  readonly isUnlocked: (
    history: readonly PracticeSummaryRecord[],
    lifetime: LifetimeStats,
  ) => boolean;
}

const CLICK_MODE_IDS = new Set<PracticeSummaryRecord["modeId"]>([
  "grid",
  "pinpoint",
  "multi",
  "headline",
  "strafe",
  "microshot",
  "reaction",
]);

export const ALL_MODE_IDS: readonly PracticeSummaryRecord["modeId"][] = [
  "grid",
  "pinpoint",
  "multi",
  "headline",
  "strafe",
  "microshot",
  "reaction",
  "smooth-track",
  "switch-track",
];

interface ClickRecord {
  readonly modeId: PracticeSummaryRecord["modeId"];
  readonly shots: number;
  readonly accuracyPercentage: number;
}

function clickRecords(
  history: readonly PracticeSummaryRecord[],
): readonly ClickRecord[] {
  return history.filter((r): r is PracticeSummaryRecord & ClickRecord =>
    CLICK_MODE_IDS.has(r.modeId),
  );
}

function bestAccuracy(
  history: readonly PracticeSummaryRecord[],
  modeId?: PracticeSummaryRecord["modeId"],
): number {
  const candidates = clickRecords(history).filter(
    (r) => modeId === undefined || r.modeId === modeId,
  );
  return candidates.reduce((max, r) => Math.max(max, r.accuracyPercentage), 0);
}

function distinctModesPlayed(
  history: readonly PracticeSummaryRecord[],
): ReadonlySet<PracticeSummaryRecord["modeId"]> {
  return new Set(history.map((r) => r.modeId));
}

function sessionsInMode(
  history: readonly PracticeSummaryRecord[],
  modeId: PracticeSummaryRecord["modeId"],
): number {
  return history.filter((r) => r.modeId === modeId).length;
}

function bestOnTargetPercentage(
  history: readonly PracticeSummaryRecord[],
  modeId: "smooth-track" | "switch-track",
): number {
  return history
    .filter(
      (r): r is Extract<PracticeSummaryRecord, { modeId: typeof modeId }> =>
        r.modeId === modeId,
    )
    .reduce((max, r) => Math.max(max, r.onTargetPercentage), 0);
}

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  // Volume -- all read LifetimeStats, never the capped history window.
  {
    id: "first-session",
    name: "First Steps",
    description: "Complete your first practice session.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalSessions >= 1,
  },
  {
    id: "sessions-10",
    name: "Warming Up",
    description: "Complete 10 practice sessions.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalSessions >= 10,
  },
  {
    id: "sessions-50",
    name: "Regular",
    description: "Complete 50 practice sessions.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalSessions >= 50,
  },
  {
    id: "sessions-200",
    name: "Grinder",
    description: "Complete 200 practice sessions.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalSessions >= 200,
  },
  {
    id: "shots-500",
    name: "Trigger Discipline",
    description: "Fire 500 total shots across click-based exercises.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalShots >= 500,
  },
  {
    id: "shots-5000",
    name: "Lead Merchant",
    description: "Fire 5,000 total shots across click-based exercises.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalShots >= 5000,
  },
  {
    id: "shots-25000",
    name: "Ammunition Depot",
    description: "Fire 25,000 total shots across click-based exercises.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalShots >= 25000,
  },
  {
    id: "practice-1hr",
    name: "First Hour",
    description: "Accumulate 1 hour of total practice time.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalPracticeSeconds >= 3600,
  },
  {
    id: "practice-10hr",
    name: "Committed",
    description: "Accumulate 10 hours of total practice time.",
    category: "volume",
    isUnlocked: (_h, l) => l.totalPracticeSeconds >= 36000,
  },
  // Accuracy
  {
    id: "accuracy-90",
    name: "Sharp",
    description: "Score 90%+ accuracy in a single click-based run.",
    category: "accuracy",
    isUnlocked: (h) => bestAccuracy(h) >= 90,
  },
  {
    id: "accuracy-95",
    name: "Precise",
    description: "Score 95%+ accuracy in a single click-based run.",
    category: "accuracy",
    isUnlocked: (h) => bestAccuracy(h) >= 95,
  },
  {
    id: "accuracy-99",
    name: "Surgical",
    description: "Score 99%+ accuracy in a single click-based run.",
    category: "accuracy",
    isUnlocked: (h) => bestAccuracy(h) >= 99,
  },
  {
    id: "grid-accuracy-90",
    name: "Gridshot Specialist",
    description: "Score 90%+ accuracy in Gridshot.",
    category: "accuracy",
    isUnlocked: (h) => bestAccuracy(h, "grid") >= 90,
  },
  {
    id: "reaction-accuracy-90",
    name: "Fast Twitch",
    description: "Score 90%+ accuracy in Reaction.",
    category: "accuracy",
    isUnlocked: (h) => bestAccuracy(h, "reaction") >= 90,
  },
  // Coverage
  {
    id: "coverage-click-family",
    name: "Well Rounded",
    description: "Play all 7 click-based exercises at least once.",
    category: "coverage",
    isUnlocked: (h) => {
      const played = distinctModesPlayed(h);
      for (const modeId of CLICK_MODE_IDS) {
        if (!played.has(modeId)) return false;
      }
      return true;
    },
  },
  {
    id: "coverage-all-modes",
    name: "Completionist",
    description: "Play all 9 exercises at least once.",
    category: "coverage",
    isUnlocked: (h) => distinctModesPlayed(h).size >= ALL_MODE_IDS.length,
  },
  {
    id: "grid-veteran",
    name: "Gridshot Veteran",
    description: "Complete 25 Gridshot sessions.",
    category: "coverage",
    isUnlocked: (h) => sessionsInMode(h, "grid") >= 25,
  },
  {
    id: "strafe-veteran",
    name: "Strafe Veteran",
    description: "Complete 25 Strafe sessions.",
    category: "coverage",
    isUnlocked: (h) => sessionsInMode(h, "strafe") >= 25,
  },
  // Tracking
  {
    id: "tracking-75",
    name: "Locked On",
    description: "Hold 75%+ on-target time in a Smooth Track run.",
    category: "tracking",
    isUnlocked: (h) => bestOnTargetPercentage(h, "smooth-track") >= 75,
  },
  {
    id: "tracking-90",
    name: "Glued",
    description: "Hold 90%+ on-target time in a Smooth Track run.",
    category: "tracking",
    isUnlocked: (h) => bestOnTargetPercentage(h, "smooth-track") >= 90,
  },
  {
    id: "switch-track-75",
    name: "Fast Reacquire",
    description: "Hold 75%+ on-target time in a Switch Track run.",
    category: "tracking",
    isUnlocked: (h) => bestOnTargetPercentage(h, "switch-track") >= 75,
  },
  // Rank
  {
    id: "rank-gold",
    name: "Gold Standard",
    description: "Reach Gold-tier accuracy (68%+) in a click-based run.",
    category: "rank",
    isUnlocked: (h) => bestAccuracy(h) >= 68,
  },
  {
    id: "rank-diamond",
    name: "Diamond Hands",
    description: "Reach Diamond-tier accuracy (86%+) in a click-based run.",
    category: "rank",
    isUnlocked: (h) => bestAccuracy(h) >= 86,
  },
];

/**
 * Evaluates every achievement definition against real practice history and
 * returns the set of unlocked ids. Never marks anything unlocked without a
 * qualifying record actually present in history.
 */
export function evaluateAchievements(
  history: readonly PracticeSummaryRecord[],
  lifetime: LifetimeStats,
): ReadonlySet<string> {
  const unlocked = new Set<string>();
  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    if (achievement.isUnlocked(history, lifetime)) {
      unlocked.add(achievement.id);
    }
  }
  return unlocked;
}
